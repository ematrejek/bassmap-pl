-- F-05 Phase 1: organizer applications, roles, verification RPCs, and RLS.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.organizer_social_platform AS ENUM ('facebook', 'instagram');

CREATE TYPE public.organizer_application_status AS ENUM (
  'pending',
  'code_issued',
  'code_verified',
  'approved',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- Safe return type (never exposes verification_code_hash)
-- ---------------------------------------------------------------------------

CREATE TYPE public.organizer_application_safe AS (
  id uuid,
  user_id uuid,
  business_name text,
  social_platform public.organizer_social_platform,
  social_profile_url text,
  description text,
  status public.organizer_application_status,
  code_issued_at timestamptz,
  code_verified_at timestamptz,
  code_attempt_count integer,
  reviewed_by uuid,
  reviewed_at timestamptz,
  decision_reason text,
  created_at timestamptz,
  updated_at timestamptz
);

-- ---------------------------------------------------------------------------
-- organizer_applications
-- ---------------------------------------------------------------------------

CREATE TABLE public.organizer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  business_name text NOT NULL,
  social_platform public.organizer_social_platform NOT NULL,
  social_profile_url text NOT NULL,
  description text,
  status public.organizer_application_status NOT NULL DEFAULT 'pending',
  verification_code_hash text,
  code_issued_at timestamptz,
  code_verified_at timestamptz,
  code_attempt_count integer NOT NULL DEFAULT 0,
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizer_applications_business_name_length CHECK (
    char_length(business_name) BETWEEN 2 AND 120
  ),
  CONSTRAINT organizer_applications_description_length CHECK (
    description IS NULL
    OR char_length(description) <= 1000
  ),
  CONSTRAINT organizer_applications_decision_reason_length CHECK (
    decision_reason IS NULL
    OR char_length(decision_reason) <= 1000
  ),
  CONSTRAINT organizer_applications_social_url_facebook CHECK (
    social_platform <> 'facebook'
    OR social_profile_url ~* '^(https?://)?([a-z0-9-]+\.)?(facebook\.com|fb\.com)/.+'
  ),
  CONSTRAINT organizer_applications_social_url_instagram CHECK (
    social_platform <> 'instagram'
    OR social_profile_url ~* '^(https?://)?([a-z0-9-]+\.)?instagram\.com/.+'
  )
);

CREATE UNIQUE INDEX organizer_applications_active_user_unique_idx
  ON public.organizer_applications (user_id)
  WHERE status IN ('pending', 'code_issued', 'code_verified');

CREATE INDEX organizer_applications_status_created_at_idx
  ON public.organizer_applications (status, created_at DESC);

CREATE INDEX organizer_applications_user_id_idx
  ON public.organizer_applications (user_id);

CREATE TRIGGER organizer_applications_set_updated_at
  BEFORE UPDATE ON public.organizer_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.organizer_applications_restrict_mutable_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('organizer_application.rpc_mutation', true) = 'true' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'organizer_applications: direct updates are not allowed';
END;
$$;

CREATE TRIGGER organizer_applications_restrict_mutable_columns
  BEFORE UPDATE ON public.organizer_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.organizer_applications_restrict_mutable_columns();

CREATE OR REPLACE FUNCTION public.organizer_applications_sanitize_fan_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('organizer_application.rpc_mutation', true) <> 'true' THEN
    NEW.verification_code_hash := NULL;
    NEW.code_issued_at := NULL;
    NEW.code_verified_at := NULL;
    NEW.code_attempt_count := 0;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.decision_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER organizer_applications_sanitize_fan_insert
  BEFORE INSERT ON public.organizer_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.organizer_applications_sanitize_fan_insert();

-- ---------------------------------------------------------------------------
-- organizer_roles
-- ---------------------------------------------------------------------------

CREATE TABLE public.organizer_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  application_id uuid REFERENCES public.organizer_applications (id) ON DELETE SET NULL
);

CREATE INDEX organizer_roles_granted_at_idx
  ON public.organizer_roles (granted_at DESC);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.organizer_application_to_safe(
  p_row public.organizer_applications
)
RETURNS public.organizer_application_safe
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_row.id,
    p_row.user_id,
    p_row.business_name,
    p_row.social_platform,
    p_row.social_profile_url,
    p_row.description,
    p_row.status,
    p_row.code_issued_at,
    p_row.code_verified_at,
    p_row.code_attempt_count,
    p_row.reviewed_by,
    p_row.reviewed_at,
    p_row.decision_reason,
    p_row.created_at,
    p_row.updated_at;
$$;

CREATE OR REPLACE FUNCTION public.generate_organizer_verification_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, extensions
AS $$
DECLARE
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
  byte_val integer;
BEGIN
  FOR i IN 1..8 LOOP
    byte_val := (get_byte(gen_random_bytes(1), 0) % length(chars)) + 1;
    result := result || substr(chars, byte_val, 1);
  END LOOP;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_organizer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizer_roles r
    WHERE r.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_organizer() TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: issue verification code (admin)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.issue_organizer_verification_code(
  p_application_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  existing_application public.organizer_applications%ROWTYPE;
  plaintext_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'issue_organizer_verification_code: authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'issue_organizer_verification_code: admin required';
  END IF;

  SELECT * INTO existing_application
  FROM public.organizer_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'issue_organizer_verification_code: application not found';
  END IF;

  IF existing_application.status NOT IN ('pending', 'code_issued') THEN
    RAISE EXCEPTION 'issue_organizer_verification_code: application must be pending or code_issued';
  END IF;

  plaintext_code := public.generate_organizer_verification_code();

  PERFORM set_config('organizer_application.rpc_mutation', 'true', true);

  UPDATE public.organizer_applications
  SET
    status = 'code_issued',
    verification_code_hash = crypt(plaintext_code, gen_salt('bf')),
    code_issued_at = now(),
    code_verified_at = NULL,
    code_attempt_count = 0
  WHERE id = p_application_id;

  RETURN plaintext_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_organizer_verification_code(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: verify code (application owner)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_organizer_application_code(
  p_application_id uuid,
  p_code text
)
RETURNS public.organizer_application_safe
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  existing_application public.organizer_applications%ROWTYPE;
  updated_application public.organizer_applications%ROWTYPE;
  normalized_code text;
  max_attempts constant integer := 5;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'verify_organizer_application_code: authentication required';
  END IF;

  normalized_code := upper(trim(p_code));

  IF normalized_code IS NULL OR char_length(normalized_code) < 6 OR char_length(normalized_code) > 8 THEN
    RAISE EXCEPTION 'verify_organizer_application_code: invalid code format';
  END IF;

  SELECT * INTO existing_application
  FROM public.organizer_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'verify_organizer_application_code: application not found';
  END IF;

  IF existing_application.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'verify_organizer_application_code: only application owner may verify';
  END IF;

  IF existing_application.status <> 'code_issued' THEN
    RAISE EXCEPTION 'verify_organizer_application_code: application must be code_issued';
  END IF;

  IF existing_application.code_attempt_count >= max_attempts THEN
    RAISE EXCEPTION 'verify_organizer_application_code: attempt limit exceeded';
  END IF;

  IF existing_application.verification_code_hash IS NULL
    OR crypt(normalized_code, existing_application.verification_code_hash)
      <> existing_application.verification_code_hash
  THEN
    PERFORM set_config('organizer_application.rpc_mutation', 'true', true);

    UPDATE public.organizer_applications
    SET code_attempt_count = existing_application.code_attempt_count + 1
    WHERE id = p_application_id;

    RAISE EXCEPTION 'verify_organizer_application_code: invalid code';
  END IF;

  PERFORM set_config('organizer_application.rpc_mutation', 'true', true);

  UPDATE public.organizer_applications
  SET
    status = 'code_verified',
    code_verified_at = now(),
    verification_code_hash = NULL
  WHERE id = p_application_id
  RETURNING * INTO updated_application;

  RETURN public.organizer_application_to_safe(updated_application);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_organizer_application_code(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: approve application (admin)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.approve_organizer_application(
  p_application_id uuid
)
RETURNS public.organizer_application_safe
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_application public.organizer_applications%ROWTYPE;
  updated_application public.organizer_applications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'approve_organizer_application: authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'approve_organizer_application: admin required';
  END IF;

  SELECT * INTO existing_application
  FROM public.organizer_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approve_organizer_application: application not found';
  END IF;

  IF existing_application.status <> 'code_verified' THEN
    RAISE EXCEPTION 'approve_organizer_application: application must be code_verified';
  END IF;

  PERFORM set_config('organizer_application.rpc_mutation', 'true', true);

  UPDATE public.organizer_applications
  SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    decision_reason = NULL
  WHERE id = p_application_id
  RETURNING * INTO updated_application;

  INSERT INTO public.organizer_roles (user_id, granted_by, application_id)
  VALUES (existing_application.user_id, auth.uid(), p_application_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN public.organizer_application_to_safe(updated_application);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_organizer_application(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: reject application (admin)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reject_organizer_application(
  p_application_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.organizer_application_safe
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_application public.organizer_applications%ROWTYPE;
  updated_application public.organizer_applications%ROWTYPE;
  trimmed_reason text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'reject_organizer_application: authentication required';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'reject_organizer_application: admin required';
  END IF;

  trimmed_reason := NULLIF(trim(p_reason), '');

  IF trimmed_reason IS NOT NULL AND char_length(trimmed_reason) > 1000 THEN
    RAISE EXCEPTION 'reject_organizer_application: reason too long';
  END IF;

  SELECT * INTO existing_application
  FROM public.organizer_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reject_organizer_application: application not found';
  END IF;

  IF existing_application.status NOT IN ('pending', 'code_issued', 'code_verified') THEN
    RAISE EXCEPTION 'reject_organizer_application: application is not active';
  END IF;

  PERFORM set_config('organizer_application.rpc_mutation', 'true', true);

  UPDATE public.organizer_applications
  SET
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    decision_reason = trimmed_reason,
    verification_code_hash = NULL
  WHERE id = p_application_id
  RETURNING * INTO updated_application;

  RETURN public.organizer_application_to_safe(updated_application);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_organizer_application(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Column privileges (hide verification_code_hash from API clients)
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.organizer_applications FROM anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.organizer_applications TO authenticated;

REVOKE SELECT (verification_code_hash) ON TABLE public.organizer_applications FROM authenticated;

GRANT ALL ON TABLE public.organizer_applications TO service_role;

REVOKE ALL ON TABLE public.organizer_roles FROM anon, authenticated;
GRANT ALL ON TABLE public.organizer_roles TO service_role;

-- ---------------------------------------------------------------------------
-- RLS: organizer_applications
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizer_applications_select_admin
  ON public.organizer_applications
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY organizer_applications_select_own
  ON public.organizer_applications
  FOR SELECT
  TO authenticated
  USING (
    NOT public.is_admin()
    AND user_id = auth.uid()
  );

CREATE POLICY organizer_applications_insert_fan
  ON public.organizer_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_admin()
    AND NOT public.is_organizer()
    AND user_id = auth.uid()
    AND status = 'pending'
    AND NOT EXISTS (
      SELECT 1
      FROM public.organizer_applications oa
      WHERE oa.user_id = auth.uid()
        AND oa.status IN ('pending', 'code_issued', 'code_verified')
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: organizer_roles (no direct client access)
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizer_roles ENABLE ROW LEVEL SECURITY;

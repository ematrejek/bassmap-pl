-- S-13: pg_trgm for fuzzy event name matching + change_suggestions table with RLS.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX events_name_trgm_idx ON public.events USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.change_suggestion_status AS ENUM (
  'pending',
  'accepted',
  'rejected'
);

CREATE TYPE public.change_suggestion_source AS ENUM (
  'duplicate_flow',
  'event_page'
);

-- ---------------------------------------------------------------------------
-- change_suggestions
-- ---------------------------------------------------------------------------

CREATE TABLE public.change_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body text NOT NULL,
  status public.change_suggestion_status NOT NULL DEFAULT 'pending',
  source public.change_suggestion_source NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT change_suggestions_body_length CHECK (
    char_length(body) >= 10
    AND char_length(body) <= 2000
  )
);

CREATE TRIGGER change_suggestions_set_updated_at
  BEFORE UPDATE ON public.change_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX change_suggestions_event_id_idx ON public.change_suggestions (event_id);
CREATE INDEX change_suggestions_submitted_by_idx ON public.change_suggestions (submitted_by);
CREATE INDEX change_suggestions_status_idx ON public.change_suggestions (status);
CREATE INDEX change_suggestions_created_at_idx ON public.change_suggestions (created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.change_suggestions ENABLE ROW LEVEL SECURITY;

-- Admin: read all suggestions
CREATE POLICY change_suggestions_select_admin
  ON public.change_suggestions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Fan: read own suggestions only
CREATE POLICY change_suggestions_select_own
  ON public.change_suggestions
  FOR SELECT
  TO authenticated
  USING (
    NOT public.is_admin()
    AND submitted_by = auth.uid()
  );

-- Fan: insert own pending suggestion (non-admin)
CREATE POLICY change_suggestions_insert_fan
  ON public.change_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_admin()
    AND submitted_by = auth.uid()
    AND status = 'pending'
  );

-- Admin: update status (and other fields)
CREATE POLICY change_suggestions_update_admin
  ON public.change_suggestions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

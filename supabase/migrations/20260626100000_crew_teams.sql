-- S-24 Phase 1: crew teams, members, join requests with RLS.

-- ---------------------------------------------------------------------------
-- crews
-- ---------------------------------------------------------------------------

CREATE TABLE public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  city text,
  subgenres public.subgenre[] NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crews_owner_unique UNIQUE (owner_id),
  CONSTRAINT crews_name_length_check CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT crews_city_length_check CHECK (
    city IS NULL
    OR (char_length(city) BETWEEN 1 AND 80)
  ),
  CONSTRAINT crews_description_length_check CHECK (
    description IS NULL
    OR char_length(description) <= 500
  ),
  CONSTRAINT crews_subgenres_max_five CHECK (cardinality(subgenres) <= 5)
);

CREATE INDEX crews_created_at_idx ON public.crews (created_at DESC);

CREATE TRIGGER crews_set_updated_at
  BEFORE UPDATE ON public.crews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- crew_members
-- ---------------------------------------------------------------------------

CREATE TABLE public.crew_members (
  crew_id uuid NOT NULL REFERENCES public.crews (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (crew_id, user_id),
  CONSTRAINT crew_members_role_check CHECK (role IN ('owner', 'member'))
);

CREATE INDEX crew_members_user_id_idx ON public.crew_members (user_id);

-- ---------------------------------------------------------------------------
-- crew_join_requests
-- ---------------------------------------------------------------------------

CREATE TABLE public.crew_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crews (id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crew_join_requests_status_check CHECK (status IN ('pending', 'accepted', 'declined'))
);

CREATE UNIQUE INDEX crew_join_requests_active_unique_idx
  ON public.crew_join_requests (crew_id, requester_id)
  WHERE status = 'pending';

CREATE INDEX crew_join_requests_crew_id_status_idx
  ON public.crew_join_requests (crew_id, status);

CREATE INDEX crew_join_requests_requester_id_status_idx
  ON public.crew_join_requests (requester_id, status);

CREATE TRIGGER crew_join_requests_set_updated_at
  BEFORE UPDATE ON public.crew_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.crew_join_requests_restrict_mutable_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.crew_id IS DISTINCT FROM OLD.crew_id
    OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'crew_join_requests: only status may be updated';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER crew_join_requests_restrict_mutable_columns
  BEFORE UPDATE ON public.crew_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.crew_join_requests_restrict_mutable_columns();

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_crew_member(p_crew_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crew_members cm
    WHERE cm.crew_id = p_crew_id
      AND cm.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_crew_owner(p_crew_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crews c
    WHERE c.id = p_crew_id
      AND c.owner_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_crew_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_crew_owner(uuid, uuid) TO authenticated;

-- Owner becomes first crew member on create.
CREATE OR REPLACE FUNCTION public.crews_add_owner_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.crew_members (crew_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER crews_add_owner_member
  AFTER INSERT ON public.crews
  FOR EACH ROW
  EXECUTE FUNCTION public.crews_add_owner_member();

-- ---------------------------------------------------------------------------
-- RLS: crews
-- ---------------------------------------------------------------------------

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY crews_select_authenticated
  ON public.crews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY crews_insert_owner
  ON public.crews
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY crews_update_owner
  ON public.crews
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY crews_delete_owner
  ON public.crews
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: crew_members
-- ---------------------------------------------------------------------------

ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY crew_members_select_member
  ON public.crew_members
  FOR SELECT
  TO authenticated
  USING (public.is_crew_member(crew_id, auth.uid()));

CREATE POLICY crew_members_delete_self_member
  ON public.crew_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND role = 'member');

CREATE POLICY crew_members_delete_owner_removes_member
  ON public.crew_members
  FOR DELETE
  TO authenticated
  USING (role = 'member' AND public.is_crew_owner(crew_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- RLS: crew_join_requests
-- ---------------------------------------------------------------------------

ALTER TABLE public.crew_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY crew_join_requests_select_involved
  ON public.crew_join_requests
  FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR public.is_crew_owner(crew_id, auth.uid())
  );

CREATE POLICY crew_join_requests_insert_requester
  ON public.crew_join_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND status = 'pending'
    AND NOT public.is_crew_member(crew_id, auth.uid())
    AND NOT public.is_crew_owner(crew_id, auth.uid())
  );

CREATE POLICY crew_join_requests_update_owner
  ON public.crew_join_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_crew_owner(crew_id, auth.uid()) AND status = 'pending')
  WITH CHECK (public.is_crew_owner(crew_id, auth.uid()));

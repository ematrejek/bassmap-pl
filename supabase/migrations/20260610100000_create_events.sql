-- F-01: Event data foundation – enums, events table, RLS, admin allowlist

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.event_status AS ENUM (
  'draft',
  'pending',
  'published',
  'rejected'
);

CREATE TYPE public.subgenre AS ENUM (
  'jungle',
  'hardcore_oldschool',
  'liquid_dnb',
  'liquid_funk',
  'jump_up',
  'anthem_dnb',
  'darkstep',
  'neurofunk',
  'techstep',
  'doomcore',
  'funk_dnb',
  'jazz_step',
  'soul_dnb',
  'drumfunk',
  'abstract_dnb',
  'autonomic',
  'halftime',
  'sambass',
  'clownstep',
  'trancestep',
  'drumstep',
  'crossbreed',
  'ragga_dnb',
  'ambient_dnb',
  'intelligent_dnb'
);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  city text NOT NULL,
  venue_name text NOT NULL,
  address_street text NOT NULL,
  address_number text NOT NULL,
  latitude double precision,
  longitude double precision,
  subgenres public.subgenre[] NOT NULL DEFAULT '{}',
  lineup text[],
  ticket_url text,
  is_free boolean NOT NULL DEFAULT false,
  price text,
  status public.event_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_coordinates_both_or_neither CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  ),
  CONSTRAINT events_subgenres_min_one CHECK (cardinality(subgenres) >= 1)
);

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- admin allowlist (temporary bridge until F-02)
-- ---------------------------------------------------------------------------

CREATE TABLE public.admin_allowlist (
  email text PRIMARY KEY
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_allowlist
    WHERE email = (auth.jwt() ->> 'email')
  );
$$;

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_allowlist_select_admin
  ON public.admin_allowlist
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Dev admin allowlist
INSERT INTO public.admin_allowlist (email)
VALUES ('matrejekemilia@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helper: upcoming events (Europe/Warsaw calendar day)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_upcoming(starts_at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (starts_at AT TIME ZONE 'Europe/Warsaw')::date
    >= (now() AT TIME ZONE 'Europe/Warsaw')::date;
$$;

-- ---------------------------------------------------------------------------
-- RLS on events
-- ---------------------------------------------------------------------------

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_select_public
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND public.is_upcoming(starts_at)
  );

CREATE POLICY events_select_admin
  ON public.events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY events_insert_admin
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY events_update_admin
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY events_delete_admin
  ON public.events
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX events_starts_at_idx ON public.events (starts_at);
CREATE INDEX events_status_idx ON public.events (status);
CREATE INDEX events_city_idx ON public.events (city);
CREATE INDEX events_subgenres_gin_idx ON public.events USING gin (subgenres);

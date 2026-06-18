-- Duplicate detection: match by city + fuzzy name + location (TS post-filter).
-- Same calendar day is preferred in ordering but no longer required.

DROP FUNCTION IF EXISTS public.find_similar_event_candidates(text, text, timestamptz, uuid, uuid, boolean, real);

CREATE OR REPLACE FUNCTION public.find_similar_event_candidates(
  p_name text,
  p_city text,
  p_starts_at timestamptz,
  p_exclude_event_id uuid DEFAULT NULL,
  p_exclude_created_by uuid DEFAULT NULL,
  p_include_pending boolean DEFAULT true,
  p_name_threshold real DEFAULT 0.45
)
RETURNS TABLE (
  id uuid,
  name text,
  starts_at timestamptz,
  city text,
  venue_name text,
  address_street text,
  address_number text,
  latitude double precision,
  longitude double precision,
  status public.event_status,
  similarity_score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.name,
    e.starts_at,
    e.city,
    e.venue_name,
    e.address_street,
    e.address_number,
    e.latitude,
    e.longitude,
    e.status,
    similarity(e.name, p_name) AS similarity_score
  FROM public.events e
  WHERE (
      e.status = 'published'
      OR (p_include_pending AND e.status = 'pending')
    )
    AND lower(e.city) = lower(p_city)
    AND similarity(e.name, p_name) >= p_name_threshold
    AND (p_exclude_event_id IS NULL OR e.id <> p_exclude_event_id)
    AND (
      p_exclude_created_by IS NULL
      OR e.created_by IS DISTINCT FROM p_exclude_created_by
      OR e.status = 'published'
    )
  ORDER BY
    CASE
      WHEN (e.starts_at AT TIME ZONE 'Europe/Warsaw')::date = (p_starts_at AT TIME ZONE 'Europe/Warsaw')::date
      THEN 0
      ELSE 1
    END,
    similarity(e.name, p_name) DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.find_similar_event_candidates(text, text, timestamptz, uuid, uuid, boolean, real) TO authenticated;

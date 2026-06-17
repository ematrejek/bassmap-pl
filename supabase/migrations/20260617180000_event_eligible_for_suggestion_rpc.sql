-- S-13: Fan suggestion eligibility bypasses events RLS (fans cannot SELECT others' pending).

CREATE OR REPLACE FUNCTION public.event_eligible_for_suggestion(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id
      AND e.status IN ('published', 'pending')
  );
$$;

GRANT EXECUTE ON FUNCTION public.event_eligible_for_suggestion(uuid) TO authenticated;

-- Public read for past published events (archive). Complements events_select_public (upcoming only).

CREATE POLICY events_select_past_public
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND NOT public.is_upcoming(starts_at)
  );

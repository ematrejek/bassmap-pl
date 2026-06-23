-- S-19: Event attendance (RSVP «Idę» / «Interesuję się»).

CREATE TABLE public.event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_attendance_status_check CHECK (status IN ('going', 'interested')),
  CONSTRAINT event_attendance_user_event_unique UNIQUE (user_id, event_id)
);

CREATE INDEX event_attendance_event_id_status_idx
  ON public.event_attendance (event_id, status);

CREATE INDEX event_attendance_user_id_status_idx
  ON public.event_attendance (user_id, status);

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_attendance_select_public
  ON public.event_attendance
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.status = 'published'
    )
  );

CREATE POLICY event_attendance_insert_authenticated
  ON public.event_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.status = 'published'
    )
  );

CREATE POLICY event_attendance_update_own
  ON public.event_attendance
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.status = 'published'
    )
  );

CREATE POLICY event_attendance_delete_own
  ON public.event_attendance
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

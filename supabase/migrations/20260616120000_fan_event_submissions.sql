-- Fan event submissions: created_by column + RLS for fan INSERT (pending) and SELECT own rows.

ALTER TABLE public.events
  ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX events_created_by_idx ON public.events (created_by)
  WHERE created_by IS NOT NULL;

-- Fan: INSERT only pending, created_by = self, non-admin
CREATE POLICY events_insert_fan
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_admin()
    AND created_by = auth.uid()
    AND status = 'pending'
  );

-- Fan: SELECT own rows (any status)
CREATE POLICY events_select_own
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    AND NOT public.is_admin()
  );

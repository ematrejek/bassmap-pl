-- S-13: Harden change_suggestions RLS (source, event eligibility, status-only updates).

DROP POLICY IF EXISTS change_suggestions_insert_fan ON public.change_suggestions;

CREATE POLICY change_suggestions_insert_fan
  ON public.change_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_admin()
    AND submitted_by = auth.uid()
    AND status = 'pending'
    AND source = 'duplicate_flow'
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.status IN ('published', 'pending')
    )
  );

CREATE OR REPLACE FUNCTION public.change_suggestions_restrict_mutable_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.event_id IS DISTINCT FROM OLD.event_id
    OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
    OR NEW.body IS DISTINCT FROM OLD.body
    OR NEW.source IS DISTINCT FROM OLD.source
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'change_suggestions: only status may be updated';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER change_suggestions_restrict_mutable_columns
  BEFORE UPDATE ON public.change_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.change_suggestions_restrict_mutable_columns();

-- S-14 Phase 1: payload column, source-specific constraints, RLS event_page, eligibility RPC per source.

ALTER TABLE public.change_suggestions
  ADD COLUMN payload jsonb;

ALTER TABLE public.change_suggestions
  ALTER COLUMN body DROP NOT NULL;

ALTER TABLE public.change_suggestions
  DROP CONSTRAINT change_suggestions_body_length;

ALTER TABLE public.change_suggestions
  ADD CONSTRAINT change_suggestions_source_shape CHECK (
    (
      source = 'duplicate_flow'
      AND char_length(body) BETWEEN 10 AND 2000
      AND payload IS NULL
    )
    OR (
      source = 'event_page'
      AND payload IS NOT NULL
      AND jsonb_typeof(payload) = 'object'
      AND (body IS NULL OR char_length(body) BETWEEN 0 AND 2000)
    )
  );

DROP POLICY IF EXISTS change_suggestions_insert_fan ON public.change_suggestions;

CREATE POLICY change_suggestions_insert_fan
  ON public.change_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_admin()
    AND submitted_by = auth.uid()
    AND status = 'pending'
    AND (
      (
        source = 'duplicate_flow'
        AND payload IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.events e
          WHERE e.id = event_id
            AND e.status IN ('published', 'pending')
        )
      )
      OR (
        source = 'event_page'
        AND payload IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.events e
          WHERE e.id = event_id
            AND e.status = 'published'
            AND public.is_upcoming(e.starts_at)
        )
      )
    )
  );

DROP FUNCTION IF EXISTS public.event_eligible_for_suggestion(uuid);

CREATE OR REPLACE FUNCTION public.event_eligible_for_suggestion(
  p_event_id uuid,
  p_source public.change_suggestion_source
)
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
      AND (
        (
          p_source = 'duplicate_flow'
          AND e.status IN ('published', 'pending')
        )
        OR (
          p_source = 'event_page'
          AND e.status = 'published'
          AND public.is_upcoming(e.starts_at)
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.event_eligible_for_suggestion(uuid, public.change_suggestion_source) TO authenticated;

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
    OR NEW.payload IS DISTINCT FROM OLD.payload
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'change_suggestions: only status may be updated';
  END IF;

  RETURN NEW;
END;
$$;

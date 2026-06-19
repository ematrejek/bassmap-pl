-- S-15: Public event comments with RLS (read public, insert authenticated, delete admin).

CREATE TABLE public.event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  author_label text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_comments_body_length CHECK (
    char_length(body) >= 1
    AND char_length(body) <= 2000
  )
);

CREATE INDEX event_comments_event_id_created_at_idx
  ON public.event_comments (event_id, created_at ASC);

CREATE INDEX event_comments_author_id_idx
  ON public.event_comments (author_id);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_comments_select_public
  ON public.event_comments
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

CREATE POLICY event_comments_insert_authenticated
  ON public.event_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.status = 'published'
    )
  );

CREATE POLICY event_comments_delete_admin
  ON public.event_comments
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

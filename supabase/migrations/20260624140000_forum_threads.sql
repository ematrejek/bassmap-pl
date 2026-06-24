-- S-22: Forum threads and comments with RLS (read public, insert authenticated, delete admin / own comments).

CREATE TABLE public.forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  city text,
  tags text[] NOT NULL DEFAULT '{}',
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  author_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_threads_category_check CHECK (
    category IN (
      'szukam_ekipy',
      'jestesmy_ekipa',
      'podziel_sie_muzyka',
      'sprzet_produkcja',
      'transport_noclegi',
      'pozostale'
    )
  ),
  CONSTRAINT forum_threads_title_length CHECK (
    char_length(title) >= 1
    AND char_length(title) <= 120
  ),
  CONSTRAINT forum_threads_body_length CHECK (
    char_length(body) >= 1
    AND char_length(body) <= 2000
  ),
  CONSTRAINT forum_threads_city_length CHECK (
    city IS NULL
    OR (
      char_length(city) >= 1
      AND char_length(city) <= 80
    )
  ),
  CONSTRAINT forum_threads_tags_count CHECK (cardinality(tags) <= 3)
);

CREATE TABLE public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_threads (id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  author_label text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_comments_body_length CHECK (
    char_length(body) >= 1
    AND char_length(body) <= 2000
  )
);

CREATE INDEX forum_threads_created_at_idx
  ON public.forum_threads (created_at DESC);

CREATE INDEX forum_threads_category_created_at_idx
  ON public.forum_threads (category, created_at DESC);

CREATE INDEX forum_threads_author_id_idx
  ON public.forum_threads (author_id);

CREATE INDEX forum_comments_thread_id_created_at_idx
  ON public.forum_comments (thread_id, created_at ASC);

CREATE INDEX forum_comments_author_id_idx
  ON public.forum_comments (author_id);

CREATE TRIGGER forum_threads_set_updated_at
  BEFORE UPDATE ON public.forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY forum_threads_select_public
  ON public.forum_threads
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY forum_threads_insert_authenticated
  ON public.forum_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY forum_threads_delete_admin
  ON public.forum_threads
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY forum_comments_select_public
  ON public.forum_comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY forum_comments_insert_authenticated
  ON public.forum_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.forum_threads t
      WHERE t.id = thread_id
    )
  );

CREATE POLICY forum_comments_delete_admin
  ON public.forum_comments
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY forum_comments_delete_own
  ON public.forum_comments
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

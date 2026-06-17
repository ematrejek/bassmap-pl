-- S-03: Event cover photos – cover_path column + public Storage bucket

ALTER TABLE public.events
  ADD COLUMN cover_path text;

ALTER TABLE public.events
  ADD CONSTRAINT events_cover_path_format CHECK (
    cover_path IS NULL
    OR cover_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/cover\.(jpg|jpeg|png|webp)$'
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-covers',
  'event-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY event_covers_insert_admin
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-covers'
    AND public.is_admin()
  );

CREATE POLICY event_covers_update_admin
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'event-covers'
    AND public.is_admin()
  );

CREATE POLICY event_covers_delete_admin
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND public.is_admin()
  );

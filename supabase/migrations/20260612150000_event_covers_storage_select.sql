-- Allow admin SELECT on storage.objects for upsert overwrite in event-covers bucket

CREATE POLICY event_covers_select_admin
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND public.is_admin()
  );

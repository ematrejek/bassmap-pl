-- S-15: Allow comment authors to delete their own comments.

CREATE POLICY event_comments_delete_own
  ON public.event_comments
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

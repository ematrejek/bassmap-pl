-- S-23 Phase 2: allow either accepted friend to remove the friendship.

CREATE POLICY friend_requests_delete_accepted_involved
  ON public.friend_requests
  FOR DELETE
  TO authenticated
  USING (
    status = 'accepted'
    AND (requester_id = auth.uid() OR addressee_id = auth.uid())
  );

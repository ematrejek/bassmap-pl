-- S-23 review F3: delete declined requests so the same pair can invite again.

CREATE OR REPLACE FUNCTION public.respond_friend_request_with_notification(
  p_request_id uuid,
  p_status text,
  p_actor_label text,
  p_accept_body text DEFAULT NULL
)
RETURNS public.friend_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_request public.friend_requests%ROWTYPE;
  updated_request public.friend_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'respond_friend_request_with_notification: authentication required';
  END IF;

  IF p_status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'respond_friend_request_with_notification: invalid status';
  END IF;

  SELECT * INTO existing_request
  FROM public.friend_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'respond_friend_request_with_notification: friend request not found';
  END IF;

  IF existing_request.addressee_id <> auth.uid() THEN
    RAISE EXCEPTION 'respond_friend_request_with_notification: only addressee may respond';
  END IF;

  IF existing_request.status <> 'pending' THEN
    RAISE EXCEPTION 'respond_friend_request_with_notification: friend request must be pending';
  END IF;

  IF p_status = 'declined' THEN
    DELETE FROM public.friend_requests
    WHERE id = p_request_id;

    existing_request.status := 'declined';
    RETURN existing_request;
  END IF;

  UPDATE public.friend_requests
  SET status = p_status
  WHERE id = p_request_id
  RETURNING * INTO updated_request;

  IF p_accept_body IS NULL OR char_length(p_accept_body) < 1 THEN
    RAISE EXCEPTION 'respond_friend_request_with_notification: accept body required';
  END IF;

  PERFORM public.create_notification(
    updated_request.requester_id,
    auth.uid(),
    p_actor_label,
    'friend_request_accepted',
    p_accept_body,
    NULL,
    updated_request.id
  );

  RETURN updated_request;
END;
$$;

CREATE POLICY friend_requests_delete_pending_requester
  ON public.friend_requests
  FOR DELETE
  TO authenticated
  USING (
    status = 'pending'
    AND requester_id = auth.uid()
  );

CREATE POLICY friend_requests_delete_declined_involved
  ON public.friend_requests
  FOR DELETE
  TO authenticated
  USING (
    status = 'declined'
    AND (requester_id = auth.uid() OR addressee_id = auth.uid())
  );

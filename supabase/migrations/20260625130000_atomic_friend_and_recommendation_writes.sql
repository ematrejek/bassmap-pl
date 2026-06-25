-- S-23 review F2: atomic friend-request and event-recommendation writes with notifications.

CREATE OR REPLACE FUNCTION public.create_friend_request_with_notification(
  p_addressee_id uuid,
  p_actor_label text,
  p_body text
)
RETURNS public.friend_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_request public.friend_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_friend_request_with_notification: authentication required';
  END IF;

  IF p_addressee_id = auth.uid() THEN
    RAISE EXCEPTION 'create_friend_request_with_notification: cannot invite yourself';
  END IF;

  INSERT INTO public.friend_requests (requester_id, addressee_id, status)
  VALUES (auth.uid(), p_addressee_id, 'pending')
  RETURNING * INTO new_request;

  PERFORM public.create_notification(
    p_addressee_id,
    auth.uid(),
    p_actor_label,
    'friend_request',
    p_body,
    NULL,
    new_request.id
  );

  RETURN new_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_friend_request_with_notification(uuid, text, text) TO authenticated;

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

  UPDATE public.friend_requests
  SET status = p_status
  WHERE id = p_request_id
  RETURNING * INTO updated_request;

  IF p_status = 'accepted' THEN
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
  END IF;

  RETURN updated_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_friend_request_with_notification(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_event_recommendation_with_notification(
  p_event_id uuid,
  p_recipient_id uuid,
  p_sender_label text,
  p_message text,
  p_body text
)
RETURNS public.event_recommendations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_notification_id uuid;
  new_recommendation public.event_recommendations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_event_recommendation_with_notification: authentication required';
  END IF;

  IF p_recipient_id = auth.uid() THEN
    RAISE EXCEPTION 'create_event_recommendation_with_notification: cannot recommend to yourself';
  END IF;

  new_notification_id := public.create_notification(
    p_recipient_id,
    auth.uid(),
    p_sender_label,
    'event_recommendation',
    p_body,
    p_event_id,
    NULL
  );

  INSERT INTO public.event_recommendations (
    event_id,
    sender_id,
    recipient_id,
    sender_label,
    message,
    notification_id
  )
  VALUES (
    p_event_id,
    auth.uid(),
    p_recipient_id,
    p_sender_label,
    p_message,
    new_notification_id
  )
  RETURNING * INTO new_recommendation;

  RETURN new_recommendation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_event_recommendation_with_notification(
  uuid,
  uuid,
  text,
  text,
  text
) TO authenticated;

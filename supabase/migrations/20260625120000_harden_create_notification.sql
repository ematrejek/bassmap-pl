-- S-23 review F1: validate business context inside create_notification.

CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_actor_label text,
  p_type text,
  p_body text,
  p_event_id uuid DEFAULT NULL,
  p_friend_request_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  fr public.friend_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_notification: authentication required';
  END IF;

  IF p_actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'create_notification: actor must be the authenticated user';
  END IF;

  IF p_recipient_id = auth.uid() THEN
    RAISE EXCEPTION 'create_notification: cannot notify yourself';
  END IF;

  IF p_type NOT IN ('friend_request', 'friend_request_accepted', 'event_recommendation') THEN
    RAISE EXCEPTION 'create_notification: invalid notification type';
  END IF;

  IF p_type = 'friend_request' THEN
    IF p_friend_request_id IS NULL THEN
      RAISE EXCEPTION 'create_notification: friend_request_id required';
    END IF;

    IF p_event_id IS NOT NULL THEN
      RAISE EXCEPTION 'create_notification: event_id not allowed for friend_request';
    END IF;

    SELECT * INTO fr FROM public.friend_requests WHERE id = p_friend_request_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'create_notification: friend request not found';
    END IF;

    IF fr.status <> 'pending' THEN
      RAISE EXCEPTION 'create_notification: friend request must be pending';
    END IF;

    IF fr.requester_id <> auth.uid() THEN
      RAISE EXCEPTION 'create_notification: only requester may send friend_request notification';
    END IF;

    IF fr.addressee_id <> p_recipient_id THEN
      RAISE EXCEPTION 'create_notification: recipient must be addressee';
    END IF;
  ELSIF p_type = 'friend_request_accepted' THEN
    IF p_friend_request_id IS NULL THEN
      RAISE EXCEPTION 'create_notification: friend_request_id required';
    END IF;

    IF p_event_id IS NOT NULL THEN
      RAISE EXCEPTION 'create_notification: event_id not allowed for friend_request_accepted';
    END IF;

    SELECT * INTO fr FROM public.friend_requests WHERE id = p_friend_request_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'create_notification: friend request not found';
    END IF;

    IF fr.status <> 'accepted' THEN
      RAISE EXCEPTION 'create_notification: friend request must be accepted';
    END IF;

    IF fr.addressee_id <> auth.uid() THEN
      RAISE EXCEPTION 'create_notification: only addressee may send friend_request_accepted notification';
    END IF;

    IF fr.requester_id <> p_recipient_id THEN
      RAISE EXCEPTION 'create_notification: recipient must be requester';
    END IF;
  ELSIF p_type = 'event_recommendation' THEN
    IF p_event_id IS NULL THEN
      RAISE EXCEPTION 'create_notification: event_id required';
    END IF;

    IF p_friend_request_id IS NOT NULL THEN
      RAISE EXCEPTION 'create_notification: friend_request_id not allowed for event_recommendation';
    END IF;

    IF NOT public.are_accepted_friends(auth.uid(), p_recipient_id) THEN
      RAISE EXCEPTION 'create_notification: recipients must be accepted friends';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = p_event_id
        AND e.status = 'published'
    ) THEN
      RAISE EXCEPTION 'create_notification: event not found or not published';
    END IF;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    actor_label,
    type,
    event_id,
    friend_request_id,
    body
  )
  VALUES (
    p_recipient_id,
    p_actor_id,
    p_actor_label,
    p_type,
    p_event_id,
    p_friend_request_id,
    p_body
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

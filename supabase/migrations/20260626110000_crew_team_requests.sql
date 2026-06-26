-- S-24 Phase 1: crew join request RPCs and notification types.

ALTER TABLE public.notifications
  ADD COLUMN crew_join_request_id uuid REFERENCES public.crew_join_requests (id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'friend_request',
      'friend_request_accepted',
      'event_recommendation',
      'crew_join_request',
      'crew_join_accepted'
    )
  );

CREATE OR REPLACE FUNCTION public.notifications_restrict_mutable_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
    OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
    OR NEW.actor_label IS DISTINCT FROM OLD.actor_label
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.event_id IS DISTINCT FROM OLD.event_id
    OR NEW.friend_request_id IS DISTINCT FROM OLD.friend_request_id
    OR NEW.crew_join_request_id IS DISTINCT FROM OLD.crew_join_request_id
    OR NEW.body IS DISTINCT FROM OLD.body
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'notifications: only read_at may be updated';
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.create_notification(uuid, uuid, text, text, text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_actor_label text,
  p_type text,
  p_body text,
  p_event_id uuid DEFAULT NULL,
  p_friend_request_id uuid DEFAULT NULL,
  p_crew_join_request_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  fr public.friend_requests%ROWTYPE;
  cjr public.crew_join_requests%ROWTYPE;
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

  IF p_type NOT IN (
    'friend_request',
    'friend_request_accepted',
    'event_recommendation',
    'crew_join_request',
    'crew_join_accepted'
  ) THEN
    RAISE EXCEPTION 'create_notification: invalid notification type';
  END IF;

  IF p_type = 'friend_request' THEN
    IF p_friend_request_id IS NULL THEN
      RAISE EXCEPTION 'create_notification: friend_request_id required';
    END IF;

    IF p_event_id IS NOT NULL OR p_crew_join_request_id IS NOT NULL THEN
      RAISE EXCEPTION 'create_notification: unexpected foreign key for friend_request';
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

    IF p_event_id IS NOT NULL OR p_crew_join_request_id IS NOT NULL THEN
      RAISE EXCEPTION 'create_notification: unexpected foreign key for friend_request_accepted';
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

    IF p_friend_request_id IS NOT NULL OR p_crew_join_request_id IS NOT NULL THEN
      RAISE EXCEPTION 'create_notification: unexpected foreign key for event_recommendation';
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
  ELSIF p_type = 'crew_join_request' THEN
    IF p_crew_join_request_id IS NULL THEN
      RAISE EXCEPTION 'create_notification: crew_join_request_id required';
    END IF;

    IF p_event_id IS NOT NULL OR p_friend_request_id IS NOT NULL THEN
      RAISE EXCEPTION 'create_notification: unexpected foreign key for crew_join_request';
    END IF;

    SELECT * INTO cjr FROM public.crew_join_requests WHERE id = p_crew_join_request_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'create_notification: crew join request not found';
    END IF;

    IF cjr.status <> 'pending' THEN
      RAISE EXCEPTION 'create_notification: crew join request must be pending';
    END IF;

    IF cjr.requester_id <> auth.uid() THEN
      RAISE EXCEPTION 'create_notification: only requester may send crew_join_request notification';
    END IF;

    IF NOT public.is_crew_owner(cjr.crew_id, p_recipient_id) THEN
      RAISE EXCEPTION 'create_notification: recipient must be crew owner';
    END IF;
  ELSIF p_type = 'crew_join_accepted' THEN
    IF p_crew_join_request_id IS NULL THEN
      RAISE EXCEPTION 'create_notification: crew_join_request_id required';
    END IF;

    IF p_event_id IS NOT NULL OR p_friend_request_id IS NOT NULL THEN
      RAISE EXCEPTION 'create_notification: unexpected foreign key for crew_join_accepted';
    END IF;

    SELECT * INTO cjr FROM public.crew_join_requests WHERE id = p_crew_join_request_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'create_notification: crew join request not found';
    END IF;

    IF cjr.status <> 'accepted' THEN
      RAISE EXCEPTION 'create_notification: crew join request must be accepted';
    END IF;

    IF NOT public.is_crew_owner(cjr.crew_id, auth.uid()) THEN
      RAISE EXCEPTION 'create_notification: only crew owner may send crew_join_accepted notification';
    END IF;

    IF cjr.requester_id <> p_recipient_id THEN
      RAISE EXCEPTION 'create_notification: recipient must be requester';
    END IF;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    actor_label,
    type,
    event_id,
    friend_request_id,
    crew_join_request_id,
    body
  )
  VALUES (
    p_recipient_id,
    p_actor_id,
    p_actor_label,
    p_type,
    p_event_id,
    p_friend_request_id,
    p_crew_join_request_id,
    p_body
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid
) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_crew_join_request_with_notification(
  p_crew_id uuid,
  p_actor_label text,
  p_body text
)
RETURNS public.crew_join_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  crew_owner_id uuid;
  new_request public.crew_join_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_crew_join_request_with_notification: authentication required';
  END IF;

  SELECT owner_id INTO crew_owner_id
  FROM public.crews
  WHERE id = p_crew_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'create_crew_join_request_with_notification: crew not found';
  END IF;

  IF crew_owner_id = auth.uid() THEN
    RAISE EXCEPTION 'create_crew_join_request_with_notification: cannot request own crew';
  END IF;

  IF public.is_crew_member(p_crew_id, auth.uid()) THEN
    RAISE EXCEPTION 'create_crew_join_request_with_notification: already a member';
  END IF;

  INSERT INTO public.crew_join_requests (crew_id, requester_id, status)
  VALUES (p_crew_id, auth.uid(), 'pending')
  RETURNING * INTO new_request;

  PERFORM public.create_notification(
    crew_owner_id,
    auth.uid(),
    p_actor_label,
    'crew_join_request',
    p_body,
    NULL,
    NULL,
    new_request.id
  );

  RETURN new_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_crew_join_request_with_notification(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_crew_join_request_with_notification(
  p_request_id uuid,
  p_status text,
  p_actor_label text,
  p_accept_body text DEFAULT NULL
)
RETURNS public.crew_join_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_request public.crew_join_requests%ROWTYPE;
  updated_request public.crew_join_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'respond_crew_join_request_with_notification: authentication required';
  END IF;

  IF p_status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'respond_crew_join_request_with_notification: invalid status';
  END IF;

  SELECT * INTO existing_request
  FROM public.crew_join_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'respond_crew_join_request_with_notification: crew join request not found';
  END IF;

  IF NOT public.is_crew_owner(existing_request.crew_id, auth.uid()) THEN
    RAISE EXCEPTION 'respond_crew_join_request_with_notification: only crew owner may respond';
  END IF;

  IF existing_request.status <> 'pending' THEN
    RAISE EXCEPTION 'respond_crew_join_request_with_notification: request must be pending';
  END IF;

  IF p_status = 'declined' THEN
    DELETE FROM public.crew_join_requests
    WHERE id = p_request_id;

    existing_request.status := 'declined';
    RETURN existing_request;
  END IF;

  IF public.is_crew_member(existing_request.crew_id, existing_request.requester_id) THEN
    RAISE EXCEPTION 'respond_crew_join_request_with_notification: requester already a member';
  END IF;

  UPDATE public.crew_join_requests
  SET status = 'accepted'
  WHERE id = p_request_id
  RETURNING * INTO updated_request;

  INSERT INTO public.crew_members (crew_id, user_id, role)
  VALUES (existing_request.crew_id, existing_request.requester_id, 'member');

  IF p_accept_body IS NULL OR char_length(p_accept_body) < 1 THEN
    RAISE EXCEPTION 'respond_crew_join_request_with_notification: accept body required';
  END IF;

  PERFORM public.create_notification(
    updated_request.requester_id,
    auth.uid(),
    p_actor_label,
    'crew_join_accepted',
    p_accept_body,
    NULL,
    NULL,
    updated_request.id
  );

  RETURN updated_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_crew_join_request_with_notification(uuid, text, text, text) TO authenticated;

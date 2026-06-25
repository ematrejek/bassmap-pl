-- S-23 Phase 1: friend requests, event recommendations, in-app notifications.

-- ---------------------------------------------------------------------------
-- friend_requests
-- ---------------------------------------------------------------------------

CREATE TABLE public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  pair_user_low uuid NOT NULL,
  pair_user_high uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_requests_status_check CHECK (status IN ('pending', 'accepted', 'declined')),
  CONSTRAINT friend_requests_no_self_invite CHECK (requester_id <> addressee_id),
  CONSTRAINT friend_requests_pair_unique UNIQUE (pair_user_low, pair_user_high)
);

CREATE INDEX friend_requests_requester_id_status_idx
  ON public.friend_requests (requester_id, status);

CREATE INDEX friend_requests_addressee_id_status_idx
  ON public.friend_requests (addressee_id, status);

CREATE INDEX friend_requests_created_at_idx
  ON public.friend_requests (created_at DESC);

CREATE OR REPLACE FUNCTION public.friend_requests_set_pair_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.pair_user_low := LEAST(NEW.requester_id, NEW.addressee_id);
  NEW.pair_user_high := GREATEST(NEW.requester_id, NEW.addressee_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER friend_requests_set_pair_columns
  BEFORE INSERT OR UPDATE OF requester_id, addressee_id
  ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.friend_requests_set_pair_columns();

CREATE TRIGGER friend_requests_set_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.friend_requests_restrict_mutable_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
    OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id
    OR NEW.pair_user_low IS DISTINCT FROM OLD.pair_user_low
    OR NEW.pair_user_high IS DISTINCT FROM OLD.pair_user_high
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'friend_requests: only status may be updated';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER friend_requests_restrict_mutable_columns
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.friend_requests_restrict_mutable_columns();

CREATE OR REPLACE FUNCTION public.are_accepted_friends(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friend_requests fr
    WHERE fr.status = 'accepted'
      AND fr.pair_user_low = LEAST(p_user_a, p_user_b)
      AND fr.pair_user_high = GREATEST(p_user_a, p_user_b)
  );
$$;

GRANT EXECUTE ON FUNCTION public.are_accepted_friends(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_label text NOT NULL,
  type text NOT NULL,
  event_id uuid REFERENCES public.events (id) ON DELETE CASCADE,
  friend_request_id uuid REFERENCES public.friend_requests (id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check CHECK (
    type IN ('friend_request', 'friend_request_accepted', 'event_recommendation')
  ),
  CONSTRAINT notifications_body_length_check CHECK (char_length(body) BETWEEN 1 AND 500),
  CONSTRAINT notifications_actor_label_length_check CHECK (char_length(actor_label) BETWEEN 1 AND 80)
);

CREATE INDEX notifications_recipient_id_read_at_idx
  ON public.notifications (recipient_id, read_at);

CREATE INDEX notifications_recipient_id_created_at_idx
  ON public.notifications (recipient_id, created_at DESC);

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
    OR NEW.body IS DISTINCT FROM OLD.body
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'notifications: only read_at may be updated';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_restrict_mutable_columns
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notifications_restrict_mutable_columns();

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

GRANT EXECUTE ON FUNCTION public.create_notification(
  uuid,
  uuid,
  text,
  text,
  text,
  uuid,
  uuid
) TO authenticated;

-- ---------------------------------------------------------------------------
-- event_recommendations
-- ---------------------------------------------------------------------------

CREATE TABLE public.event_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  recipient_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  sender_label text NOT NULL,
  message text,
  notification_id uuid REFERENCES public.notifications (id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_recommendations_message_length_check CHECK (
    message IS NULL OR char_length(message) BETWEEN 1 AND 300
  ),
  CONSTRAINT event_recommendations_sender_label_length_check CHECK (
    char_length(sender_label) BETWEEN 1 AND 80
  ),
  CONSTRAINT event_recommendations_no_self_recipient CHECK (sender_id <> recipient_id)
);

CREATE INDEX event_recommendations_recipient_id_created_at_idx
  ON public.event_recommendations (recipient_id, created_at DESC);

CREATE INDEX event_recommendations_event_id_idx
  ON public.event_recommendations (event_id);

CREATE INDEX event_recommendations_sender_id_idx
  ON public.event_recommendations (sender_id);

CREATE OR REPLACE FUNCTION public.event_recommendations_restrict_mutable_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.event_id IS DISTINCT FROM OLD.event_id
    OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
    OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
    OR NEW.sender_label IS DISTINCT FROM OLD.sender_label
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.notification_id IS DISTINCT FROM OLD.notification_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'event_recommendations: only read_at may be updated';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER event_recommendations_restrict_mutable_columns
  BEFORE UPDATE ON public.event_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.event_recommendations_restrict_mutable_columns();

-- ---------------------------------------------------------------------------
-- RLS: friend_requests
-- ---------------------------------------------------------------------------

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY friend_requests_select_involved
  ON public.friend_requests
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY friend_requests_insert_requester
  ON public.friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND requester_id <> addressee_id
    AND status = 'pending'
  );

CREATE POLICY friend_requests_update_addressee
  ON public.friend_requests
  FOR UPDATE
  TO authenticated
  USING (addressee_id = auth.uid() AND status = 'pending')
  WITH CHECK (addressee_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: notifications
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: event_recommendations
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_recommendations_select_involved
  ON public.event_recommendations
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY event_recommendations_insert_sender
  ON public.event_recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_id <> recipient_id
    AND public.are_accepted_friends(sender_id, recipient_id)
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND e.status = 'published'
        AND public.is_upcoming(e.starts_at)
    )
  );

CREATE POLICY event_recommendations_update_recipient_read
  ON public.event_recommendations
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

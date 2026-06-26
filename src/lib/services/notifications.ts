import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification, NotificationRow, NotificationType } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

const NOTIFICATION_SELECT =
  "id, recipient_id, actor_id, actor_label, type, event_id, friend_request_id, crew_join_request_id, body, read_at, created_at";

function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    actorId: row.actor_id,
    actorLabel: row.actor_label,
    type: row.type,
    eventId: row.event_id,
    friendRequestId: row.friend_request_id,
    crewJoinRequestId: row.crew_join_request_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function createNotification(
  supabase: SupabaseClient,
  input: {
    recipientId: string;
    actorId: string;
    actorLabel: string;
    type: NotificationType;
    body: string;
    eventId?: string | null;
    friendRequestId?: string | null;
    crewJoinRequestId?: string | null;
  },
): Promise<ServiceResult<{ id: string }>> {
  const response = await supabase.rpc("create_notification", {
    p_recipient_id: input.recipientId,
    p_actor_id: input.actorId,
    p_actor_label: input.actorLabel,
    p_type: input.type,
    p_body: input.body,
    p_event_id: input.eventId ?? null,
    p_friend_request_id: input.friendRequestId ?? null,
    p_crew_join_request_id: input.crewJoinRequestId ?? null,
  });

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: { id: response.data as string } };
}

export async function listNotifications(
  supabase: SupabaseClient,
  recipientId: string,
  limit = 20,
): Promise<ServiceResult<Notification[]>> {
  const response = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: (response.data as unknown as NotificationRow[]).map(mapNotificationRow) };
}

export async function countUnreadNotifications(
  supabase: SupabaseClient,
  recipientId: string,
): Promise<ServiceResult<number>> {
  const response = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", recipientId)
    .is("read_at", null);

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: response.count ?? 0 };
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  recipientId: string,
  notificationId: string,
): Promise<ServiceResult<Notification>> {
  const response = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", recipientId)
    .select(NOTIFICATION_SELECT)
    .single();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: mapNotificationRow(response.data) };
}

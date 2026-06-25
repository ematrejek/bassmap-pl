import type { SupabaseClient } from "@supabase/supabase-js";
import { authorLabelFromEmail } from "@/lib/auth/display-name";
import { isUpcomingEvent } from "@/lib/events/format";
import type { CreateEventRecommendationInput } from "@/lib/events/recommendation-schema";
import { createNotification } from "@/lib/services/notifications";
import { getFanProfileByUserId } from "@/lib/services/fan-profile";
import { getPublishedEventById } from "@/lib/services/events";
import type { EventRecommendation, EventRecommendationRow } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

const EVENT_RECOMMENDATION_SELECT =
  "id, event_id, sender_id, recipient_id, sender_label, message, notification_id, read_at, created_at";

export const RECOMMENDATION_EVENT_NOT_FOUND_ERROR = "Nie znaleziono wydarzenia";
export const RECOMMENDATION_EVENT_ENDED_ERROR = "Nie można polecić zakończonego wydarzenia";
export const RECOMMENDATION_SELF_ERROR = "Nie możesz polecić wydarzenia samemu sobie";
export const RECOMMENDATION_NOT_FRIEND_ERROR = "Możesz polecać wydarzenia tylko zaakceptowanym znajomym";

function mapRecommendationRow(row: EventRecommendationRow): EventRecommendation {
  return {
    id: row.id,
    eventId: row.event_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    senderLabel: row.sender_label,
    message: row.message,
    notificationId: row.notification_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

async function resolveSenderLabel(supabase: SupabaseClient, senderId: string, senderEmail: string): Promise<string> {
  const profileResult = await getFanProfileByUserId(supabase, senderId);
  if ("data" in profileResult && profileResult.data?.login) {
    return profileResult.data.login;
  }

  return authorLabelFromEmail(senderEmail);
}

async function areAcceptedFriends(
  supabase: SupabaseClient,
  senderId: string,
  recipientId: string,
): Promise<ServiceResult<boolean>> {
  const response = await supabase.rpc("are_accepted_friends", {
    p_user_a: senderId,
    p_user_b: recipientId,
  });

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: Boolean(response.data) };
}

export async function createEventRecommendation(
  supabase: SupabaseClient,
  sender: { id: string; email: string },
  eventId: string,
  input: CreateEventRecommendationInput,
): Promise<ServiceResult<EventRecommendation>> {
  if (sender.id === input.recipientUserId) {
    return { error: RECOMMENDATION_SELF_ERROR };
  }

  const event = await getPublishedEventById(supabase, eventId);
  if (!event) {
    return { error: RECOMMENDATION_EVENT_NOT_FOUND_ERROR };
  }
  if (!isUpcomingEvent(event.startsAt)) {
    return { error: RECOMMENDATION_EVENT_ENDED_ERROR };
  }

  const friendship = await areAcceptedFriends(supabase, sender.id, input.recipientUserId);
  if ("error" in friendship) {
    return friendship;
  }
  if (!friendship.data) {
    return { error: RECOMMENDATION_NOT_FRIEND_ERROR };
  }

  const senderLabel = await resolveSenderLabel(supabase, sender.id, sender.email);
  const body = input.message
    ? `${senderLabel} poleca Ci event: ${event.name}. ${input.message}`
    : `${senderLabel} poleca Ci event: ${event.name}.`;

  const notification = await createNotification(supabase, {
    recipientId: input.recipientUserId,
    actorId: sender.id,
    actorLabel: senderLabel,
    type: "event_recommendation",
    eventId,
    body,
  });
  if ("error" in notification) {
    return notification;
  }

  const response = await supabase
    .from("event_recommendations")
    .insert({
      event_id: eventId,
      sender_id: sender.id,
      recipient_id: input.recipientUserId,
      sender_label: senderLabel,
      message: input.message ?? null,
      notification_id: notification.data.id,
    })
    .select(EVENT_RECOMMENDATION_SELECT)
    .single();

  if (response.error) {
    if (response.error.code === "42501") {
      return { error: RECOMMENDATION_NOT_FRIEND_ERROR };
    }
    return { error: response.error.message };
  }

  return { data: mapRecommendationRow(response.data) };
}

export async function listReceivedEventRecommendations(
  supabase: SupabaseClient,
  recipientId: string,
): Promise<ServiceResult<EventRecommendation[]>> {
  const response = await supabase
    .from("event_recommendations")
    .select(EVENT_RECOMMENDATION_SELECT)
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false });

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: (response.data as unknown as EventRecommendationRow[]).map(mapRecommendationRow) };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { authorLabelFromEmail } from "@/lib/auth/display-name";
import type { EventComment, EventCommentRow } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

const EVENT_COMMENT_SELECT = "id, event_id, author_id, author_label, body, created_at";

export function mapEventCommentRow(row: EventCommentRow): EventComment {
  return {
    id: row.id,
    eventId: row.event_id,
    authorId: row.author_id,
    authorLabel: row.author_label,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function listEventComments(
  supabase: SupabaseClient,
  eventId: string,
): Promise<ServiceResult<EventComment[]>> {
  const response = await supabase
    .from("event_comments")
    .select(EVENT_COMMENT_SELECT)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (response.error) {
    return { error: response.error.message };
  }

  const rows = (response.data as EventCommentRow[] | null) ?? [];
  return { data: rows.map(mapEventCommentRow) };
}

export async function createEventComment(
  supabase: SupabaseClient,
  userId: string,
  authorEmail: string,
  input: { eventId: string; body: string },
): Promise<ServiceResult<EventComment>> {
  const authorLabel = authorLabelFromEmail(authorEmail);

  const response = await supabase
    .from("event_comments")
    .insert({
      event_id: input.eventId,
      author_id: userId,
      author_label: authorLabel,
      body: input.body,
    })
    .select(EVENT_COMMENT_SELECT)
    .single();

  if (response.error) {
    if (response.error.code === "42501") {
      return { error: "Nie można dodać komentarza do tego wydarzenia" };
    }
    return { error: response.error.message };
  }

  return { data: mapEventCommentRow(response.data) };
}

export async function deleteEventComment(
  supabase: SupabaseClient,
  commentId: string,
): Promise<ServiceResult<{ id: string }>> {
  const response = await supabase.from("event_comments").delete().eq("id", commentId).select("id").maybeSingle();

  if (response.error) {
    if (response.error.code === "42501") {
      return { error: "Nie można usunąć tego komentarza" };
    }
    return { error: response.error.message };
  }

  if (response.data === null) {
    return { error: "Nie znaleziono komentarza" };
  }

  return { data: { id: commentId } };
}

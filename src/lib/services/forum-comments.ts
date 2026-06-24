import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveForumAuthorLabel } from "@/lib/services/forum-authors";
import type { ForumComment, ForumCommentRow } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

const FORUM_COMMENT_SELECT = "id, thread_id, author_id, author_label, body, created_at";

export function mapForumCommentRow(row: ForumCommentRow): ForumComment {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    authorLabel: row.author_label,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function listForumComments(
  supabase: SupabaseClient,
  threadId: string,
): Promise<ServiceResult<ForumComment[]>> {
  const response = await supabase
    .from("forum_comments")
    .select(FORUM_COMMENT_SELECT)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (response.error) {
    return { error: response.error.message };
  }

  const rows = (response.data as ForumCommentRow[] | null) ?? [];
  return { data: rows.map(mapForumCommentRow) };
}

export async function createForumComment(
  supabase: SupabaseClient,
  input: {
    authorId: string;
    authorEmail: string;
    threadId: string;
    body: string;
  },
): Promise<ServiceResult<ForumComment>> {
  const authorLabel = await resolveForumAuthorLabel(supabase, input.authorId, input.authorEmail);

  const response = await supabase
    .from("forum_comments")
    .insert({
      thread_id: input.threadId,
      author_id: input.authorId,
      author_label: authorLabel,
      body: input.body,
    })
    .select(FORUM_COMMENT_SELECT)
    .single();

  if (response.error) {
    if (response.error.code === "42501") {
      return { error: "Nie można dodać komentarza do tego wątku" };
    }
    return { error: response.error.message };
  }

  return { data: mapForumCommentRow(response.data) };
}

export async function deleteForumComment(
  supabase: SupabaseClient,
  commentId: string,
): Promise<ServiceResult<{ id: string }>> {
  const response = await supabase.from("forum_comments").delete().eq("id", commentId).select("id").maybeSingle();

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

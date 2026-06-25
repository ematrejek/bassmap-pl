import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveForumAuthorLabel } from "@/lib/services/forum-authors";
import type { ForumThread, ForumThreadCategory, ForumThreadRow } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

const FORUM_THREAD_SELECT = "id, category, title, body, city, tags, author_id, author_label, created_at, updated_at";

export function mapForumThreadRow(row: ForumThreadRow): ForumThread {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    city: row.city,
    tags: row.tags,
    authorId: row.author_id,
    authorLabel: row.author_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ListForumThreadsOptions {
  category?: ForumThreadCategory;
  limit: number;
  offset: number;
}

export async function listForumThreads(
  supabase: SupabaseClient,
  options: ListForumThreadsOptions,
): Promise<ServiceResult<ForumThread[]>> {
  let query = supabase
    .from("forum_threads")
    .select(FORUM_THREAD_SELECT)
    .order("created_at", { ascending: false })
    .range(options.offset, options.offset + options.limit - 1);

  if (options.category) {
    query = query.eq("category", options.category);
  }

  const response = await query;

  if (response.error) {
    return { error: response.error.message };
  }

  const rows = (response.data as ForumThreadRow[] | null) ?? [];
  return { data: rows.map(mapForumThreadRow) };
}

export async function getForumThreadById(supabase: SupabaseClient, id: string): Promise<ServiceResult<ForumThread>> {
  const response = await supabase.from("forum_threads").select(FORUM_THREAD_SELECT).eq("id", id).maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  if (!response.data) {
    return { error: "Nie znaleziono wątku" };
  }

  return { data: mapForumThreadRow(response.data) };
}

export async function createForumThread(
  supabase: SupabaseClient,
  input: {
    authorId: string;
    authorEmail: string;
    category: ForumThreadCategory;
    title: string;
    body: string;
    city?: string | null;
  },
): Promise<ServiceResult<ForumThread>> {
  const authorLabel = await resolveForumAuthorLabel(supabase, input.authorId, input.authorEmail);

  const response = await supabase
    .from("forum_threads")
    .insert({
      category: input.category,
      title: input.title,
      body: input.body,
      city: input.city ?? null,
      tags: [],
      author_id: input.authorId,
      author_label: authorLabel,
    })
    .select(FORUM_THREAD_SELECT)
    .single();

  if (response.error) {
    if (response.error.code === "42501") {
      return { error: "Nie można utworzyć wątku" };
    }
    return { error: response.error.message };
  }

  return { data: mapForumThreadRow(response.data) };
}

export async function deleteForumThread(
  supabase: SupabaseClient,
  threadId: string,
): Promise<ServiceResult<{ id: string }>> {
  const response = await supabase.from("forum_threads").delete().eq("id", threadId).select("id").maybeSingle();

  if (response.error) {
    if (response.error.code === "42501") {
      return { error: "Nie można usunąć tego wątku" };
    }
    return { error: response.error.message };
  }

  if (response.data === null) {
    return { error: "Nie znaleziono wątku" };
  }

  return { data: { id: threadId } };
}

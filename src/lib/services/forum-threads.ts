import type { SupabaseClient } from "@supabase/supabase-js";
import { isCrewForumCategory } from "@/lib/forum/thread-schema";
import { resolveForumAuthorLabel } from "@/lib/services/forum-authors";
import type { Crew, CrewRow, ForumThread, ForumThreadCategory, ForumThreadDetail, ForumThreadRow } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

const FORUM_THREAD_SELECT =
  "id, category, title, body, city, tags, author_id, author_label, crew_id, created_at, updated_at";

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
    crewId: row.crew_id,
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

function mapCrewRow(row: CrewRow): Crew {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    city: row.city,
    subgenres: row.subgenres,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function resolveThreadCrewId(
  supabase: SupabaseClient,
  authorId: string,
  category: ForumThreadCategory,
  crewId?: string,
): Promise<ServiceResult<string | null>> {
  if (!crewId) {
    return { data: null };
  }

  if (!isCrewForumCategory(category)) {
    return { error: "Ekipę można powiązać tylko z działem ekipowym" };
  }

  const response = await supabase.from("crews").select("id, owner_id").eq("id", crewId).maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  if (!response.data) {
    return { error: "Nie znaleziono ekipy" };
  }

  if (response.data.owner_id !== authorId) {
    return { error: "Możesz powiązać wątek tylko ze swoją ekipą" };
  }

  return { data: crewId };
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

export async function getForumThreadDetailForViewer(
  supabase: SupabaseClient,
  id: string,
  viewerId: string | null,
): Promise<ServiceResult<ForumThreadDetail>> {
  const threadResult = await getForumThreadById(supabase, id);
  if ("error" in threadResult) {
    return threadResult;
  }

  if (!threadResult.data.crewId || !viewerId) {
    return { data: { thread: threadResult.data, crew: null } };
  }

  const crewResponse = await supabase
    .from("crews")
    .select("id, owner_id, name, city, subgenres, description, created_at, updated_at")
    .eq("id", threadResult.data.crewId)
    .maybeSingle();

  if (crewResponse.error) {
    return { error: crewResponse.error.message };
  }

  if (!crewResponse.data) {
    return { data: { thread: threadResult.data, crew: null } };
  }

  return {
    data: {
      thread: threadResult.data,
      crew: mapCrewRow(crewResponse.data),
    },
  };
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
    crewId?: string;
  },
): Promise<ServiceResult<ForumThread>> {
  const crewIdResult = await resolveThreadCrewId(supabase, input.authorId, input.category, input.crewId);
  if ("error" in crewIdResult) {
    return crewIdResult;
  }

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
      crew_id: crewIdResult.data,
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

import type { SupabaseClient } from "@supabase/supabase-js";
import { DELETED_USER_AUTHOR_LABEL } from "@/lib/auth/display-name";

export type DeleteAccountResult = { success: true } | { error: string };

type AnonymizeTable = "event_comments" | "forum_threads" | "forum_comments";
type DeleteTable = "crews" | "crew_members" | "crew_join_requests";

async function anonymizeAuthorContentOnTable(
  serviceClient: SupabaseClient,
  table: AnonymizeTable,
  userId: string,
): Promise<{ error?: string }> {
  const response = await serviceClient
    .from(table)
    .update({
      author_id: null,
      author_label: DELETED_USER_AUTHOR_LABEL,
    })
    .eq("author_id", userId);

  if (response.error) {
    console.error(`[account-deletion] anonymize ${table} failed`, {
      userId,
      message: response.error.message,
    });
    return { error: response.error.message };
  }

  return {};
}

export async function anonymizeUserComments(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<{ error?: string }> {
  return anonymizeAuthorContentOnTable(serviceClient, "event_comments", userId);
}

export async function anonymizeUserForumContent(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<{ error?: string }> {
  const threadsResult = await anonymizeAuthorContentOnTable(serviceClient, "forum_threads", userId);
  if (threadsResult.error) {
    return threadsResult;
  }

  return anonymizeAuthorContentOnTable(serviceClient, "forum_comments", userId);
}

async function deleteRowsByColumn(
  serviceClient: SupabaseClient,
  table: DeleteTable,
  column: string,
  userId: string,
): Promise<{ error?: string }> {
  const response = await serviceClient.from(table).delete().eq(column, userId);

  if (response.error) {
    console.error(`[account-deletion] delete ${table} failed`, {
      userId,
      message: response.error.message,
    });
    return { error: response.error.message };
  }

  return {};
}

export async function cleanupUserCrewData(serviceClient: SupabaseClient, userId: string): Promise<{ error?: string }> {
  const ownedCrewsResult = await deleteRowsByColumn(serviceClient, "crews", "owner_id", userId);
  if (ownedCrewsResult.error) {
    return ownedCrewsResult;
  }

  const membershipsResult = await deleteRowsByColumn(serviceClient, "crew_members", "user_id", userId);
  if (membershipsResult.error) {
    return membershipsResult;
  }

  return deleteRowsByColumn(serviceClient, "crew_join_requests", "requester_id", userId);
}

export async function deleteUserAccount(serviceClient: SupabaseClient, userId: string): Promise<DeleteAccountResult> {
  const eventCommentsResult = await anonymizeUserComments(serviceClient, userId);
  if (eventCommentsResult.error) {
    return { error: eventCommentsResult.error };
  }

  const forumResult = await anonymizeUserForumContent(serviceClient, userId);
  if (forumResult.error) {
    return { error: forumResult.error };
  }

  const crewResult = await cleanupUserCrewData(serviceClient, userId);
  if (crewResult.error) {
    return { error: crewResult.error };
  }

  const deleteResult = await serviceClient.auth.admin.deleteUser(userId);
  if (deleteResult.error) {
    console.error("[account-deletion] deleteUser failed after content anonymization", {
      userId,
      message: deleteResult.error.message,
    });
    return {
      error:
        "Nie udało się usunąć konta. Skontaktuj się z administratorem (matrejekemilia@gmail.com), jeśli problem się powtarza.",
    };
  }

  return { success: true };
}

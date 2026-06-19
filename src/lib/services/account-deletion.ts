import type { SupabaseClient } from "@supabase/supabase-js";
import { DELETED_USER_AUTHOR_LABEL } from "@/lib/auth/display-name";

export type DeleteAccountResult = { success: true } | { error: string };

export async function anonymizeUserComments(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<{ error?: string }> {
  const response = await serviceClient
    .from("event_comments")
    .update({
      author_id: null,
      author_label: DELETED_USER_AUTHOR_LABEL,
    })
    .eq("author_id", userId);

  if (response.error) {
    console.error("[account-deletion] anonymizeUserComments failed", {
      userId,
      message: response.error.message,
    });
    return { error: response.error.message };
  }

  return {};
}

export async function deleteUserAccount(serviceClient: SupabaseClient, userId: string): Promise<DeleteAccountResult> {
  const anonymizeResult = await anonymizeUserComments(serviceClient, userId);
  if (anonymizeResult.error) {
    return { error: anonymizeResult.error };
  }

  const deleteResult = await serviceClient.auth.admin.deleteUser(userId);
  if (deleteResult.error) {
    console.error("[account-deletion] deleteUser failed after comment anonymization", {
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

import type { SupabaseClient } from "@supabase/supabase-js";
import { authorLabelFromEmail } from "@/lib/auth/display-name";
import { getFanProfileByUserId } from "@/lib/services/fan-profile";

export async function resolveForumAuthorLabel(
  supabase: SupabaseClient,
  userId: string,
  authorEmail: string,
): Promise<string> {
  const profileResult = await getFanProfileByUserId(supabase, userId);

  if ("data" in profileResult && profileResult.data?.login) {
    return profileResult.data.login;
  }

  return authorLabelFromEmail(authorEmail);
}

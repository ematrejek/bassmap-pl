import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function resolveIsOrganizer(supabase: SupabaseClient, user: User | null): Promise<boolean> {
  if (!user?.id) {
    return false;
  }

  const response = await supabase.rpc("is_organizer");

  if (response.error) {
    return false;
  }

  return response.data === true;
}

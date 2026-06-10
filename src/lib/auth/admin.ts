import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";

export async function resolveIsAdmin(supabase: SupabaseClient, user: User | null): Promise<boolean> {
  if (!user) {
    return false;
  }

  const result = (await supabase.rpc("is_admin")) as {
    data: boolean | null;
    error: PostgrestError | null;
  };

  if (result.error || typeof result.data !== "boolean") {
    return false;
  }

  return result.data;
}

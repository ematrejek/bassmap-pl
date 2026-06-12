import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "astro:env/server";

export function createServiceRoleClient(): SupabaseClient | null {
  const url = SUPABASE_URL;
  const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;

  if (typeof url !== "string" || !url || typeof serviceRoleKey !== "string" || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

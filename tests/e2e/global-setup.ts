import { createAdminClient, createNonAdminClient, isSupabaseConfigured } from "../helpers/supabase";
import { cleanupE2eEvents } from "./helpers/cleanup";
import { loadEnvTest } from "./helpers/env";

export default async function globalSetup(): Promise<void> {
  loadEnvTest();

  await cleanupE2eEvents();

  if (!isSupabaseConfigured()) {
    return;
  }

  await createAdminClient();
  await createNonAdminClient();
}

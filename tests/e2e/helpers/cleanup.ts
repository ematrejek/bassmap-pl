import { createServiceClient, isSupabaseConfigured } from "../../helpers/supabase";
import { loadEnvTest } from "./env";

export async function cleanupE2eEvents(): Promise<void> {
  loadEnvTest();
  if (!isSupabaseConfigured()) {
    return;
  }

  const service = createServiceClient();
  const { error } = await service.from("events").delete().ilike("name", "e2e-%");
  if (error) {
    throw new Error(`E2E cleanup failed: ${error.message}`);
  }
}

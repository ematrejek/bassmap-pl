import { describe, expect, it } from "vitest";
import {
  createAdminClient,
  createAnonClient,
  createNonAdminClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

describe.skipIf(!runIntegration)("admin_allowlist email privacy", () => {
  it("does not expose allowlist emails to anon, non-admin, or admin via PostgREST", async () => {
    const anonClient = createAnonClient();
    const nonAdminClient = await createNonAdminClient();
    const adminClient = await createAdminClient();

    const anonResult = await anonClient.from("admin_allowlist").select("email");
    const nonAdminResult = await nonAdminClient.from("admin_allowlist").select("email");
    const adminResult = await adminClient.from("admin_allowlist").select("email");

    expect(anonResult.error?.message ?? "").toMatch(/permission denied|row-level security/i);
    expect(nonAdminResult.error?.message ?? "").toMatch(/permission denied|row-level security/i);
    expect(adminResult.error?.message ?? "").toMatch(/permission denied|row-level security/i);
  });
});

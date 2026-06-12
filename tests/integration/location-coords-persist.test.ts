import { afterAll, describe, expect, it } from "vitest";
import { createEvent, getEventById } from "@/lib/services/events";
import { buildMutationCreatePayload, deleteMutationFixtureIds } from "../helpers/mutation-fixtures";
import {
  createAdminClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

describe.skipIf(!runIntegration)("location coordinates persist", () => {
  const cleanupIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();
    await deleteMutationFixtureIds(serviceClient, cleanupIds);
  });

  it("createEvent persists submitted latitude and longitude (L4a)", async () => {
    const adminClient = await createAdminClient();
    const payload = buildMutationCreatePayload("coords-persist");

    const result = await createEvent(adminClient, payload);

    expect(result).toHaveProperty("data");
    if (!("data" in result)) {
      throw new Error("Expected admin create to succeed");
    }

    cleanupIds.push(result.data.id);

    expect(result.data.latitude).toBe(payload.latitude);
    expect(result.data.longitude).toBe(payload.longitude);

    const serviceClient = createServiceClient();
    const persisted = await getEventById(serviceClient, result.data.id);
    expect(persisted?.latitude).toBe(payload.latitude);
    expect(persisted?.longitude).toBe(payload.longitude);
  });
});

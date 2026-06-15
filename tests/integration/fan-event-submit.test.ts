import { afterAll, describe, expect, it } from "vitest";
import { createEvent, createFanSubmittedEvent, listEventsByCreator } from "@/lib/services/events";
import { buildMutationCreatePayload, deleteMutationFixtureIds } from "../helpers/mutation-fixtures";
import {
  createAnonClient,
  createAdminClient,
  createNonAdminClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

describe.skipIf(!runIntegration)("fan event submissions (RLS + service)", () => {
  const cleanupIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();
    await deleteMutationFixtureIds(serviceClient, cleanupIds);
  });

  it("allows non-admin INSERT pending with created_by, denies published INSERT", async () => {
    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user) {
      throw new Error("Non-admin test user not signed in");
    }

    const pendingPayload = buildMutationCreatePayload("fan-pending");
    const pendingResult = await createFanSubmittedEvent(nonAdminClient, user.id, pendingPayload);

    expect(pendingResult).toHaveProperty("data");
    if (!("data" in pendingResult)) {
      throw new Error("Expected fan pending create to succeed");
    }

    expect(pendingResult.data.status).toBe("pending");
    expect(pendingResult.data.createdBy).toBe(user.id);
    cleanupIds.push(pendingResult.data.id);

    const publishedPayload = buildMutationCreatePayload("fan-published-deny");
    const publishedResult = await createEvent(nonAdminClient, publishedPayload);

    expect(publishedResult).toHaveProperty("error");

    const serviceClient = createServiceClient();
    const publishedCheck = await serviceClient.from("events").select("id").eq("name", publishedPayload.name);

    expect(publishedCheck.data ?? []).toHaveLength(0);
  });

  it("allows non-admin SELECT own pending, denies SELECT other user's pending", async () => {
    const nonAdminClient = await createNonAdminClient();
    const serviceClient = createServiceClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user) {
      throw new Error("Non-admin test user not signed in");
    }

    const ownPayload = buildMutationCreatePayload("fan-own-select");
    const ownResult = await createFanSubmittedEvent(nonAdminClient, user.id, ownPayload);

    expect(ownResult).toHaveProperty("data");
    if (!("data" in ownResult)) {
      throw new Error("Expected own pending create to succeed");
    }

    cleanupIds.push(ownResult.data.id);

    const ownList = await listEventsByCreator(nonAdminClient, user.id);
    expect(ownList).toHaveProperty("data");
    if (!("data" in ownList)) {
      throw new Error("Expected own list to succeed");
    }

    expect(ownList.data.some((event) => event.id === ownResult.data.id)).toBe(true);

    const adminClient = await createAdminClient();
    const {
      data: { user: adminUser },
    } = await adminClient.auth.getUser();

    if (!adminUser) {
      throw new Error("Admin test user not signed in");
    }

    const otherInsert = await serviceClient
      .from("events")
      .insert({
        name: "integration-fan-submit other-user-pending",
        starts_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        city: "TestMutation",
        venue_name: "Test Venue",
        address_street: "Testowa",
        address_number: "1",
        latitude: 52.2297,
        longitude: 21.0122,
        subgenres: ["neurofunk"],
        is_free: true,
        status: "pending",
        created_by: adminUser.id,
      })
      .select("id")
      .single();

    if (otherInsert.error) {
      throw new Error(`Failed to insert other-user fixture: ${otherInsert.error.message}`);
    }

    cleanupIds.push(otherInsert.data.id as string);

    const otherList = await listEventsByCreator(nonAdminClient, adminUser.id);
    expect(otherList).toHaveProperty("data");
    if (!("data" in otherList)) {
      throw new Error("Expected other list query to return data envelope");
    }

    expect(otherList.data).toHaveLength(0);

    const directSelect = await nonAdminClient
      .from("events")
      .select("id")
      .eq("id", otherInsert.data.id as string)
      .maybeSingle();

    expect(directSelect.error).toBeNull();
    expect(directSelect.data).toBeNull();
  });

  it("denies anon INSERT", async () => {
    const anonClient = createAnonClient();
    const payload = buildMutationCreatePayload("anon-fan-deny");
    const result = await createEvent(anonClient, payload, {
      status: "pending",
      createdBy: "00000000-0000-4000-8000-000000000002",
    });

    expect(result).toHaveProperty("error");

    const serviceClient = createServiceClient();
    const check = await serviceClient.from("events").select("id").eq("name", payload.name);

    expect(check.data ?? []).toHaveLength(0);
  });
});

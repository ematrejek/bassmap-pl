import { afterAll, describe, expect, it } from "vitest";
import {
  createFanChangeSuggestion,
  listChangeSuggestionsForAdmin,
  listChangeSuggestionsForFan,
} from "@/lib/services/change-suggestions";
import {
  createAdminClient,
  createAnonClient,
  createNonAdminClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

function futureStartsAt(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString();
}

async function insertPublishedEventFixture(
  serviceClient: ReturnType<typeof createServiceClient>,
  label: string,
): Promise<string> {
  const response = await serviceClient
    .from("events")
    .insert({
      name: `integration-change-suggestions ${label}`,
      starts_at: futureStartsAt(60),
      city: "TestMutation",
      venue_name: "Test Venue",
      address_street: "Testowa",
      address_number: "1",
      latitude: 52.2297,
      longitude: 21.0122,
      subgenres: ["neurofunk"],
      is_free: true,
      status: "published",
    })
    .select("id")
    .single();

  if (response.error) {
    throw new Error(`Failed to insert event fixture: ${response.error.message}`);
  }

  return response.data.id as string;
}

describe.skipIf(!runIntegration)("change_suggestions (RLS + service)", () => {
  const cleanupEventIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();
    if (cleanupEventIds.length > 0) {
      const response = await serviceClient.from("events").delete().in("id", cleanupEventIds);
      if (response.error) {
        throw new Error(`Failed to delete event fixtures: ${response.error.message}`);
      }
    }
  });

  it("denies anon INSERT on change_suggestions", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertPublishedEventFixture(serviceClient, "anon-deny");
    cleanupEventIds.push(eventId);

    const anonClient = createAnonClient();
    const response = await anonClient.from("change_suggestions").insert({
      event_id: eventId,
      submitted_by: "00000000-0000-4000-8000-000000000002",
      body: "Anon suggestion body long enough",
      status: "pending",
      source: "duplicate_flow",
    });

    expect(response.error).not.toBeNull();

    const check = await serviceClient.from("change_suggestions").select("id").eq("event_id", eventId);
    expect(check.data ?? []).toHaveLength(0);
  });

  it("allows fan INSERT own pending suggestion and denies wrong source via RLS", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertPublishedEventFixture(serviceClient, "fan-insert");
    cleanupEventIds.push(eventId);

    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user) {
      throw new Error("Non-admin test user not signed in");
    }

    const ownResult = await createFanChangeSuggestion(nonAdminClient, user.id, {
      eventId,
      body: "Poprawcie godzinę startu na 22:00 w opisie wydarzenia",
    });

    expect(ownResult).toHaveProperty("data");
    if (!("data" in ownResult)) {
      throw new Error("Expected fan suggestion create to succeed");
    }

    expect(ownResult.data.status).toBe("pending");
    expect(ownResult.data.source).toBe("duplicate_flow");
    expect(ownResult.data.submittedBy).toBe(user.id);

    const wrongSourceInsert = await nonAdminClient.from("change_suggestions").insert({
      event_id: eventId,
      submitted_by: user.id,
      body: "Another suggestion with wrong source field",
      status: "pending",
      source: "event_page",
    });

    expect(wrongSourceInsert.error).not.toBeNull();
  }, 15_000);

  it("allows fan SELECT own suggestions only; admin SELECT all", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertPublishedEventFixture(serviceClient, "fan-select");
    cleanupEventIds.push(eventId);

    const nonAdminClient = await createNonAdminClient();
    const adminClient = await createAdminClient();

    const {
      data: { user: fanUser },
    } = await nonAdminClient.auth.getUser();
    const {
      data: { user: adminUser },
    } = await adminClient.auth.getUser();

    if (!fanUser || !adminUser) {
      throw new Error("Test users not signed in");
    }

    const ownResult = await createFanChangeSuggestion(nonAdminClient, fanUser.id, {
      eventId,
      body: "Fan own suggestion visible only to self and admin",
    });

    expect(ownResult).toHaveProperty("data");
    if (!("data" in ownResult)) {
      throw new Error("Expected own suggestion create to succeed");
    }

    const otherInsert = await serviceClient
      .from("change_suggestions")
      .insert({
        event_id: eventId,
        submitted_by: adminUser.id,
        body: "Admin-owned suggestion for RLS isolation test",
        status: "pending",
        source: "duplicate_flow",
      })
      .select("id")
      .single();

    if (otherInsert.error) {
      throw new Error(`Failed to insert other-user suggestion: ${otherInsert.error.message}`);
    }

    const fanList = await listChangeSuggestionsForFan(nonAdminClient, fanUser.id);
    expect(fanList).toHaveProperty("data");
    if (!("data" in fanList)) {
      throw new Error("Expected fan list to succeed");
    }

    expect(fanList.data.some((row) => row.id === ownResult.data.id)).toBe(true);
    expect(fanList.data.some((row) => row.id === otherInsert.data.id)).toBe(false);

    const directOtherSelect = await nonAdminClient
      .from("change_suggestions")
      .select("id")
      .eq("id", otherInsert.data.id as string)
      .maybeSingle();

    expect(directOtherSelect.error).toBeNull();
    expect(directOtherSelect.data).toBeNull();

    const adminList = await listChangeSuggestionsForAdmin(adminClient);
    expect(adminList).toHaveProperty("data");
    if (!("data" in adminList)) {
      throw new Error("Expected admin list to succeed");
    }

    expect(adminList.data.some((row) => row.id === ownResult.data.id)).toBe(true);
    expect(adminList.data.some((row) => row.id === otherInsert.data.id)).toBe(true);
  }, 20_000);
});

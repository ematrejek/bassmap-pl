import { afterAll, describe, expect, it } from "vitest";
import { clearAttendance, getAttendanceSummary, setAttendanceStatus } from "@/lib/services/event-attendance";
import {
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

function pastStartsAt(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString();
}

async function insertEventFixture(
  serviceClient: ReturnType<typeof createServiceClient>,
  label: string,
  options: { status: "published" | "pending"; startsAt: string },
): Promise<string> {
  const response = await serviceClient
    .from("events")
    .insert({
      name: `integration-event-attendance ${label}`,
      starts_at: options.startsAt,
      city: "TestMutation",
      venue_name: "Test Venue",
      address_street: "Testowa",
      address_number: "1",
      latitude: 52.2297,
      longitude: 21.0122,
      subgenres: ["neurofunk"],
      is_free: true,
      status: options.status,
    })
    .select("id")
    .single();

  if (response.error) {
    throw new Error(`Failed to insert event fixture: ${response.error.message}`);
  }

  return response.data.id as string;
}

describe.skipIf(!runIntegration)("event_attendance (RLS + service)", () => {
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

  it("allows fan INSERT going on published event and anon SELECT counts", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertEventFixture(serviceClient, "fan-going", {
      status: "published",
      startsAt: futureStartsAt(60),
    });
    cleanupEventIds.push(eventId);

    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user) {
      throw new Error("Non-admin test user not signed in");
    }

    const setResult = await setAttendanceStatus(nonAdminClient, user.id, eventId, "going");
    expect(setResult).toHaveProperty("data");
    if (!("data" in setResult)) {
      throw new Error("Expected fan attendance set to succeed");
    }

    expect(setResult.data.eventId).toBe(eventId);
    expect(setResult.data.status).toBe("going");

    const anonClient = createAnonClient();
    const summary = await getAttendanceSummary(anonClient, eventId);
    expect(summary).toHaveProperty("data");
    if (!("data" in summary)) {
      throw new Error("Expected anon summary to succeed");
    }

    expect(summary.data.goingCount).toBe(1);
    expect(summary.data.interestedCount).toBe(0);
    expect(summary.data.userStatus).toBeNull();
  }, 15_000);

  it("denies fan INSERT on pending event", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertEventFixture(serviceClient, "pending-deny", {
      status: "pending",
      startsAt: futureStartsAt(60),
    });
    cleanupEventIds.push(eventId);

    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user) {
      throw new Error("Non-admin test user not signed in");
    }

    const setResult = await setAttendanceStatus(nonAdminClient, user.id, eventId, "going");
    expect(setResult).toHaveProperty("error");
  }, 15_000);

  it("allows fan UPDATE status and DELETE own attendance", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertEventFixture(serviceClient, "toggle", {
      status: "published",
      startsAt: futureStartsAt(45),
    });
    cleanupEventIds.push(eventId);

    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user) {
      throw new Error("Non-admin test user not signed in");
    }

    const goingResult = await setAttendanceStatus(nonAdminClient, user.id, eventId, "going");
    if (!("data" in goingResult)) {
      throw new Error("Expected going set to succeed");
    }

    const interestedResult = await setAttendanceStatus(nonAdminClient, user.id, eventId, "interested");
    expect(interestedResult).toHaveProperty("data");
    if (!("data" in interestedResult)) {
      throw new Error("Expected interested update to succeed");
    }

    expect(interestedResult.data.status).toBe("interested");

    const summaryBeforeDelete = await getAttendanceSummary(nonAdminClient, eventId, user.id);
    if (!("data" in summaryBeforeDelete)) {
      throw new Error("Expected summary before delete");
    }

    expect(summaryBeforeDelete.data.goingCount).toBe(0);
    expect(summaryBeforeDelete.data.interestedCount).toBe(1);
    expect(summaryBeforeDelete.data.userStatus).toBe("interested");

    const clearResult = await clearAttendance(nonAdminClient, user.id, eventId);
    expect(clearResult).toHaveProperty("data");

    const summaryAfterDelete = await getAttendanceSummary(nonAdminClient, eventId, user.id);
    if (!("data" in summaryAfterDelete)) {
      throw new Error("Expected summary after delete");
    }

    expect(summaryAfterDelete.data.interestedCount).toBe(0);
    expect(summaryAfterDelete.data.userStatus).toBeNull();
  }, 15_000);

  it("enforces unique user_id + event_id via upsert", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertEventFixture(serviceClient, "unique", {
      status: "published",
      startsAt: futureStartsAt(30),
    });
    cleanupEventIds.push(eventId);

    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user) {
      throw new Error("Non-admin test user not signed in");
    }

    await setAttendanceStatus(nonAdminClient, user.id, eventId, "going");
    await setAttendanceStatus(nonAdminClient, user.id, eventId, "interested");

    const { count, error } = await serviceClient
      .from("event_attendance")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_id", eventId);

    expect(error).toBeNull();
    expect(count).toBe(1);
  }, 15_000);

  it("allows anon SELECT on published past event counts", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertEventFixture(serviceClient, "archived-read", {
      status: "published",
      startsAt: pastStartsAt(30),
    });
    cleanupEventIds.push(eventId);

    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user) {
      throw new Error("Non-admin test user not signed in");
    }

    const insertResponse = await serviceClient.from("event_attendance").insert({
      user_id: user.id,
      event_id: eventId,
      status: "going",
    });

    if (insertResponse.error) {
      throw new Error(`Service insert failed: ${insertResponse.error.message}`);
    }

    const anonClient = createAnonClient();
    const summary = await getAttendanceSummary(anonClient, eventId);
    expect(summary).toHaveProperty("data");
    if (!("data" in summary)) {
      throw new Error("Expected anon read on past published event");
    }

    expect(summary.data.goingCount).toBe(1);
  }, 15_000);
});

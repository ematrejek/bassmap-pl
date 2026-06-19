import { afterAll, describe, expect, it } from "vitest";
import { createEventComment, deleteEventComment, listEventComments } from "@/lib/services/event-comments";
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
      name: `integration-event-comments ${label}`,
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

async function insertPendingEventFixture(
  serviceClient: ReturnType<typeof createServiceClient>,
  label: string,
): Promise<string> {
  const response = await serviceClient
    .from("events")
    .insert({
      name: `integration-event-comments pending ${label}`,
      starts_at: futureStartsAt(60),
      city: "TestMutation",
      venue_name: "Test Venue",
      address_street: "Testowa",
      address_number: "1",
      latitude: 52.2297,
      longitude: 21.0122,
      subgenres: ["neurofunk"],
      is_free: true,
      status: "pending",
    })
    .select("id")
    .single();

  if (response.error) {
    throw new Error(`Failed to insert pending event fixture: ${response.error.message}`);
  }

  return response.data.id as string;
}

describe.skipIf(!runIntegration)("event_comments (RLS + service)", () => {
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

  it("allows fan INSERT on published event and anon SELECT", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertPublishedEventFixture(serviceClient, "fan-insert");
    cleanupEventIds.push(eventId);

    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user?.email) {
      throw new Error("Non-admin test user not signed in");
    }

    const createResult = await createEventComment(nonAdminClient, user.id, user.email, {
      eventId,
      body: "Integration comment from fan",
    });

    expect(createResult).toHaveProperty("data");
    if (!("data" in createResult)) {
      throw new Error("Expected fan comment create to succeed");
    }

    expect(createResult.data.eventId).toBe(eventId);
    expect(createResult.data.authorId).toBe(user.id);
    expect(createResult.data.body).toBe("Integration comment from fan");

    const anonClient = createAnonClient();
    const listResult = await listEventComments(anonClient, eventId);
    expect(listResult).toHaveProperty("data");
    if (!("data" in listResult)) {
      throw new Error("Expected anon list to succeed");
    }

    expect(listResult.data).toHaveLength(1);
    expect(listResult.data[0]?.body).toBe("Integration comment from fan");
  }, 15_000);

  it("denies fan INSERT on pending event", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertPendingEventFixture(serviceClient, "pending-deny");
    cleanupEventIds.push(eventId);

    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user?.email) {
      throw new Error("Non-admin test user not signed in");
    }

    const createResult = await createEventComment(nonAdminClient, user.id, user.email, {
      eventId,
      body: "Should not be accepted on pending event",
    });

    expect(createResult).toHaveProperty("error");
  }, 15_000);

  it("allows fan DELETE own comment and denies DELETE on another user's comment", async () => {
    const serviceClient = createServiceClient();
    const eventId = await insertPublishedEventFixture(serviceClient, "author-delete");
    cleanupEventIds.push(eventId);

    const nonAdminClient = await createNonAdminClient();
    const adminClient = await createAdminClient();
    const {
      data: { user: fanUser },
    } = await nonAdminClient.auth.getUser();
    const {
      data: { user: adminUser },
    } = await adminClient.auth.getUser();

    if (!fanUser?.email || !adminUser?.email) {
      throw new Error("Test users not signed in");
    }

    const fanComment = await createEventComment(nonAdminClient, fanUser.id, fanUser.email, {
      eventId,
      body: "Fan own comment",
    });

    const adminComment = await createEventComment(adminClient, adminUser.id, adminUser.email, {
      eventId,
      body: "Admin comment on same event",
    });

    if (!("data" in fanComment) || !("data" in adminComment)) {
      throw new Error("Expected comments to be created");
    }

    const fanDeleteOther = await deleteEventComment(nonAdminClient, adminComment.data.id);
    expect(fanDeleteOther).toHaveProperty("error");

    const fanDeleteOwn = await deleteEventComment(nonAdminClient, fanComment.data.id);
    expect(fanDeleteOwn).toHaveProperty("data");

    const adminDelete = await deleteEventComment(adminClient, adminComment.data.id);
    expect(adminDelete).toHaveProperty("data");

    const listAfterDelete = await listEventComments(adminClient, eventId);
    if (!("data" in listAfterDelete)) {
      throw new Error("Expected list after delete to succeed");
    }

    expect(listAfterDelete.data).toHaveLength(0);
  }, 15_000);
});

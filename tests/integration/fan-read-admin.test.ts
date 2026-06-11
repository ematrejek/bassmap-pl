import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPublishedEventById, listDistinctCities, listPublishedEvents } from "@/lib/services/events";
import { deleteFanReadFixtures, insertFanReadFixtures, type FanReadFixtures } from "../helpers/event-fixtures";
import {
  createAdminClient,
  createAnonClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

describe.skipIf(!runIntegration)("fan read public paths (admin session)", () => {
  let fixtures: FanReadFixtures | undefined;

  beforeAll(async () => {
    const serviceClient = createServiceClient();
    fixtures = await insertFanReadFixtures(serviceClient);
  });

  afterAll(async () => {
    if (!fixtures) {
      return;
    }
    const serviceClient = createServiceClient();
    await deleteFanReadFixtures(serviceClient, fixtures);
  });

  it("listPublishedEvents matches anon filters for admin (3a)", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }

    const anonClient = createAnonClient();
    const adminClient = await createAdminClient();

    const anonResult = await listPublishedEvents(anonClient);
    const adminResult = await listPublishedEvents(adminClient);

    expect(anonResult).toHaveProperty("data");
    expect(adminResult).toHaveProperty("data");
    if (!("data" in anonResult) || !("data" in adminResult)) {
      throw new Error("Expected published events data");
    }

    const anonIds = anonResult.data.map((event) => event.id);
    const adminIds = adminResult.data.map((event) => event.id);

    for (const fixtureId of fixtures.publishedUpcomingIds) {
      expect(adminIds).toContain(fixtureId);
    }

    expect(adminIds).not.toContain(fixtures.draftUpcomingId);
    expect(adminIds).not.toContain(fixtures.publishedPastId);
    expect(adminIds).toEqual(anonIds);
  });

  it("getPublishedEventById hides past and shows upcoming for admin (3b)", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }

    const adminClient = await createAdminClient();
    const [publishedUpcomingId] = fixtures.publishedUpcomingIds;

    const pastEvent = await getPublishedEventById(adminClient, fixtures.publishedPastId);
    const upcomingEvent = await getPublishedEventById(adminClient, publishedUpcomingId);

    expect(pastEvent).toBeNull();
    expect(upcomingEvent?.id).toBe(publishedUpcomingId);
  });

  it("listDistinctCities matches anon for admin (3c)", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }

    const anonClient = createAnonClient();
    const adminClient = await createAdminClient();

    const anonResult = await listDistinctCities(anonClient);
    const adminResult = await listDistinctCities(adminClient);

    expect(anonResult).toHaveProperty("data");
    expect(adminResult).toHaveProperty("data");
    if (!("data" in anonResult) || !("data" in adminResult)) {
      throw new Error("Expected city list data");
    }

    expect(adminResult.data).toEqual(anonResult.data);
    expect(adminResult.data).toContain("TestFanRead");
  });
});

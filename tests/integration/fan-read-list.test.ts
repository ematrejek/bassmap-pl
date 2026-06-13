import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listPublishedEvents } from "@/lib/services/events";
import { deleteFanReadFixtures, insertFanReadFixtures, type FanReadFixtures } from "../helpers/event-fixtures";
import {
  createAnonClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

describe.skipIf(!runIntegration)("listPublishedEvents fan read (anon)", () => {
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

  it("returns published-upcoming fixture rows (not falsely empty)", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }

    const anonClient = createAnonClient();
    const result = await listPublishedEvents(anonClient);

    expect(result).toHaveProperty("data");
    if (!("data" in result)) {
      throw new Error("Expected published events data");
    }

    const returnedIds = result.data.map((event) => event.id);

    expect(result.data.length).toBeGreaterThanOrEqual(2);
    for (const fixtureId of fixtures.publishedUpcomingIds) {
      expect(returnedIds).toContain(fixtureId);
    }
  });

  it("excludes draft-upcoming and published-past control rows", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }

    const anonClient = createAnonClient();
    const result = await listPublishedEvents(anonClient);

    expect(result).toHaveProperty("data");
    if (!("data" in result)) {
      throw new Error("Expected published events data");
    }

    const returnedIds = result.data.map((event) => event.id);

    expect(returnedIds).not.toContain(fixtures.draftUpcomingId);
    expect(returnedIds).not.toContain(fixtures.publishedPastId);
  });

  it("returns only free events when freeOnly filter is active", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }

    const anonClient = createAnonClient();
    const result = await listPublishedEvents(anonClient, {
      city: null,
      subgenres: [],
      dateFrom: null,
      dateTo: null,
      freeOnly: true,
    });

    expect(result).toHaveProperty("data");
    if (!("data" in result)) {
      throw new Error("Expected published events data");
    }

    const returnedIds = result.data.map((event) => event.id);

    expect(returnedIds).toContain(fixtures.publishedUpcomingIds[0]);
    expect(returnedIds).not.toContain(fixtures.publishedUpcomingIds[1]);
    expect(result.data.every((event) => event.isFree)).toBe(true);
  });
});

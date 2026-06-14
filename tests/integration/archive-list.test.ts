import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listArchivedEvents } from "@/lib/services/events";
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

describe.skipIf(!runIntegration)("listArchivedEvents fan read (anon)", () => {
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

  it("returns published-past fixture row", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }

    const anonClient = createAnonClient();
    const result = await listArchivedEvents(anonClient);

    expect(result).toHaveProperty("data");
    if (!("data" in result)) {
      throw new Error("Expected archived events data");
    }

    const returnedIds = result.data.map((event) => event.id);
    expect(returnedIds).toContain(fixtures.publishedPastId);
  });

  it("excludes upcoming published and draft rows", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }

    const anonClient = createAnonClient();
    const result = await listArchivedEvents(anonClient);

    expect(result).toHaveProperty("data");
    if (!("data" in result)) {
      throw new Error("Expected archived events data");
    }

    const returnedIds = result.data.map((event) => event.id);

    for (const upcomingId of fixtures.publishedUpcomingIds) {
      expect(returnedIds).not.toContain(upcomingId);
    }
    expect(returnedIds).not.toContain(fixtures.draftUpcomingId);
  });
});

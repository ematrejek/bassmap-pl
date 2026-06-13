import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPublishedEventById, listPublishedEvents } from "@/lib/services/events";
import {
  createAnonClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const FIXTURE_PREFIX = "integration-event-cover-read";

interface CoverReadFixtures {
  withCoverId: string;
  withoutCoverId: string;
  allIds: string[];
}

function addDays(from: Date, days: number): string {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

async function insertCoverReadFixtures(client: ReturnType<typeof createServiceClient>): Promise<CoverReadFixtures> {
  const startsAt = addDays(new Date(), 14);

  const baseRow = {
    name: FIXTURE_PREFIX,
    starts_at: startsAt,
    city: "TestCoverRead",
    venue_name: "Test Venue",
    address_street: "Testowa",
    address_number: "1",
    subgenres: ["neurofunk"] as const,
    is_free: true,
    status: "published" as const,
  };

  const insertResponse = await client
    .from("events")
    .insert([
      { ...baseRow, name: `${FIXTURE_PREFIX} with-cover` },
      { ...baseRow, name: `${FIXTURE_PREFIX} without-cover` },
    ])
    .select("id");

  if (insertResponse.error) {
    throw new Error(`Failed to insert cover-read fixtures: ${insertResponse.error.message}`);
  }

  const ids = insertResponse.data.map((row) => row.id as string);
  if (ids.length !== 2) {
    throw new Error(`Expected 2 fixture rows, got ${String(ids.length)}`);
  }

  const [withCoverId, withoutCoverId] = ids;

  const updateResponse = await client
    .from("events")
    .update({
      cover_path: `${withCoverId}/cover.jpg`,
      cover_aspect: "landscape",
    })
    .eq("id", withCoverId);

  if (updateResponse.error) {
    throw new Error(`Failed to set cover_path on fixture: ${updateResponse.error.message}`);
  }

  return { withCoverId, withoutCoverId, allIds: ids };
}

async function deleteCoverReadFixtures(
  client: ReturnType<typeof createServiceClient>,
  fixtures: CoverReadFixtures,
): Promise<void> {
  const response = await client.from("events").delete().in("id", fixtures.allIds);

  if (response.error) {
    throw new Error(`Failed to delete cover-read fixtures: ${response.error.message}`);
  }
}

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

describe.skipIf(!runIntegration)("fan read cover_path (anon)", () => {
  let fixtures: CoverReadFixtures | undefined;

  beforeAll(async () => {
    const serviceClient = createServiceClient();
    fixtures = await insertCoverReadFixtures(serviceClient);
  });

  afterAll(async () => {
    if (!fixtures) {
      return;
    }
    const serviceClient = createServiceClient();
    await deleteCoverReadFixtures(serviceClient, fixtures);
  });

  it("listPublishedEvents returns coverPath and coverAspect when set", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }
    const seeded = fixtures;

    const anonClient = createAnonClient();
    const result = await listPublishedEvents(anonClient);

    expect(result).toHaveProperty("data");
    if (!("data" in result)) {
      throw new Error("Expected published events data");
    }

    const withCover = result.data.find((event) => event.id === seeded.withCoverId);
    expect(withCover).toBeDefined();
    expect(withCover?.coverPath).toBe(`${seeded.withCoverId}/cover.jpg`);
    expect(withCover?.coverAspect).toBe("landscape");
  });

  it("listPublishedEvents returns null cover fields when no cover", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }
    const seeded = fixtures;

    const anonClient = createAnonClient();
    const result = await listPublishedEvents(anonClient);

    expect(result).toHaveProperty("data");
    if (!("data" in result)) {
      throw new Error("Expected published events data");
    }

    const withoutCover = result.data.find((event) => event.id === seeded.withoutCoverId);
    expect(withoutCover).toBeDefined();
    expect(withoutCover?.coverPath).toBeNull();
    expect(withoutCover?.coverAspect).toBeNull();
  });

  it("getPublishedEventById returns coverPath for published event with cover", async () => {
    if (!fixtures) {
      throw new Error("Fixtures not seeded");
    }

    const anonClient = createAnonClient();
    const event = await getPublishedEventById(anonClient, fixtures.withCoverId);

    expect(event).not.toBeNull();
    expect(event?.coverPath).toBe(`${fixtures.withCoverId}/cover.jpg`);
    expect(event?.coverAspect).toBe("landscape");
  });
});

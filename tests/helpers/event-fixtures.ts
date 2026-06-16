import type { SupabaseClient } from "@supabase/supabase-js";
import type { Event } from "@/types";

/** Pełny obiekt Event do testów jednostkowych (mock getEventById itd.). */
export function buildUnitTestEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    name: "Unit Test Event",
    startsAt: "2026-06-20T20:00:00.000Z",
    city: "Warszawa",
    venueName: "Test Venue",
    addressStreet: null,
    addressNumber: null,
    latitude: null,
    longitude: null,
    subgenres: [],
    lineup: null,
    description: null,
    ticketUrl: null,
    isFree: false,
    priceMode: null,
    priceMin: null,
    priceMax: null,
    currency: null,
    status: "pending",
    coverPath: null,
    coverAspect: null,
    descriptionRightsAcceptedAt: null,
    coverSource: null,
    coverDeclarationKind: null,
    coverCopyrightDeclaredAt: null,
    createdBy: "11111111-1111-1111-1111-111111111111",
    createdAt: "2026-06-16T08:00:00.000Z",
    updatedAt: "2026-06-16T08:00:00.000Z",
    ...overrides,
  };
}

export interface FanReadFixtures {
  publishedUpcomingIds: [string, string];
  draftUpcomingId: string;
  publishedPastId: string;
  allIds: string[];
}

const FIXTURE_PREFIX = "integration-fan-read";

function addDays(from: Date, days: number): string {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

interface FixtureInsertRow {
  name: string;
  starts_at: string;
  city: string;
  venue_name: string;
  address_street: string;
  address_number: string;
  subgenres: ["neurofunk"];
  is_free: boolean;
  status: "draft" | "published";
}

function buildRow(label: string, startsAt: string, status: "draft" | "published", isFree = true): FixtureInsertRow {
  return {
    name: `${FIXTURE_PREFIX} ${label}`,
    starts_at: startsAt,
    city: "TestFanRead",
    venue_name: "Test Venue",
    address_street: "Testowa",
    address_number: "1",
    subgenres: ["neurofunk"],
    is_free: isFree,
    status,
  };
}

export async function insertFanReadFixtures(client: SupabaseClient): Promise<FanReadFixtures> {
  const now = new Date();
  const rows = [
    buildRow("published-upcoming-1", addDays(now, 30), "published", true),
    buildRow("published-upcoming-2", addDays(now, 60), "published", false),
    buildRow("draft-upcoming", addDays(now, 45), "draft"),
    buildRow("published-past", addDays(now, -7), "published"),
  ];

  const response = await client.from("events").insert(rows).select("id");

  if (response.error) {
    throw new Error(`Failed to insert fan-read fixtures: ${response.error.message}`);
  }

  const ids = response.data.map((row) => row.id as string);
  if (ids.length !== 4) {
    throw new Error(`Expected 4 fixture rows, got ${String(ids.length)}`);
  }

  const [publishedUpcoming1, publishedUpcoming2, draftUpcoming, publishedPast] = ids;

  return {
    publishedUpcomingIds: [publishedUpcoming1, publishedUpcoming2],
    draftUpcomingId: draftUpcoming,
    publishedPastId: publishedPast,
    allIds: ids,
  };
}

export async function deleteFanReadFixtures(client: SupabaseClient, fixtures: FanReadFixtures): Promise<void> {
  const response = await client.from("events").delete().in("id", fixtures.allIds);

  if (response.error) {
    throw new Error(`Failed to delete fan-read fixtures: ${response.error.message}`);
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";

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

function buildRow(label: string, startsAt: string, status: "draft" | "published"): FixtureInsertRow {
  return {
    name: `${FIXTURE_PREFIX} ${label}`,
    starts_at: startsAt,
    city: "TestFanRead",
    venue_name: "Test Venue",
    address_street: "Testowa",
    address_number: "1",
    subgenres: ["neurofunk"],
    is_free: true,
    status,
  };
}

export async function insertFanReadFixtures(client: SupabaseClient): Promise<FanReadFixtures> {
  const now = new Date();
  const rows = [
    buildRow("published-upcoming-1", addDays(now, 30), "published"),
    buildRow("published-upcoming-2", addDays(now, 60), "published"),
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

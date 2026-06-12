import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedEventCreate } from "@/lib/events/schema";

type CoordinatesEventCreate = Extract<ParsedEventCreate, { locationMode: "coordinates" }>;

const MUTATION_PREFIX = "integration-auth-mutation";

function futureStartsAtLocal(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}T20:00`;
}

function futureStartsAtIso(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString();
}

export function buildMutationCreatePayload(label = "create"): CoordinatesEventCreate {
  return {
    locationMode: "coordinates",
    latitude: 52.2297,
    longitude: 21.0122,
    name: `${MUTATION_PREFIX} ${label}`,
    startsAt: futureStartsAtLocal(30),
    city: "TestMutation",
    venueName: "Test Venue",
    subgenres: ["neurofunk"],
    isFree: true,
    lineup: null,
    ticketUrl: null,
    price: null,
    addressStreet: null,
    addressNumber: null,
  };
}

export async function countEvents(client: SupabaseClient): Promise<number> {
  const response = await client.from("events").select("id", { count: "exact", head: true });

  if (response.error) {
    throw new Error(`Failed to count events: ${response.error.message}`);
  }

  return response.count ?? 0;
}

export async function insertMutationFixtureRow(client: SupabaseClient, label = "fixture"): Promise<{ id: string }> {
  const response = await client
    .from("events")
    .insert({
      name: `${MUTATION_PREFIX} ${label}`,
      starts_at: futureStartsAtIso(45),
      city: "TestMutation",
      venue_name: "Test Venue",
      address_street: "Testowa",
      address_number: "1",
      latitude: 52.2297,
      longitude: 21.0122,
      subgenres: ["neurofunk"],
      is_free: true,
      status: "draft",
    })
    .select("id")
    .single();

  if (response.error) {
    throw new Error(`Failed to insert mutation fixture: ${response.error.message}`);
  }

  return { id: response.data.id as string };
}

export async function deleteMutationFixtureIds(client: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const response = await client.from("events").delete().in("id", ids);

  if (response.error) {
    throw new Error(`Failed to delete mutation fixtures: ${response.error.message}`);
  }
}

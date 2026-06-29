import type { SupabaseClient } from "@supabase/supabase-js";

function futureStartsAtIso(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString();
}

export interface LegacySubgenreEventFixture {
  id: string;
  name: string;
}

/** Published event with legacy + active tags – for badge/filter E2E. */
export async function insertLegacySubgenreEvent(client: SupabaseClient): Promise<LegacySubgenreEventFixture> {
  const name = `e2e-legacy-subgenre-${String(Date.now())}`;
  const response = await client
    .from("events")
    .insert({
      name,
      starts_at: futureStartsAtIso(40),
      city: `E2E Legacy ${String(Date.now())}`,
      venue_name: "E2E Legacy Venue",
      address_street: "Testowa",
      address_number: "1",
      latitude: 52.2297,
      longitude: 21.0122,
      subgenres: ["halftime", "neurofunk"],
      is_free: true,
      status: "published",
    })
    .select("id")
    .single();

  if (response.error) {
    throw new Error(`Failed to insert legacy subgenre event: ${response.error.message}`);
  }

  return { id: response.data.id as string, name };
}

export async function deleteLegacySubgenreEvent(client: SupabaseClient, id: string): Promise<void> {
  const response = await client.from("events").delete().eq("id", id);
  if (response.error) {
    throw new Error(`Failed to delete legacy subgenre event: ${response.error.message}`);
  }
}

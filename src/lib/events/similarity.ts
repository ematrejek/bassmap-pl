import type { SupabaseClient } from "@supabase/supabase-js";
import { isWithinCoordProximity, normalizeAddressParts, normalizeVenueName } from "@/lib/events/address-normalize";
import { parseDatetimeLocalWarsaw } from "@/lib/events/format";
import type { ParsedEventCreate } from "@/lib/events/schema";

type ServiceResult<T> = { data: T } | { error: string };

export interface SimilarEventMatch {
  id: string;
  name: string;
  startsAt: string;
  city: string;
  similarityScore: number;
}

export interface SimilarEventCandidate {
  id: string;
  name: string;
  startsAt: string;
  city: string;
  venueName: string;
  addressStreet: string | null;
  addressNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  similarityScore: number;
}

interface SimilarEventCandidateRow {
  id: string;
  name: string;
  starts_at: string;
  city: string;
  venue_name: string;
  address_street: string | null;
  address_number: string | null;
  latitude: number | null;
  longitude: number | null;
  similarity_score: number;
}

export interface FindSimilarEventsOptions {
  excludeEventId?: string;
  excludeCreatedBy?: string;
}

function candidateHasAddress(candidate: SimilarEventCandidate): boolean {
  return Boolean(candidate.addressStreet?.trim() && candidate.addressNumber?.trim());
}

function candidateHasCoordinates(candidate: SimilarEventCandidate): boolean {
  return candidate.latitude !== null && candidate.longitude !== null;
}

function mapCandidateRow(row: SimilarEventCandidateRow): SimilarEventCandidate {
  return {
    id: row.id,
    name: row.name,
    startsAt: row.starts_at,
    city: row.city,
    venueName: row.venue_name,
    addressStreet: row.address_street,
    addressNumber: row.address_number,
    latitude: row.latitude,
    longitude: row.longitude,
    similarityScore: row.similarity_score,
  };
}

/** Post-filter: same location by address, coordinates, or venue name (mixed modes). */
export function locationMatches(input: ParsedEventCreate, candidate: SimilarEventCandidate): boolean {
  if (input.locationMode === "address" && candidateHasAddress(candidate)) {
    return (
      normalizeAddressParts(input.addressStreet, input.addressNumber) ===
      normalizeAddressParts(candidate.addressStreet ?? "", candidate.addressNumber ?? "")
    );
  }

  if (input.locationMode === "coordinates" && candidateHasCoordinates(candidate)) {
    return isWithinCoordProximity(input.latitude, input.longitude, candidate.latitude ?? 0, candidate.longitude ?? 0);
  }

  return normalizeVenueName(input.venueName) === normalizeVenueName(candidate.venueName);
}

export async function findSimilarEvents(
  supabase: SupabaseClient,
  input: ParsedEventCreate,
  options: FindSimilarEventsOptions = {},
): Promise<ServiceResult<SimilarEventMatch[]>> {
  const startsAtIso = parseDatetimeLocalWarsaw(input.startsAt);
  if (!startsAtIso) {
    return { error: "Nieprawidłowa data i godzina" };
  }

  const response = await supabase.rpc("find_similar_event_candidates", {
    p_name: input.name,
    p_city: input.city,
    p_starts_at: startsAtIso,
    p_exclude_event_id: options.excludeEventId ?? null,
    p_exclude_created_by: options.excludeCreatedBy ?? null,
  });

  if (response.error) {
    return { error: response.error.message };
  }

  const rows = (response.data as SimilarEventCandidateRow[] | null) ?? [];
  const candidates = rows.map(mapCandidateRow);

  const matches = candidates
    .filter((candidate) => locationMatches(input, candidate))
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      startsAt: candidate.startsAt,
      city: candidate.city,
      similarityScore: candidate.similarityScore,
    }));

  return { data: matches };
}

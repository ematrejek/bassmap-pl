import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeAddress } from "@/lib/geocoding/nominatim";
import type { FanEventFilters } from "@/lib/events/fan-schema";
import { resolvePublishedDateBounds } from "@/lib/events/date-range";
import { getStartOfTodayWarsawUtcIso, parseDatetimeLocalWarsaw } from "@/lib/events/format";
import { mapEventRow, toEventInsertRow, toEventUpdateRow, type EventRow } from "@/lib/events/mapper";
import { clearStructuredPriceFields } from "@/lib/events/price";
import type { ParsedEventCreate, ParsedEventUpdate } from "@/lib/events/schema";
import { EVENT_COVERS_BUCKET } from "@/lib/storage/event-covers";
import type { Event, EventInsert } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

function isStartsAtError(value: string | { error: string }): value is { error: string } {
  return typeof value !== "string";
}

function mapSupabaseError(message: string): string {
  if (message.includes("events_subgenres_min_one")) {
    return "Wybierz co najmniej jeden podgatunek";
  }
  if (message.includes("events_coordinates_both_or_neither")) {
    return "Podaj obie współrzędne lub żadnej";
  }
  if (message.includes("events_cover_path_format")) {
    return "Nieprawidłowa ścieżka okładki";
  }
  if (message.includes("events_cover_aspect")) {
    return "Nieprawidłowy format okładki";
  }
  return "Nie udało się zapisać wydarzenia";
}

export async function removeEventCoverFromStorage(
  supabase: SupabaseClient,
  coverPath: string,
): Promise<{ error: string } | null> {
  const { error } = await supabase.storage.from(EVENT_COVERS_BUCKET).remove([coverPath]);
  if (!error) {
    return null;
  }

  const message = error.message.toLowerCase();
  if (message.includes("not found") || message.includes("object not found")) {
    return null;
  }

  return { error: error.message };
}

function toStoredStartsAt(startsAt: string): string | { error: string } {
  const iso = parseDatetimeLocalWarsaw(startsAt);
  if (!iso) {
    return { error: "Nieprawidłowa data i godzina" };
  }
  return iso;
}

function inferLocationMode(event: Event): "address" | "coordinates" {
  if (event.addressStreet === null && event.addressNumber === null) {
    return "coordinates";
  }
  return "address";
}

function addressFieldsChanged(existing: Event, update: ParsedEventUpdate): boolean {
  if (update.city !== undefined && update.city !== existing.city) return true;
  if (update.addressStreet !== undefined && update.addressStreet !== existing.addressStreet) {
    return true;
  }
  if (update.addressNumber !== undefined && update.addressNumber !== existing.addressNumber) {
    return true;
  }
  if (update.venueName !== undefined && update.venueName !== existing.venueName) return true;
  return false;
}

interface CoordinateInput {
  locationMode: "address" | "coordinates";
  addressStreet?: string | null;
  addressNumber?: string | null;
  city?: string;
  venueName?: string;
  latitude?: number;
  longitude?: number;
}

export async function resolveCoordinates(
  parsed: CoordinateInput,
  addressContext?: {
    addressStreet: string;
    addressNumber: string;
    city: string;
    venueName: string;
  },
): Promise<{ latitude: number; longitude: number } | { error: string }> {
  if (parsed.locationMode === "coordinates") {
    const { latitude, longitude } = parsed;
    if (latitude === undefined || longitude === undefined) {
      return { error: "Szerokość i długość geograficzna są wymagane" };
    }
    return { latitude, longitude };
  }

  const street = parsed.addressStreet ?? addressContext?.addressStreet;
  const number = parsed.addressNumber ?? addressContext?.addressNumber;
  const city = parsed.city ?? addressContext?.city;
  const venueName = parsed.venueName ?? addressContext?.venueName;

  if (!street || !number || !city) {
    return { error: "Ulica, numer i miasto są wymagane w trybie adresowym" };
  }

  return geocodeAddress({
    addressStreet: street,
    addressNumber: number,
    city,
    venueName,
  });
}

export async function listEventsForAdmin(supabase: SupabaseClient): Promise<ServiceResult<Event[]>> {
  const response = await supabase.from("events").select("*").order("starts_at", { ascending: true });

  if (response.error) {
    return { error: "Nie udało się załadować listy wydarzeń" };
  }

  return { data: (response.data as EventRow[]).map(mapEventRow) };
}

export async function getEventById(supabase: SupabaseClient, id: string): Promise<Event | null> {
  const response = await supabase.from("events").select("*").eq("id", id).maybeSingle();

  if (response.error) {
    return null;
  }

  const row = response.data as EventRow | null;
  if (!row) {
    return null;
  }

  return mapEventRow(row);
}

export async function listPublishedEvents(
  supabase: SupabaseClient,
  filters?: FanEventFilters,
): Promise<ServiceResult<Event[]>> {
  const { gte, lt } = resolvePublishedDateBounds(filters ?? { dateFrom: null, dateTo: null });

  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("starts_at", gte)
    .order("starts_at", { ascending: true });

  if (lt) {
    query = query.lt("starts_at", lt);
  }

  if (filters?.city) {
    query = query.eq("city", filters.city);
  }

  if (filters && filters.subgenres.length > 0) {
    const orConditions = filters.subgenres.map((subgenre) => `subgenres.cs.{${subgenre}}`).join(",");
    query = query.or(orConditions);
  }

  if (filters?.freeOnly) {
    query = query.eq("is_free", true);
  }

  const response = await query;

  if (response.error) {
    return { error: "Nie udało się załadować wydarzeń" };
  }

  return { data: (response.data as EventRow[]).map(mapEventRow) };
}

export async function listDistinctCities(supabase: SupabaseClient): Promise<ServiceResult<string[]>> {
  const response = await supabase
    .from("events")
    .select("city")
    .eq("status", "published")
    .gte("starts_at", getStartOfTodayWarsawUtcIso())
    .order("city");

  if (response.error) {
    return { error: "Nie udało się załadować listy miast" };
  }

  const rows = response.data as { city: string }[];
  const unique = [...new Set(rows.map((row) => row.city))];
  unique.sort((a, b) => a.localeCompare(b, "pl"));

  return { data: unique };
}

const ARCHIVE_LIST_LIMIT = 200;

export async function listArchivedEvents(
  supabase: SupabaseClient,
  limit = ARCHIVE_LIST_LIMIT,
): Promise<ServiceResult<Event[]>> {
  const todayStart = getStartOfTodayWarsawUtcIso();
  const response = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .lt("starts_at", todayStart)
    .order("starts_at", { ascending: false })
    .limit(limit);

  if (response.error) {
    return { error: "Nie udało się załadować archiwum wydarzeń" };
  }

  return { data: (response.data as EventRow[]).map(mapEventRow) };
}

/** Upcoming or archived published event visible to fans (RLS + status filter). */
export async function getPublishedEventById(supabase: SupabaseClient, id: string): Promise<Event | null> {
  const response = await supabase.from("events").select("*").eq("id", id).eq("status", "published").maybeSingle();

  if (response.error) {
    return null;
  }

  const row = response.data as EventRow | null;
  if (!row) {
    return null;
  }

  return mapEventRow(row);
}

function applyParsedPriceFields(
  target: Partial<EventInsert>,
  parsed: Pick<ParsedEventCreate | ParsedEventUpdate, "isFree" | "priceMode" | "priceMin" | "priceMax" | "currency">,
): void {
  if (parsed.isFree === true) {
    Object.assign(target, clearStructuredPriceFields());
    target.isFree = true;
    return;
  }

  if (parsed.isFree !== undefined) {
    target.isFree = parsed.isFree;
  }

  if (parsed.priceMode !== undefined) target.priceMode = parsed.priceMode;
  if (parsed.priceMin !== undefined) target.priceMin = parsed.priceMin;
  if (parsed.priceMax !== undefined) target.priceMax = parsed.priceMax;
  if (parsed.currency !== undefined) target.currency = parsed.currency;
}

function parsedCreateToInsert(
  parsed: ParsedEventCreate,
  coords: { latitude: number; longitude: number },
  startsAtIso: string,
): EventInsert {
  const base: EventInsert = {
    name: parsed.name,
    startsAt: startsAtIso,
    city: parsed.city,
    venueName: parsed.venueName,
    addressStreet: null,
    addressNumber: null,
    subgenres: parsed.subgenres,
    lineup: parsed.lineup ?? null,
    description: parsed.description ?? null,
    ticketUrl: parsed.ticketUrl ?? null,
    status: "published",
    latitude: coords.latitude,
    longitude: coords.longitude,
  };

  applyParsedPriceFields(base, parsed);

  if (parsed.locationMode === "address") {
    return {
      ...base,
      addressStreet: parsed.addressStreet,
      addressNumber: parsed.addressNumber,
    };
  }

  return {
    ...base,
    addressStreet: null,
    addressNumber: null,
  };
}

export async function createEvent(supabase: SupabaseClient, parsed: ParsedEventCreate): Promise<ServiceResult<Event>> {
  const startsAt = toStoredStartsAt(parsed.startsAt);
  if (isStartsAtError(startsAt)) {
    return { error: startsAt.error };
  }

  const coords = await resolveCoordinates(parsed);
  if ("error" in coords) {
    return { error: coords.error };
  }

  const insert = toEventInsertRow(parsedCreateToInsert(parsed, coords, startsAt));
  const response = await supabase.from("events").insert(insert).select("*").single();

  if (response.error) {
    return { error: mapSupabaseError(response.error.message) };
  }

  return { data: mapEventRow(response.data as EventRow) };
}

export async function updateEvent(
  supabase: SupabaseClient,
  id: string,
  parsed: ParsedEventUpdate,
): Promise<ServiceResult<Event>> {
  const existing = await getEventById(supabase, id);
  if (!existing) {
    return { error: "Nie znaleziono wydarzenia" };
  }

  const locationMode = parsed.locationMode ?? inferLocationMode(existing);
  const patch: Partial<EventInsert> = {};

  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.startsAt !== undefined) {
    const startsAt = toStoredStartsAt(parsed.startsAt);
    if (isStartsAtError(startsAt)) {
      return { error: startsAt.error };
    }
    patch.startsAt = startsAt;
  }
  if (parsed.city !== undefined) patch.city = parsed.city;
  if (parsed.venueName !== undefined) patch.venueName = parsed.venueName;
  if (parsed.subgenres !== undefined) patch.subgenres = parsed.subgenres;
  if (parsed.lineup !== undefined) patch.lineup = parsed.lineup;
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.ticketUrl !== undefined) patch.ticketUrl = parsed.ticketUrl;
  applyParsedPriceFields(patch, parsed);

  let coverPathToRemoveAfterUpdate: string | null = null;

  if (parsed.coverPath !== undefined) {
    const clearingCover = parsed.coverPath === null && existing.coverPath !== null;
    const replacingCover =
      parsed.coverPath !== null && existing.coverPath !== null && parsed.coverPath !== existing.coverPath;

    if (clearingCover || replacingCover) {
      coverPathToRemoveAfterUpdate = existing.coverPath;
    }
    patch.coverPath = parsed.coverPath;
    if (parsed.coverPath === null) {
      patch.coverAspect = null;
    }
  }

  if (parsed.coverAspect !== undefined) {
    patch.coverAspect = parsed.coverAspect;
  }

  if (locationMode === "coordinates") {
    if (parsed.addressStreet !== undefined) patch.addressStreet = null;
    if (parsed.addressNumber !== undefined) patch.addressNumber = null;
    if (parsed.locationMode === "coordinates") {
      patch.addressStreet = null;
      patch.addressNumber = null;
    }

    if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
      patch.latitude = parsed.latitude;
      patch.longitude = parsed.longitude;
    } else if (parsed.locationMode === "coordinates") {
      return { error: "Szerokość i długość geograficzna są wymagane" };
    }
  } else {
    if (parsed.addressStreet !== undefined) patch.addressStreet = parsed.addressStreet;
    if (parsed.addressNumber !== undefined) patch.addressNumber = parsed.addressNumber;

    const switchedToAddress = parsed.locationMode === "address" && inferLocationMode(existing) === "coordinates";
    const shouldRegeocode = switchedToAddress || addressFieldsChanged(existing, parsed);

    if (shouldRegeocode) {
      const coords = await resolveCoordinates(
        { ...parsed, locationMode: "address" },
        {
          addressStreet: patch.addressStreet ?? existing.addressStreet ?? "",
          addressNumber: patch.addressNumber ?? existing.addressNumber ?? "",
          city: patch.city ?? existing.city,
          venueName: patch.venueName ?? existing.venueName,
        },
      );

      if ("error" in coords) {
        return { error: coords.error };
      }

      patch.latitude = coords.latitude;
      patch.longitude = coords.longitude;
    }
  }

  const updateRow = toEventUpdateRow(patch);
  if (Object.keys(updateRow).length === 0) {
    return { data: existing };
  }

  const response = await supabase.from("events").update(updateRow).eq("id", id).select("*").single();

  if (response.error) {
    return { error: mapSupabaseError(response.error.message) };
  }

  if (coverPathToRemoveAfterUpdate !== null) {
    await removeEventCoverFromStorage(supabase, coverPathToRemoveAfterUpdate);
  }

  return { data: mapEventRow(response.data as EventRow) };
}

export async function deleteEvent(
  supabase: SupabaseClient,
  id: string,
): Promise<{ success: true } | { error: string }> {
  const existing = await getEventById(supabase, id);
  if (!existing) {
    return { error: "Nie znaleziono wydarzenia" };
  }

  if (existing.coverPath !== null) {
    await removeEventCoverFromStorage(supabase, existing.coverPath);
  }

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    return { error: "Nie udało się usunąć wydarzenia" };
  }

  return { success: true };
}

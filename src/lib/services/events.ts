import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeAddress } from "@/lib/geocoding/nominatim";
import { mapEventRow, toEventInsertRow, toEventUpdateRow, type EventRow } from "@/lib/events/mapper";
import type { ParsedEventCreate, ParsedEventUpdate } from "@/lib/events/schema";
import type { Event, EventInsert } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

function mapSupabaseError(message: string): string {
  if (message.includes("events_subgenres_min_one")) {
    return "Wybierz co najmniej jeden podgatunek";
  }
  if (message.includes("events_coordinates_both_or_neither")) {
    return "Podaj obie współrzędne lub żadnej";
  }
  return "Nie udało się zapisać wydarzenia";
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

export async function listEventsForAdmin(supabase: SupabaseClient): Promise<Event[]> {
  const response = await supabase.from("events").select("*").order("starts_at", { ascending: true });

  if (response.error) {
    return [];
  }

  return (response.data as EventRow[]).map(mapEventRow);
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

function parsedCreateToInsert(parsed: ParsedEventCreate, coords: { latitude: number; longitude: number }): EventInsert {
  const base: EventInsert = {
    name: parsed.name,
    startsAt: new Date(parsed.startsAt).toISOString(),
    city: parsed.city,
    venueName: parsed.venueName,
    subgenres: parsed.subgenres,
    lineup: parsed.lineup ?? null,
    ticketUrl: parsed.ticketUrl ?? null,
    isFree: parsed.isFree,
    price: parsed.price ?? null,
    status: "published",
    latitude: coords.latitude,
    longitude: coords.longitude,
  };

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
  const coords = await resolveCoordinates(parsed);
  if ("error" in coords) {
    return { error: coords.error };
  }

  const insert = toEventInsertRow(parsedCreateToInsert(parsed, coords));
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
  if (parsed.startsAt !== undefined) patch.startsAt = new Date(parsed.startsAt).toISOString();
  if (parsed.city !== undefined) patch.city = parsed.city;
  if (parsed.venueName !== undefined) patch.venueName = parsed.venueName;
  if (parsed.subgenres !== undefined) patch.subgenres = parsed.subgenres;
  if (parsed.lineup !== undefined) patch.lineup = parsed.lineup;
  if (parsed.ticketUrl !== undefined) patch.ticketUrl = parsed.ticketUrl;
  if (parsed.isFree !== undefined) patch.isFree = parsed.isFree;
  if (parsed.price !== undefined) patch.price = parsed.price;

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

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    return { error: "Nie udało się usunąć wydarzenia" };
  }

  return { success: true };
}

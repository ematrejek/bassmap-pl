import type { CoverAspect, Event, EventInsert, EventStatus, Subgenre } from "@/types";

export interface EventRow {
  id: string;
  name: string;
  starts_at: string;
  city: string;
  venue_name: string;
  address_street: string | null;
  address_number: string | null;
  latitude: number | null;
  longitude: number | null;
  subgenres: Subgenre[];
  lineup: string[] | null;
  ticket_url: string | null;
  is_free: boolean;
  price: string | null;
  status: EventStatus;
  cover_path: string | null;
  cover_aspect: CoverAspect | null;
  created_at: string;
  updated_at: string;
}

export function mapEventRow(row: EventRow): Event {
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
    subgenres: row.subgenres,
    lineup: row.lineup,
    ticketUrl: row.ticket_url,
    isFree: row.is_free,
    price: row.price,
    status: row.status,
    coverPath: row.cover_path,
    coverAspect: row.cover_aspect,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toEventInsertRow(input: EventInsert): Record<string, unknown> {
  return {
    name: input.name,
    starts_at: input.startsAt,
    city: input.city,
    venue_name: input.venueName,
    address_street: input.addressStreet ?? null,
    address_number: input.addressNumber ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    subgenres: input.subgenres,
    lineup: input.lineup ?? null,
    ticket_url: input.ticketUrl ?? null,
    is_free: input.isFree ?? false,
    price: input.price ?? null,
    status: input.status ?? "published",
    cover_path: input.coverPath ?? null,
    cover_aspect: input.coverAspect ?? null,
  };
}

export function toEventUpdateRow(input: Partial<EventInsert>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (input.name !== undefined) row.name = input.name;
  if (input.startsAt !== undefined) row.starts_at = input.startsAt;
  if (input.city !== undefined) row.city = input.city;
  if (input.venueName !== undefined) row.venue_name = input.venueName;
  if (input.addressStreet !== undefined) row.address_street = input.addressStreet;
  if (input.addressNumber !== undefined) row.address_number = input.addressNumber;
  if (input.latitude !== undefined) row.latitude = input.latitude;
  if (input.longitude !== undefined) row.longitude = input.longitude;
  if (input.subgenres !== undefined) row.subgenres = input.subgenres;
  if (input.lineup !== undefined) row.lineup = input.lineup;
  if (input.ticketUrl !== undefined) row.ticket_url = input.ticketUrl;
  if (input.isFree !== undefined) row.is_free = input.isFree;
  if (input.price !== undefined) row.price = input.price;
  if (input.status !== undefined) row.status = input.status;
  if (input.coverPath !== undefined) row.cover_path = input.coverPath;
  if (input.coverAspect !== undefined) row.cover_aspect = input.coverAspect;

  return row;
}

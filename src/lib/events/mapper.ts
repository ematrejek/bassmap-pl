import type {
  CoverAspect,
  CoverDeclarationKind,
  CoverSource,
  Event,
  EventCurrency,
  EventInsert,
  EventPriceMode,
  EventStatus,
  Subgenre,
} from "@/types";

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
  description: string | null;
  ticket_url: string | null;
  is_free: boolean;
  price_mode: EventPriceMode | null;
  price_min: number | string | null;
  price_max: number | string | null;
  currency: EventCurrency | null;
  status: EventStatus;
  cover_path: string | null;
  cover_aspect: CoverAspect | null;
  description_rights_accepted_at: string | null;
  cover_source: CoverSource | null;
  cover_declaration_kind: CoverDeclarationKind | null;
  cover_copyright_declared_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }
  return typeof value === "number" ? value : Number(value);
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
    description: row.description,
    ticketUrl: row.ticket_url,
    isFree: row.is_free,
    priceMode: row.price_mode,
    priceMin: toNumberOrNull(row.price_min),
    priceMax: toNumberOrNull(row.price_max),
    currency: row.currency,
    status: row.status,
    coverPath: row.cover_path,
    coverAspect: row.cover_aspect,
    descriptionRightsAcceptedAt: row.description_rights_accepted_at,
    coverSource: row.cover_source,
    coverDeclarationKind: row.cover_declaration_kind,
    coverCopyrightDeclaredAt: row.cover_copyright_declared_at,
    createdBy: row.created_by,
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
    description: input.description ?? null,
    ticket_url: input.ticketUrl ?? null,
    is_free: input.isFree ?? false,
    price_mode: input.priceMode ?? null,
    price_min: input.priceMin ?? null,
    price_max: input.priceMax ?? null,
    currency: input.currency ?? null,
    status: input.status ?? "published",
    cover_path: input.coverPath ?? null,
    cover_aspect: input.coverAspect ?? null,
    description_rights_accepted_at: input.descriptionRightsAcceptedAt ?? null,
    cover_source: input.coverSource ?? null,
    cover_declaration_kind: input.coverDeclarationKind ?? null,
    cover_copyright_declared_at: input.coverCopyrightDeclaredAt ?? null,
    ...(input.createdBy !== undefined ? { created_by: input.createdBy } : {}),
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
  if (input.description !== undefined) row.description = input.description;
  if (input.ticketUrl !== undefined) row.ticket_url = input.ticketUrl;
  if (input.isFree !== undefined) row.is_free = input.isFree;
  if (input.priceMode !== undefined) row.price_mode = input.priceMode;
  if (input.priceMin !== undefined) row.price_min = input.priceMin;
  if (input.priceMax !== undefined) row.price_max = input.priceMax;
  if (input.currency !== undefined) row.currency = input.currency;
  if (input.status !== undefined) row.status = input.status;
  if (input.coverPath !== undefined) row.cover_path = input.coverPath;
  if (input.coverAspect !== undefined) row.cover_aspect = input.coverAspect;
  if (input.descriptionRightsAcceptedAt !== undefined) {
    row.description_rights_accepted_at = input.descriptionRightsAcceptedAt;
  }
  if (input.coverSource !== undefined) row.cover_source = input.coverSource;
  if (input.coverDeclarationKind !== undefined) row.cover_declaration_kind = input.coverDeclarationKind;
  if (input.coverCopyrightDeclaredAt !== undefined) row.cover_copyright_declared_at = input.coverCopyrightDeclaredAt;

  return row;
}

import { COORD_PROXIMITY_METERS } from "@/lib/events/similarity-constants";

const WHITESPACE_RE = /\s+/g;
const DIACRITICS_RE = /[\u0300-\u036f]/g;

function collapseWhitespace(value: string): string {
  return value.trim().replace(WHITESPACE_RE, " ");
}

function removeDiacritics(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_RE, "");
}

function normalizeToken(value: string): string {
  return removeDiacritics(collapseWhitespace(value).toLowerCase());
}

/** Normalize street + number for duplicate location comparison. */
export function normalizeAddressParts(street: string, number: string): string {
  return normalizeToken(`${street} ${number}`);
}

/** Normalize venue name for mixed address/coordinates mode comparison. */
export function normalizeVenueName(venueName: string): string {
  return normalizeToken(venueName);
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two WGS-84 points in meters. */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function isWithinCoordProximity(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  maxMeters: number = COORD_PROXIMITY_METERS,
): boolean {
  return haversineMeters(lat1, lon1, lat2, lon2) <= maxMeters;
}

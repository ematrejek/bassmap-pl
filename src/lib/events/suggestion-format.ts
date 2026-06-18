import { formatEventDate, formatEventPrice, parseDatetimeLocalWarsaw } from "@/lib/events/format";
import type { ChangeSuggestionPayload, ChangeSuggestionSource, Event } from "@/types";

export const CHANGE_SUGGESTION_SOURCE_LABELS: Record<ChangeSuggestionSource, string> = {
  duplicate_flow: "Duplikat",
  event_page: "Strona wydarzenia",
};

export type SuggestionEventSnapshot = Pick<
  Event,
  | "startsAt"
  | "city"
  | "venueName"
  | "addressStreet"
  | "addressNumber"
  | "latitude"
  | "longitude"
  | "description"
  | "lineup"
  | "ticketUrl"
  | "isFree"
  | "priceMode"
  | "priceMin"
  | "priceMax"
  | "currency"
>;

export interface SuggestionReviewRow {
  label: string;
  current: string;
  proposed: string;
}

const PAYLOAD_FIELD_LABELS: Partial<Record<keyof ChangeSuggestionPayload, string>> = {
  startsAt: "data",
  city: "miasto",
  venueName: "miejsce",
  locationMode: "lokalizacja",
  addressStreet: "adres",
  addressNumber: "adres",
  latitude: "współrzędne",
  longitude: "współrzędne",
  description: "opis",
  lineup: "lineup",
  ticketUrl: "bilety",
  isFree: "cena",
  priceMode: "cena",
  priceMin: "cena",
  priceMax: "cena",
  currency: "cena",
};

const ADMIN_REVIEW_FIELD_LABELS: Partial<Record<keyof ChangeSuggestionPayload, string>> = {
  startsAt: "Data rozpoczęcia",
  city: "Miasto",
  venueName: "Miejsce / lokalizacja",
  addressStreet: "Ulica",
  addressNumber: "Numer budynku",
  latitude: "Szerokość geograficzna",
  longitude: "Długość geograficzna",
  description: "Opis",
  lineup: "Line-up",
  ticketUrl: "Link do biletów",
};

const REVIEW_FIELD_ORDER: (keyof ChangeSuggestionPayload)[] = [
  "startsAt",
  "city",
  "venueName",
  "addressStreet",
  "addressNumber",
  "latitude",
  "longitude",
  "description",
  "lineup",
  "ticketUrl",
];

const PRICE_PAYLOAD_KEYS: (keyof ChangeSuggestionPayload)[] = [
  "isFree",
  "priceMode",
  "priceMin",
  "priceMax",
  "currency",
];

function collectPayloadFieldLabels(payload: ChangeSuggestionPayload): string[] {
  const labels = new Set<string>();

  for (const key of Object.keys(payload) as (keyof ChangeSuggestionPayload)[]) {
    if (payload[key] !== undefined) {
      const label = PAYLOAD_FIELD_LABELS[key];
      if (label) {
        labels.add(label);
      }
    }
  }

  return [...labels];
}

export interface SuggestionSummaryInput {
  body: string | null;
  payload: ChangeSuggestionPayload | null;
}

export function formatSuggestionSummary(input: SuggestionSummaryInput): string {
  if (input.payload) {
    const labels = collectPayloadFieldLabels(input.payload);
    if (labels.length === 0) {
      const comment = input.body?.trim();
      return comment ?? "Sugestia ze strony wydarzenia";
    }
    if (labels.length <= 3) {
      return labels.join(", ");
    }
    return `${String(labels.length)} pola: ${labels.slice(0, 3).join(", ")}`;
  }

  return input.body?.trim() ?? "";
}

export function pickSuggestionEventSnapshot(event: Event): SuggestionEventSnapshot {
  return {
    startsAt: event.startsAt,
    city: event.city,
    venueName: event.venueName,
    addressStreet: event.addressStreet,
    addressNumber: event.addressNumber,
    latitude: event.latitude,
    longitude: event.longitude,
    description: event.description,
    lineup: event.lineup,
    ticketUrl: event.ticketUrl,
    isFree: event.isFree,
    priceMode: event.priceMode,
    priceMin: event.priceMin,
    priceMax: event.priceMax,
    currency: event.currency,
  };
}

function displayText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "–";
  }
  return trimmed;
}

function formatLineupValue(lineup: string[] | null | undefined): string {
  if (!lineup || lineup.length === 0) {
    return "–";
  }
  return lineup.join(", ");
}

function formatStartsAtValue(value: string): string {
  const iso =
    value.includes("T") && !value.endsWith("Z") && !value.includes("+") ? parseDatetimeLocalWarsaw(value) : value;
  return iso ? formatEventDate(iso) : value;
}

function formatPriceSnapshot(snapshot: SuggestionEventSnapshot): string {
  return formatEventPrice(snapshot);
}

function mergePriceSnapshot(event: SuggestionEventSnapshot, payload: ChangeSuggestionPayload): SuggestionEventSnapshot {
  return {
    ...event,
    isFree: payload.isFree ?? event.isFree,
    priceMode: payload.priceMode !== undefined ? payload.priceMode : event.priceMode,
    priceMin: payload.priceMin !== undefined ? payload.priceMin : event.priceMin,
    priceMax: payload.priceMax !== undefined ? payload.priceMax : event.priceMax,
    currency: payload.currency !== undefined ? payload.currency : event.currency,
  };
}

function formatPayloadFieldValue(key: keyof ChangeSuggestionPayload, value: unknown): string {
  if (value === null || value === undefined) {
    return "–";
  }

  if (key === "startsAt" && typeof value === "string") {
    return formatStartsAtValue(value);
  }

  if (key === "lineup" && Array.isArray(value)) {
    return formatLineupValue(value as string[]);
  }

  if (typeof value === "boolean") {
    return value ? "tak" : "nie";
  }

  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  return "–";
}

function formatCurrentFieldValue(key: keyof ChangeSuggestionPayload, event: SuggestionEventSnapshot): string {
  switch (key) {
    case "startsAt":
      return formatEventDate(event.startsAt);
    case "lineup":
      return formatLineupValue(event.lineup);
    case "ticketUrl":
      return displayText(event.ticketUrl);
    case "description":
      return displayText(event.description);
    case "latitude":
      return event.latitude !== null ? String(event.latitude) : "–";
    case "longitude":
      return event.longitude !== null ? String(event.longitude) : "–";
    case "addressStreet":
      return displayText(event.addressStreet);
    case "addressNumber":
      return displayText(event.addressNumber);
    case "city":
      return displayText(event.city);
    case "venueName":
      return displayText(event.venueName);
    default:
      return "–";
  }
}

export function buildSuggestionReviewRows(
  payload: ChangeSuggestionPayload,
  event: SuggestionEventSnapshot,
): SuggestionReviewRow[] {
  const rows: SuggestionReviewRow[] = [];

  for (const key of REVIEW_FIELD_ORDER) {
    if (payload[key] === undefined) {
      continue;
    }

    const label = ADMIN_REVIEW_FIELD_LABELS[key];
    if (!label) {
      continue;
    }

    rows.push({
      label,
      current: formatCurrentFieldValue(key, event),
      proposed: formatPayloadFieldValue(key, payload[key]),
    });
  }

  const hasPriceChange = PRICE_PAYLOAD_KEYS.some((key) => payload[key] !== undefined);
  if (hasPriceChange) {
    rows.push({
      label: "Cena",
      current: formatPriceSnapshot(event),
      proposed: formatPriceSnapshot(mergePriceSnapshot(event, payload)),
    });
  }

  return rows;
}

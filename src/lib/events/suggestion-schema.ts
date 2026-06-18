import { parseEventUpdate } from "@/lib/events/schema";
import type { ChangeSuggestionPayload } from "@/types";

const SUGGESTION_PAYLOAD_KEYS = [
  "startsAt",
  "city",
  "venueName",
  "locationMode",
  "addressStreet",
  "addressNumber",
  "latitude",
  "longitude",
  "description",
  "lineup",
  "ticketUrl",
  "isFree",
  "priceMode",
  "priceMin",
  "priceMax",
  "currency",
] as const satisfies readonly (keyof ChangeSuggestionPayload)[];

const suggestionPayloadKeySet = new Set<string>(SUGGESTION_PAYLOAD_KEYS);

export type ParsedSuggestionPayload = ChangeSuggestionPayload;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickSuggestionPayloadFields(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([key]) => suggestionPayloadKeySet.has(key)));
}

function hasAtLeastOneField(payload: Record<string, unknown>): boolean {
  return SUGGESTION_PAYLOAD_KEYS.some((key) => payload[key] !== undefined);
}

export function parseSuggestionPayload(
  input: unknown,
): { success: true; data: ParsedSuggestionPayload } | { success: false; error: string } {
  if (!isRecord(input)) {
    return { success: false, error: "Nieprawidłowe dane sugestii" };
  }

  const unknownKeys = Object.keys(input).filter((key) => !suggestionPayloadKeySet.has(key));
  if (unknownKeys.length > 0) {
    return { success: false, error: "Nieprawidłowe pole sugestii" };
  }

  const payload = pickSuggestionPayloadFields(input);
  if (!hasAtLeastOneField(payload)) {
    return { success: false, error: "Wybierz co najmniej jedno pole do zmiany" };
  }

  const parsed = parseEventUpdate(payload);
  if (!parsed.success) {
    return parsed;
  }

  return { success: true, data: parsed.data };
}

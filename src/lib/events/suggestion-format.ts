import type { ChangeSuggestionPayload } from "@/types";

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

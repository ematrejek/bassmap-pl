import type { EventCurrency, EventPriceMode } from "@/types";

export const PRICE_MODES = ["exact", "from", "range"] as const satisfies readonly EventPriceMode[];
export const EVENT_CURRENCIES = ["PLN", "EUR", "CZK"] as const satisfies readonly EventCurrency[];

const CURRENCY_DISPLAY: Record<EventCurrency, string> = {
  PLN: "zł",
  EUR: "€",
  CZK: "Kč",
};

export interface StructuredPriceInput {
  priceMode: EventPriceMode | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: EventCurrency | null;
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(".", ",");
}

export function formatStructuredPrice(input: StructuredPriceInput): string | null {
  const { priceMode, priceMin, priceMax, currency } = input;

  if (priceMode === null || priceMin === null || currency === null) {
    return null;
  }

  const suffix = CURRENCY_DISPLAY[currency];
  const minLabel = formatAmount(priceMin);

  if (priceMode === "exact") {
    return `${minLabel} ${suffix}`;
  }

  if (priceMode === "from") {
    return `od ${minLabel} ${suffix}`;
  }

  if (priceMax === null) {
    return null;
  }

  return `${minLabel}–${formatAmount(priceMax)} ${suffix}`;
}

export function clearStructuredPriceFields(): {
  priceMode: null;
  priceMin: null;
  priceMax: null;
  currency: null;
} {
  return {
    priceMode: null,
    priceMin: null,
    priceMax: null,
    currency: null,
  };
}

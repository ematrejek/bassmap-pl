import { describe, expect, it } from "vitest";
import { formatEventPrice } from "@/lib/events/format";
import { formatStructuredPrice } from "@/lib/events/price";

describe("formatStructuredPrice", () => {
  it("formats exact PLN price (price-1)", () => {
    expect(
      formatStructuredPrice({
        priceMode: "exact",
        priceMin: 50,
        priceMax: null,
        currency: "PLN",
      }),
    ).toBe("50 zł");
  });

  it("formats from-mode price with PLN suffix (price-2)", () => {
    expect(
      formatStructuredPrice({
        priceMode: "from",
        priceMin: 89,
        priceMax: null,
        currency: "PLN",
      }),
    ).toBe("od 89 zł");
  });

  it("formats range with EUR symbol (price-3)", () => {
    expect(
      formatStructuredPrice({
        priceMode: "range",
        priceMin: 40,
        priceMax: 60,
        currency: "EUR",
      }),
    ).toBe("40–60 €");
  });

  it("returns null when price data is incomplete (price-4)", () => {
    expect(
      formatStructuredPrice({
        priceMode: "from",
        priceMin: null,
        priceMax: null,
        currency: "PLN",
      }),
    ).toBeNull();
  });
});

describe("formatEventPrice", () => {
  it("returns Wstęp wolny when isFree is true (price-5)", () => {
    expect(
      formatEventPrice({
        isFree: true,
        priceMode: "from",
        priceMin: 50,
        priceMax: null,
        currency: "PLN",
      }),
    ).toBe("Wstęp wolny");
  });

  it("returns Cena do ustalenia when paid event has no price (price-6)", () => {
    expect(
      formatEventPrice({
        isFree: false,
        priceMode: null,
        priceMin: null,
        priceMax: null,
        currency: null,
      }),
    ).toBe("Cena do ustalenia");
  });
});

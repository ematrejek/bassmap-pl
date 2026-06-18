import { describe, expect, it } from "vitest";
import { formatSuggestionSummary } from "@/lib/events/suggestion-format";

describe("formatSuggestionSummary", () => {
  it("returns body for duplicate_flow suggestions", () => {
    expect(
      formatSuggestionSummary({
        body: "Poprawcie godzinę startu na 22:00",
        payload: null,
      }),
    ).toBe("Poprawcie godzinę startu na 22:00");
  });

  it("summarizes up to three payload fields", () => {
    expect(
      formatSuggestionSummary({
        body: null,
        payload: {
          startsAt: "2026-07-01T18:00:00.000Z",
          description: "Nowy opis",
          isFree: false,
          priceMin: 50,
        },
      }),
    ).toBe("data, opis, cena");
  });

  it("shows field count when more than three groups", () => {
    expect(
      formatSuggestionSummary({
        body: null,
        payload: {
          startsAt: "2026-07-01T18:00:00.000Z",
          description: "Nowy opis",
          city: "Kraków",
          ticketUrl: "https://example.com/tickets",
        },
      }),
    ).toBe("4 pola: data, opis, miasto");
  });
});

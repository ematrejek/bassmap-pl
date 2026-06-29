import { describe, expect, it } from "vitest";
import { parseSuggestionPayload } from "@/lib/events/suggestion-schema";

describe("parseSuggestionPayload", () => {
  it("rejects empty payload", () => {
    const result = parseSuggestionPayload({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Wybierz co najmniej jedno pole do zmiany");
    }
  });

  it("rejects non-object payload", () => {
    const result = parseSuggestionPayload("not-an-object");

    expect(result.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const result = parseSuggestionPayload({
      description: "Nowy opis",
      name: "Zmieniona nazwa",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nieprawidłowe pole sugestii");
    }
  });

  it("accepts a single description field", () => {
    const result = parseSuggestionPayload({ description: "Nowy opis wydarzenia" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Nowy opis wydarzenia");
    }
  });

  it("accepts null description as an intentional clear", () => {
    const result = parseSuggestionPayload({ description: null });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("rejects isFree with price fields", () => {
    const result = parseSuggestionPayload({
      isFree: true,
      priceMode: "from",
      priceMin: 50,
      currency: "PLN",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid structured price update", () => {
    const result = parseSuggestionPayload({
      isFree: false,
      priceMode: "from",
      priceMin: 50,
      currency: "PLN",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceMode).toBe("from");
      expect(result.data.priceMin).toBe(50);
      expect(result.data.currency).toBe("PLN");
    }
  });

  it("rejects range where max is not greater than min", () => {
    const result = parseSuggestionPayload({
      priceMode: "range",
      priceMin: 80,
      priceMax: 40,
      currency: "PLN",
    });

    expect(result.success).toBe(false);
  });

  it("accepts active subgenre update", () => {
    const result = parseSuggestionPayload({ subgenres: ["garage", "neurofunk"] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subgenres).toEqual(["garage", "neurofunk"]);
    }
  });

  it("rejects legacy subgenre in payload", () => {
    const result = parseSuggestionPayload({ subgenres: ["halftime"] });

    expect(result.success).toBe(false);
  });
});

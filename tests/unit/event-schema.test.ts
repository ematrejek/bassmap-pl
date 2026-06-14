import { describe, expect, it } from "vitest";
import { buildMutationCreatePayload } from "../helpers/mutation-fixtures";
import { parseEventCreate, parseEventUpdate } from "@/lib/events/schema";

describe("parseEventCreate", () => {
  it("rejects unknown subgenre slugs (2a)", () => {
    const payload = {
      ...buildMutationCreatePayload(),
      subgenres: ["not_a_real_genre"],
    };

    const result = parseEventCreate(payload);

    expect(result.success).toBe(false);
  });

  it("rejects empty subgenres array (2b)", () => {
    const payload = {
      ...buildMutationCreatePayload(),
      subgenres: [],
    };

    const result = parseEventCreate(payload);

    expect(result.success).toBe(false);
  });

  it("rejects latitude out of range in coordinates mode (2c)", () => {
    const payload = {
      ...buildMutationCreatePayload(),
      latitude: 91,
    };

    const result = parseEventCreate(payload);

    expect(result.success).toBe(false);
  });

  it("rejects longitude out of range in coordinates mode (2c-longitude)", () => {
    const payload = {
      ...buildMutationCreatePayload(),
      longitude: 181,
    };

    const result = parseEventCreate(payload);

    expect(result.success).toBe(false);
  });

  it("rejects coordinates mode without longitude (2d)", () => {
    const { longitude: _longitude, ...withoutLongitude } = buildMutationCreatePayload();
    const result = parseEventCreate({ ...withoutLongitude, locationMode: "coordinates" });

    expect(result.success).toBe(false);
  });

  it("accepts valid coordinates-mode payload (2e)", () => {
    const result = parseEventCreate(buildMutationCreatePayload());

    expect(result.success).toBe(true);
  });

  it("accepts null description (desc-1)", () => {
    const result = parseEventCreate({
      ...buildMutationCreatePayload(),
      description: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("accepts multiline description and trims edges (desc-2)", () => {
    const result = parseEventCreate({
      ...buildMutationCreatePayload(),
      description: "  Line one\nLine two  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Line one\nLine two");
    }
  });

  it("rejects description longer than 5000 characters (desc-3)", () => {
    const result = parseEventCreate({
      ...buildMutationCreatePayload(),
      description: "x".repeat(5001),
    });

    expect(result.success).toBe(false);
  });

  it("normalizes empty description string to null (desc-4)", () => {
    const result = parseEventCreate({
      ...buildMutationCreatePayload(),
      description: "   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("accepts from-mode structured price (price-schema-1)", () => {
    const result = parseEventCreate({
      ...buildMutationCreatePayload(),
      isFree: false,
      priceMode: "from",
      priceMin: 50,
      priceMax: null,
      currency: "PLN",
    });

    expect(result.success).toBe(true);
  });

  it("rejects isFree with price fields (price-schema-2)", () => {
    const result = parseEventCreate({
      ...buildMutationCreatePayload(),
      isFree: true,
      priceMode: "from",
      priceMin: 50,
      priceMax: null,
      currency: "PLN",
    });

    expect(result.success).toBe(false);
  });

  it("rejects range where max is not greater than min (price-schema-3)", () => {
    const result = parseEventCreate({
      ...buildMutationCreatePayload(),
      isFree: false,
      priceMode: "range",
      priceMin: 60,
      priceMax: 40,
      currency: "PLN",
    });

    expect(result.success).toBe(false);
  });

  it("accepts paid event without price (price-schema-4)", () => {
    const result = parseEventCreate({
      ...buildMutationCreatePayload(),
      isFree: false,
      priceMode: null,
      priceMin: null,
      priceMax: null,
      currency: null,
    });

    expect(result.success).toBe(true);
  });
});

describe("parseEventUpdate", () => {
  it("rejects invalid subgenre on partial update (2f)", () => {
    const result = parseEventUpdate({ subgenres: ["bogus"] });

    expect(result.success).toBe(false);
  });

  it("accepts valid coverPath on partial update", () => {
    const result = parseEventUpdate({
      coverPath: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/cover.jpg",
      coverAspect: "portrait",
    });

    expect(result.success).toBe(true);
  });

  it("rejects malformed coverPath on partial update", () => {
    const result = parseEventUpdate({ coverPath: "../evil/cover.jpg" });

    expect(result.success).toBe(false);
  });

  it("accepts coverPath null to clear cover", () => {
    const result = parseEventUpdate({ coverPath: null, coverAspect: null });

    expect(result.success).toBe(true);
  });

  it("accepts description on partial update (desc-5)", () => {
    const result = parseEventUpdate({ description: "Updated copy" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Updated copy");
    }
  });

  it("clears description with empty string on partial update (desc-6)", () => {
    const result = parseEventUpdate({ description: "" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("rejects description longer than 5000 characters on partial update (desc-7)", () => {
    const result = parseEventUpdate({ description: "x".repeat(5001) });

    expect(result.success).toBe(false);
  });
});

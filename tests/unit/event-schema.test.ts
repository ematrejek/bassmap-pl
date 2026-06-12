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

    const result = parseEventCreate(withoutLongitude);

    expect(result.success).toBe(false);
  });

  it("accepts valid coordinates-mode payload (2e)", () => {
    const result = parseEventCreate(buildMutationCreatePayload());

    expect(result.success).toBe(true);
  });
});

describe("parseEventUpdate", () => {
  it("rejects invalid subgenre on partial update (2f)", () => {
    const result = parseEventUpdate({ subgenres: ["bogus"] });

    expect(result.success).toBe(false);
  });
});

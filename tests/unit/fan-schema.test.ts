import { describe, expect, it } from "vitest";
import { parseFanFilters } from "@/lib/events/fan-schema";

describe("parseFanFilters", () => {
  it("drops invalid subgenre query params (3a)", () => {
    const params = new URLSearchParams("subgenre=neurofunk&subgenre=bogus");

    expect(parseFanFilters(params)).toEqual({
      city: null,
      subgenres: ["neurofunk"],
    });
  });

  it("returns empty defaults when no filters are present (3b)", () => {
    const params = new URLSearchParams();

    expect(parseFanFilters(params)).toEqual({
      city: null,
      subgenres: [],
    });
  });
});

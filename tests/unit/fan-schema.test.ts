import { describe, expect, it } from "vitest";
import { buildFanFilterSearchParams, parseFanFilters } from "@/lib/events/fan-schema";
import type { Subgenre } from "@/types";

describe("parseFanFilters", () => {
  it("drops invalid subgenre query params (3a)", () => {
    const params = new URLSearchParams("subgenre=neurofunk&subgenre=bogus");

    expect(parseFanFilters(params)).toEqual({
      city: null,
      subgenres: ["neurofunk"],
      dateFrom: null,
      dateTo: null,
    });
  });

  it("returns empty defaults when no filters are present (3b)", () => {
    const params = new URLSearchParams();

    expect(parseFanFilters(params)).toEqual({
      city: null,
      subgenres: [],
      dateFrom: null,
      dateTo: null,
    });
  });

  it("parses a single-day date filter when only from is present", () => {
    const params = new URLSearchParams("from=2026-06-15");

    expect(parseFanFilters(params)).toEqual({
      city: null,
      subgenres: [],
      dateFrom: "2026-06-15",
      dateTo: "2026-06-15",
    });
  });

  it("normalizes reversed date ranges by swapping from and to", () => {
    const params = new URLSearchParams("from=2026-06-20&to=2026-06-10");

    expect(parseFanFilters(params)).toEqual({
      city: null,
      subgenres: [],
      dateFrom: "2026-06-10",
      dateTo: "2026-06-20",
    });
  });

  it("ignores invalid date query params", () => {
    const params = new URLSearchParams("from=not-a-date");

    expect(parseFanFilters(params)).toEqual({
      city: null,
      subgenres: [],
      dateFrom: null,
      dateTo: null,
    });
  });
});

describe("buildFanFilterSearchParams", () => {
  it("round-trips a single-day date filter in the URL", () => {
    const filters = {
      city: null,
      subgenres: [] as Subgenre[],
      dateFrom: "2026-06-15",
      dateTo: "2026-06-15",
    };

    expect(buildFanFilterSearchParams(filters).toString()).toBe("from=2026-06-15&to=2026-06-15");
    expect(parseFanFilters(buildFanFilterSearchParams(filters))).toEqual(filters);
  });
});

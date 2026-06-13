import { describe, expect, it } from "vitest";
import { buildFanFilterSearchParams, parseFanFilters } from "@/lib/events/fan-schema";
import type { Subgenre } from "@/types";

const emptyFilters = {
  city: null,
  subgenres: [] as Subgenre[],
  dateFrom: null,
  dateTo: null,
  freeOnly: false,
};

describe("parseFanFilters", () => {
  it("drops invalid subgenre query params (3a)", () => {
    const params = new URLSearchParams("subgenre=neurofunk&subgenre=bogus");

    expect(parseFanFilters(params)).toEqual({
      ...emptyFilters,
      subgenres: ["neurofunk"],
    });
  });

  it("returns empty defaults when no filters are present (3b)", () => {
    const params = new URLSearchParams();

    expect(parseFanFilters(params)).toEqual(emptyFilters);
  });

  it("parses a single-day date filter when only from is present", () => {
    const params = new URLSearchParams("from=2026-06-15");

    expect(parseFanFilters(params)).toEqual({
      ...emptyFilters,
      dateFrom: "2026-06-15",
      dateTo: "2026-06-15",
    });
  });

  it("normalizes reversed date ranges by swapping from and to", () => {
    const params = new URLSearchParams("from=2026-06-20&to=2026-06-10");

    expect(parseFanFilters(params)).toEqual({
      ...emptyFilters,
      dateFrom: "2026-06-10",
      dateTo: "2026-06-20",
    });
  });

  it("ignores invalid date query params", () => {
    const params = new URLSearchParams("from=not-a-date");

    expect(parseFanFilters(params)).toEqual(emptyFilters);
  });

  it("parses free=1 as freeOnly true", () => {
    const params = new URLSearchParams("free=1");

    expect(parseFanFilters(params)).toEqual({
      ...emptyFilters,
      freeOnly: true,
    });
  });

  it.each(["true", "0", ""])("ignores free=%s (not canonical free=1)", (value) => {
    const params = new URLSearchParams(`free=${value}`);

    expect(parseFanFilters(params)).toEqual(emptyFilters);
  });

  it("parses city, date, and free filters together", () => {
    const params = new URLSearchParams("city=Warszawa&from=2026-06-15&free=1");

    expect(parseFanFilters(params)).toEqual({
      city: "Warszawa",
      subgenres: [],
      dateFrom: "2026-06-15",
      dateTo: "2026-06-15",
      freeOnly: true,
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
      freeOnly: false,
    };

    expect(buildFanFilterSearchParams(filters).toString()).toBe("from=2026-06-15&to=2026-06-15");
    expect(parseFanFilters(buildFanFilterSearchParams(filters))).toEqual(filters);
  });

  it("round-trips freeOnly in the URL", () => {
    const filters = {
      ...emptyFilters,
      freeOnly: true,
    };

    expect(buildFanFilterSearchParams(filters).toString()).toBe("free=1");
    expect(parseFanFilters(buildFanFilterSearchParams(filters))).toEqual(filters);
  });
});

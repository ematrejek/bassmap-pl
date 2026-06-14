import { describe, expect, it } from "vitest";
import { buildDiscoverySearchUrl, DISCOVERY_PATH } from "@/lib/routes";
import type { Subgenre } from "@/types";

const emptyFilters = {
  city: null,
  subgenres: [] as Subgenre[],
  dateFrom: null,
  dateTo: null,
  freeOnly: false,
};

describe("buildDiscoverySearchUrl", () => {
  it("returns DISCOVERY_PATH when no filters are set", () => {
    expect(buildDiscoverySearchUrl(emptyFilters)).toBe(DISCOVERY_PATH);
    expect(DISCOVERY_PATH).toBe("/events");
  });

  it("builds query string on DISCOVERY_PATH", () => {
    expect(
      buildDiscoverySearchUrl({
        ...emptyFilters,
        city: "Warszawa",
        subgenres: ["neurofunk"],
        freeOnly: true,
      }),
    ).toBe("/events?city=Warszawa&subgenre=neurofunk&free=1");
  });

  it("includes date range params", () => {
    expect(
      buildDiscoverySearchUrl({
        ...emptyFilters,
        dateFrom: "2026-06-15",
        dateTo: "2026-06-20",
      }),
    ).toBe("/events?from=2026-06-15&to=2026-06-20");
  });
});

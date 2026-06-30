import { describe, expect, it } from "vitest";
import { emptyDiscoveryListMessage, hasActiveFanFilters } from "@/lib/events/discovery-page";
import type { FanEventFilters } from "@/lib/events/fan-schema";

const emptyFilters: FanEventFilters = {
  city: null,
  subgenres: [],
  dateFrom: null,
  dateTo: null,
  freeOnly: false,
};

describe("discovery-page helpers", () => {
  it("hasActiveFanFilters is false for empty filters", () => {
    expect(hasActiveFanFilters(emptyFilters)).toBe(false);
  });

  it("hasActiveFanFilters is true when city is set", () => {
    expect(hasActiveFanFilters({ ...emptyFilters, city: "Warszawa" })).toBe(true);
  });

  it("emptyDiscoveryListMessage differs for active filters", () => {
    expect(emptyDiscoveryListMessage(false)).toContain("nadchodzących");
    expect(emptyDiscoveryListMessage(true)).toContain("kryteria");
  });
});

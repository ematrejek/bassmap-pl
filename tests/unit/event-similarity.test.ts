import { describe, expect, it } from "vitest";
import {
  haversineMeters,
  isWithinCoordProximity,
  normalizeAddressParts,
  normalizeVenueName,
} from "@/lib/events/address-normalize";
import { COORD_PROXIMITY_METERS } from "@/lib/events/similarity-constants";
import { locationMatches, type SimilarEventCandidate } from "@/lib/events/similarity";
import type { ParsedEventCreate } from "@/lib/events/schema";

const BASE_COORDS_INPUT: Extract<ParsedEventCreate, { locationMode: "coordinates" }> = {
  locationMode: "coordinates",
  latitude: 52.2297,
  longitude: 21.0122,
  name: "Bass Night",
  startsAt: "2026-07-15T20:00",
  city: "Warszawa",
  venueName: "Proxima",
  subgenres: ["neurofunk"],
  isFree: true,
  lineup: null,
  description: null,
  ticketUrl: null,
  priceMode: null,
  priceMin: null,
  priceMax: null,
  currency: null,
  addressStreet: null,
  addressNumber: null,
};

const BASE_ADDRESS_INPUT: Extract<ParsedEventCreate, { locationMode: "address" }> = {
  locationMode: "address",
  addressStreet: "Żurawia",
  addressNumber: "32",
  name: "Bass Night",
  startsAt: "2026-07-15T20:00",
  city: "Warszawa",
  venueName: "Proxima",
  subgenres: ["neurofunk"],
  isFree: true,
  lineup: null,
  description: null,
  ticketUrl: null,
  priceMode: null,
  priceMin: null,
  priceMax: null,
  currency: null,
};

function buildCandidate(overrides: Partial<SimilarEventCandidate> = {}): SimilarEventCandidate {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Bass Night",
    startsAt: "2026-07-15T18:00:00.000Z",
    city: "Warszawa",
    venueName: "Proxima",
    addressStreet: "Żurawia",
    addressNumber: "32",
    latitude: 52.2297,
    longitude: 21.0122,
    status: "published",
    similarityScore: 0.9,
    ...overrides,
  };
}

describe("normalizeAddressParts", () => {
  it("treats same street with different casing and diacritics as equal", () => {
    expect(normalizeAddressParts("Żurawia", "32")).toBe(normalizeAddressParts("zurawia", "32"));
  });

  it("treats different streets as not equal", () => {
    expect(normalizeAddressParts("Żurawia", "32")).not.toBe(normalizeAddressParts("Marszałkowska", "32"));
  });
});

describe("haversineMeters", () => {
  const lat = 52.2297;
  const lon = 21.0122;

  it("returns ~50 m for a nearby point", () => {
    const nearbyLat = lat + 50 / 111_320;
    const distance = haversineMeters(lat, lon, nearbyLat, lon);
    expect(distance).toBeGreaterThan(40);
    expect(distance).toBeLessThan(60);
    expect(isWithinCoordProximity(lat, lon, nearbyLat, lon)).toBe(true);
  });

  it("returns ~200 m for a farther point", () => {
    const fartherLat = lat + 200 / 111_320;
    const distance = haversineMeters(lat, lon, fartherLat, lon);
    expect(distance).toBeGreaterThan(180);
    expect(distance).toBeLessThan(220);
    expect(isWithinCoordProximity(lat, lon, fartherLat, lon)).toBe(false);
  });

  it("uses COORD_PROXIMITY_METERS threshold by default", () => {
    expect(COORD_PROXIMITY_METERS).toBe(100);
  });
});

describe("normalizeVenueName", () => {
  it("collapses whitespace and ignores case", () => {
    expect(normalizeVenueName("  Proxima  ")).toBe(normalizeVenueName("proxima"));
  });
});

describe("locationMatches", () => {
  it("matches identical address pairs", () => {
    const input = BASE_ADDRESS_INPUT;
    const candidate = buildCandidate();

    expect(locationMatches(input, candidate)).toBe(true);
  });

  it("rejects different streets in address mode", () => {
    const input = BASE_ADDRESS_INPUT;
    const candidate = buildCandidate({
      addressStreet: "Marszałkowska",
      addressNumber: "1",
    });

    expect(locationMatches(input, candidate)).toBe(false);
  });

  it("matches coordinates within 100 m", () => {
    const input = BASE_COORDS_INPUT;
    const candidate = buildCandidate({
      latitude: input.latitude + 50 / 111_320,
      longitude: input.longitude,
      addressStreet: null,
      addressNumber: null,
    });

    expect(locationMatches(input, candidate)).toBe(true);
  });

  it("rejects coordinates farther than 100 m", () => {
    const input = BASE_COORDS_INPUT;
    const candidate = buildCandidate({
      latitude: input.latitude + 200 / 111_320,
      longitude: input.longitude,
      addressStreet: null,
      addressNumber: null,
    });

    expect(locationMatches(input, candidate)).toBe(false);
  });

  it("falls back to venue name when modes differ", () => {
    const input = BASE_ADDRESS_INPUT;
    const candidate = buildCandidate({
      addressStreet: null,
      addressNumber: null,
      venueName: "Proxima",
    });

    expect(locationMatches(input, candidate)).toBe(true);
  });

  it("rejects mixed modes when venue names differ", () => {
    const input = BASE_ADDRESS_INPUT;
    const candidate = buildCandidate({
      addressStreet: null,
      addressNumber: null,
      venueName: "Inny klub",
    });

    expect(locationMatches(input, candidate)).toBe(false);
  });
});

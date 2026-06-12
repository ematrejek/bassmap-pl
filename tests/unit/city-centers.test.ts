import { describe, expect, it } from "vitest";
import { DEFAULT_POLAND_CENTER, getCityCenter, resolveMapCoordinates } from "@/lib/geocoding/city-centers";

const WARSAW_CENTER = { latitude: 52.2297, longitude: 21.0122 };
const KRAKOW_CENTER = { latitude: 50.0647, longitude: 19.945 };
const POZNAN_CENTER = { latitude: 52.4064, longitude: 16.9252 };

describe("resolveMapCoordinates", () => {
  it("uses stored coordinates when both are set (1a)", () => {
    const result = resolveMapCoordinates({
      latitude: 50.1,
      longitude: 19.2,
      city: "Ignored City",
    });

    expect(result).toEqual({ latitude: 50.1, longitude: 19.2 });
  });

  it("falls back to city center when coordinates are null (1b)", () => {
    const result = resolveMapCoordinates({
      latitude: null,
      longitude: null,
      city: "Warszawa",
    });

    expect(result).toEqual(WARSAW_CENTER);
  });

  it("normalizes diacritics and case for city fallback (1c)", () => {
    const withDiacritic = resolveMapCoordinates({
      latitude: null,
      longitude: null,
      city: "Kraków",
    });
    const withoutDiacritic = resolveMapCoordinates({
      latitude: null,
      longitude: null,
      city: "krakow",
    });

    expect(withDiacritic).toEqual(KRAKOW_CENTER);
    expect(withoutDiacritic).toEqual(KRAKOW_CENTER);
    expect(withDiacritic).toEqual(withoutDiacritic);
  });

  it("falls back to Poland center for unknown cities (1d)", () => {
    const result = resolveMapCoordinates({
      latitude: null,
      longitude: null,
      city: "Unknownville",
    });

    expect(result).toEqual({ ...DEFAULT_POLAND_CENTER });
  });

  it("falls back to city center when only one coordinate is set (1f)", () => {
    const result = resolveMapCoordinates({
      latitude: 52.0,
      longitude: null,
      city: "Warszawa",
    });

    expect(result).toEqual(WARSAW_CENTER);
  });
});

describe("getCityCenter", () => {
  it("trims whitespace around city names (1e)", () => {
    expect(getCityCenter("  Poznań  ")).toEqual(POZNAN_CENTER);
  });
});

import type { Event } from "@/types";

export const DEFAULT_POLAND_CENTER = { latitude: 52.0, longitude: 19.0 } as const;

const CITY_CENTERS: Record<string, { latitude: number; longitude: number }> = {
  warszawa: { latitude: 52.2297, longitude: 21.0122 },
  krakow: { latitude: 50.0647, longitude: 19.945 },
  kraków: { latitude: 50.0647, longitude: 19.945 },
  poznan: { latitude: 52.4064, longitude: 16.9252 },
  poznań: { latitude: 52.4064, longitude: 16.9252 },
  wroclaw: { latitude: 51.1079, longitude: 17.0385 },
  wrocław: { latitude: 51.1079, longitude: 17.0385 },
  gdansk: { latitude: 54.352, longitude: 18.6466 },
  gdańsk: { latitude: 54.352, longitude: 18.6466 },
  lodz: { latitude: 51.7592, longitude: 19.456 },
  łódź: { latitude: 51.7592, longitude: 19.456 },
  katowice: { latitude: 50.2649, longitude: 19.0238 },
  lublin: { latitude: 51.2465, longitude: 22.5684 },
  bialystok: { latitude: 53.1325, longitude: 23.1688 },
  białystok: { latitude: 53.1325, longitude: 23.1688 },
  szczecin: { latitude: 53.4285, longitude: 14.5528 },
};

function normalizeCityKey(city: string): string {
  return city.trim().toLowerCase();
}

export function getCityCenter(city: string): { latitude: number; longitude: number } | null {
  const key = normalizeCityKey(city);
  return CITY_CENTERS[key] ?? null;
}

export function resolveMapCoordinates(event: Pick<Event, "latitude" | "longitude" | "city">): {
  latitude: number;
  longitude: number;
} {
  if (event.latitude !== null && event.longitude !== null) {
    return { latitude: event.latitude, longitude: event.longitude };
  }

  const cityCenter = getCityCenter(event.city);
  if (cityCenter) {
    return cityCenter;
  }

  return { ...DEFAULT_POLAND_CENTER };
}

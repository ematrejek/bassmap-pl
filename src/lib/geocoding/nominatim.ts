const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "BassMapPL/1.0 (admin panel; contact: matrejekemilia@gmail.com)";
const REQUEST_TIMEOUT_MS = 10_000;

export interface GeocodeInput {
  addressStreet: string;
  addressNumber: string;
  city: string;
  venueName?: string;
}

export type GeocodeResult = { latitude: number; longitude: number } | { error: string };

function buildAddressQuery(input: GeocodeInput, includeVenue: boolean): string {
  const parts = [`${input.addressNumber} ${input.addressStreet}`, input.city, "Polska"];
  if (includeVenue && input.venueName) {
    parts.unshift(input.venueName);
  }
  return parts.join(", ");
}

async function searchNominatim(query: string, signal: AbortSignal): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "pl",
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    signal,
  });

  if (response.status === 429) {
    return { error: "Geokodowanie tymczasowo niedostępne, spróbuj ponownie" };
  }

  if (!response.ok) {
    return { error: "Geokodowanie tymczasowo niedostępne, spróbuj ponownie" };
  }

  const results = (await response.json()) as { lat?: string; lon?: string }[];

  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const first = results[0];
  const latitude = Number(first.lat);
  const longitude = Number(first.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export async function geocodeAddress(input: GeocodeInput): Promise<GeocodeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const queries = [buildAddressQuery(input, false)];
    if (input.venueName) {
      queries.push(buildAddressQuery(input, true));
    }

    for (const query of queries) {
      const result = await searchNominatim(query, controller.signal);
      if (result === null) {
        continue;
      }
      if ("error" in result) {
        return result;
      }
      return result;
    }

    return { error: "Nie udało się znaleźć lokalizacji dla podanego adresu" };
  } catch {
    return { error: "Geokodowanie tymczasowo niedostępne, spróbuj ponownie" };
  } finally {
    clearTimeout(timeout);
  }
}

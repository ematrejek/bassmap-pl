const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "BassMapPL/1.0 (admin panel; contact: matrejekemilia@gmail.com)";
const REQUEST_TIMEOUT_MS = 10_000;
/** Polityka Nominatim: max ~1 żądanie/s – odstęp między kolejnymi callami w jednym geokodowaniu. */
const NOMINATIM_MIN_INTERVAL_MS = 1_100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface GeocodeInput {
  addressStreet: string;
  addressNumber: string;
  city: string;
  venueName?: string;
}

export type GeocodeResult = { latitude: number; longitude: number } | { error: string };

type NominatimFetchResult = NominatimResult[] | { error: string };

interface NominatimResult {
  lat?: string;
  lon?: string;
  name?: string;
  class?: string;
  type?: string;
  importance?: number;
  display_name?: string;
}

function parseResult(row: NominatimResult): GeocodeResult | null {
  const latitude = Number(row.lat);
  const longitude = Number(row.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function normalizeText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
}

function matchesVenue(result: NominatimResult, venueName: string): boolean {
  const needle = normalizeText(venueName);
  const name = normalizeText(result.name ?? "");
  const display = normalizeText(result.display_name ?? "");

  return name.includes(needle) || display.includes(needle);
}

/** Czy wynik mapy leży przy podanej ulicy (np. „Wybrzeże Kościuszkowskie”). */
function matchesStreet(result: NominatimResult, addressStreet: string): boolean {
  const display = normalizeText(result.display_name ?? "");
  const street = normalizeText(addressStreet);

  if (display.includes(street)) {
    return true;
  }

  const tokens = street.split(/\s+/).filter((token) => token.length > 3);
  return tokens.some((token) => display.includes(token));
}

function pickBestResult(results: NominatimResult[], venueName?: string): NominatimResult | null {
  if (results.length === 0) {
    return null;
  }

  if (venueName) {
    const venueMatch = results.find((row) => matchesVenue(row, venueName) && row.class === "amenity");
    if (venueMatch) {
      return venueMatch;
    }

    const nameMatch = results.find((row) => matchesVenue(row, venueName));
    if (nameMatch) {
      return nameMatch;
    }
  }

  const amenity = results.find((row) => row.class === "amenity");
  if (amenity) {
    return amenity;
  }

  return results[0] ?? null;
}

async function fetchNominatim(params: URLSearchParams, signal: AbortSignal): Promise<NominatimFetchResult> {
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

  const results: unknown = await response.json();
  if (!Array.isArray(results)) {
    return [];
  }
  return results.filter((item): item is NominatimResult => typeof item === "object" && item !== null);
}

async function searchVenueRows(input: GeocodeInput, signal: AbortSignal): Promise<NominatimFetchResult> {
  if (!input.venueName) {
    return [];
  }

  const params = new URLSearchParams({
    q: `${input.venueName}, ${input.city}, Polska`,
    format: "json",
    limit: "8",
    countrycodes: "pl",
  });

  return fetchNominatim(params, signal);
}

async function searchStructuredRows(input: GeocodeInput, signal: AbortSignal): Promise<NominatimFetchResult> {
  const params = new URLSearchParams({
    street: `${input.addressNumber} ${input.addressStreet}`,
    city: input.city,
    country: "Polska",
    format: "json",
    limit: "8",
    countrycodes: "pl",
  });

  return fetchNominatim(params, signal);
}

/**
 * Rozstrzyga konflikt typu „Kaskada przy Jana Pawła II” vs „Kaskada na Wybrzeżu”:
 * gdy admin podał ulicę, wynik musi pasować do ulicy – inna dzielnica o tej samej nazwie jest odrzucana.
 */
function resolveFromCandidates(
  input: GeocodeInput,
  structuredRows: NominatimResult[],
  venueRows: NominatimResult[],
): GeocodeResult | null {
  const { venueName, addressStreet } = input;

  if (venueName) {
    const venueOnStreet = venueRows.find(
      (row) => matchesVenue(row, venueName) && matchesStreet(row, addressStreet) && row.class === "amenity",
    );
    if (venueOnStreet) {
      return parseResult(venueOnStreet);
    }
  }

  const structuredPick = pickBestResult(structuredRows, venueName);
  if (structuredPick) {
    return parseResult(structuredPick);
  }

  if (venueName) {
    const venueOnStreet = venueRows.find((row) => matchesVenue(row, venueName) && matchesStreet(row, addressStreet));
    if (venueOnStreet) {
      return parseResult(venueOnStreet);
    }
  }

  return null;
}

async function searchFreeText(query: string, signal: AbortSignal): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "pl",
  });

  const fetched = await fetchNominatim(params, signal);
  if ("error" in fetched) {
    return fetched;
  }

  const best = pickBestResult(fetched);
  return best ? parseResult(best) : null;
}

export async function geocodeAddress(input: GeocodeInput): Promise<GeocodeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const structuredFetched = await searchStructuredRows(input, controller.signal);
    if ("error" in structuredFetched) {
      return structuredFetched;
    }

    await sleep(NOMINATIM_MIN_INTERVAL_MS);

    const venueFetched = await searchVenueRows(input, controller.signal);
    if ("error" in venueFetched) {
      return venueFetched;
    }

    const resolved = resolveFromCandidates(input, structuredFetched, venueFetched);
    if (resolved) {
      return resolved;
    }

    await sleep(NOMINATIM_MIN_INTERVAL_MS);

    const freeText = await searchFreeText(
      `${input.addressNumber} ${input.addressStreet}, ${input.city}, Polska`,
      controller.signal,
    );
    if (freeText) {
      return freeText;
    }

    return { error: "Nie udało się znaleźć lokalizacji dla podanego adresu" };
  } catch {
    return { error: "Geokodowanie tymczasowo niedostępne, spróbuj ponownie" };
  } finally {
    clearTimeout(timeout);
  }
}

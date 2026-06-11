import { SUBGENRES, type Subgenre } from "@/types";

export interface FanEventFilters {
  city: string | null;
  subgenres: Subgenre[];
}

const SUBGENRE_SET = new Set<string>(SUBGENRES);

function isSubgenre(value: string): value is Subgenre {
  return SUBGENRE_SET.has(value);
}

export function parseFanFilters(searchParams: URLSearchParams): FanEventFilters {
  const cityRaw = searchParams.get("city")?.trim() ?? "";
  const city = cityRaw.length > 0 ? cityRaw : null;

  const subgenres: Subgenre[] = [];
  for (const value of searchParams.getAll("subgenre")) {
    const trimmed = value.trim();
    if (trimmed && isSubgenre(trimmed) && !subgenres.includes(trimmed)) {
      subgenres.push(trimmed);
    }
  }

  return { city, subgenres };
}

export function buildFanFilterSearchParams(filters: FanEventFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.city) {
    params.set("city", filters.city);
  }

  for (const subgenre of filters.subgenres) {
    params.append("subgenre", subgenre);
  }

  return params;
}

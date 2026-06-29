import { isValidCalendarDate } from "@/lib/events/date-range";
import { isActiveSubgenre } from "@/lib/subgenres";
import type { Subgenre } from "@/types";

export interface FanEventFilters {
  city: string | null;
  subgenres: Subgenre[];
  dateFrom: string | null;
  dateTo: string | null;
  freeOnly: boolean;
}

function parseDateFilters(searchParams: URLSearchParams): Pick<FanEventFilters, "dateFrom" | "dateTo"> {
  const fromRaw = searchParams.get("from")?.trim() ?? "";
  const toRaw = searchParams.get("to")?.trim() ?? "";

  const parsedFrom: string | null = isValidCalendarDate(fromRaw) ? fromRaw : null;
  const parsedTo: string | null = isValidCalendarDate(toRaw) ? toRaw : null;

  if (!parsedFrom) {
    return { dateFrom: null, dateTo: null };
  }

  let dateFrom = parsedFrom;
  let dateTo = parsedTo ?? parsedFrom;

  if (dateFrom > dateTo) {
    [dateFrom, dateTo] = [dateTo, dateFrom];
  }

  return { dateFrom, dateTo };
}

export function parseFanFilters(searchParams: URLSearchParams): FanEventFilters {
  const cityRaw = searchParams.get("city")?.trim() ?? "";
  const city = cityRaw.length > 0 ? cityRaw : null;

  const subgenres: Subgenre[] = [];
  for (const value of searchParams.getAll("subgenre")) {
    const trimmed = value.trim();
    if (trimmed && isActiveSubgenre(trimmed) && !subgenres.includes(trimmed)) {
      subgenres.push(trimmed);
    }
  }

  const { dateFrom, dateTo } = parseDateFilters(searchParams);
  const freeOnly = searchParams.get("free") === "1";

  return { city, subgenres, dateFrom, dateTo, freeOnly };
}

export function buildFanFilterSearchParams(filters: FanEventFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.city) {
    params.set("city", filters.city);
  }

  for (const subgenre of filters.subgenres) {
    params.append("subgenre", subgenre);
  }

  if (filters.dateFrom) {
    params.set("from", filters.dateFrom);
    params.set("to", filters.dateTo ?? filters.dateFrom);
  }

  if (filters.freeOnly) {
    params.set("free", "1");
  }

  return params;
}

import type { FanEventFilters } from "@/lib/events/fan-schema";

export function hasActiveFanFilters(filters: FanEventFilters): boolean {
  return filters.city !== null || filters.subgenres.length > 0 || filters.dateFrom !== null || filters.freeOnly;
}

export function emptyDiscoveryListMessage(hasActiveFilters: boolean): string {
  return hasActiveFilters
    ? "Brak wydarzeń spełniających kryteria. Spróbuj zmienić filtry."
    : "Brak nadchodzących wydarzeń. Wróć wkrótce!";
}

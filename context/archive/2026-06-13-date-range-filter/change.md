---
change_id: date-range-filter
title: Filtr dat w odkrywaniu wydarzeń
roadmap_ref: S-05
status: archived
created: 2026-06-13
updated: 2026-06-13
verified_manual: 2026-06-13
plan: context/archive/2026-06-13-date-range-filter/plan.md
archived_at: 2026-06-13T18:30:00Z
---

# Change: date-range-filter

Roadmap **S-05** — fan filtruje nadchodzące wydarzenia po dacie pojedynczej lub zakresie (kalendarz + presety „dziś”, „w tym tygodniu”, „w tym miesiącu”); filtry w URL; lista i mapa pokazują ten sam zestaw.

## Notes

- PRD FR-008 podniesione do must-have (Partia I) — zaktualizowane w `context/foundation/prd.md`.
- Brak migracji DB — filtr na istniejącej kolumnie `starts_at`.
- Strefa czasu zakresu: **Europe/Warsaw** (spójnie z `is_upcoming()` i `getStartOfTodayWarsawUtcIso()`).
- Impl review: `reviews/impl-review.md`. GitHub issue #11 zamknięte. PR #12.

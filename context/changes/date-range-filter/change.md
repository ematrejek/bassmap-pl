---
change_id: date-range-filter
title: Filtr dat w odkrywaniu wydarzeń
roadmap_ref: S-05
status: impl_reviewed
created: 2026-06-13
updated: 2026-06-13
plan: context/changes/date-range-filter/plan.md
---

# Change: date-range-filter

Roadmap **S-05** — fan filtruje nadchodzące wydarzenia po dacie pojedynczej lub zakresie (kalendarz + presety „dziś”, „w tym tygodniu”, „w tym miesiącu”); filtry w URL; lista i mapa pokazują ten sam zestaw.

## Notes

- PRD FR-008 podniesione do must-have (Partia I) — opcjonalna aktualizacja `context/foundation/prd.md` w tej samej sesji co implementacja.
- Brak migracji DB — filtr na istniejącej kolumnie `starts_at`.
- Strefa czasu zakresu: **Europe/Warsaw** (spójnie z `is_upcoming()` i `getStartOfTodayWarsawUtcIso()`).

---
change_id: free-events-filter
title: Filtr „Pokaż tylko darmowe”
roadmap_ref: S-06
status: archived
created: 2026-06-13
updated: 2026-06-13
verified_manual: 2026-06-13
plan: context/archive/2026-06-13-free-events-filter/plan.md
archived_at: 2026-06-13T19:30:00Z
---

# Change: free-events-filter

Roadmap **S-06** — fan włącza przełącznik „Pokaż tylko darmowe” i widzi wyłącznie wydarzenia z `is_free = true`; filtr łączy się z miastem, podgatunkiem i datą (AND między wymiarami).

## Notes

- Brak migracji DB — filtr na istniejącej kolumnie `is_free` (`events.is_free boolean NOT NULL DEFAULT false`).
- Parametr URL: `free=1` (checkbox GET).
- PRD **FR-010** dodane w `context/foundation/prd.md`.
- GitHub issue S-06 nie było osobnego ticketu — PR #13 zmergowany 2026-06-13; deploy na https://bassmap.pl.
- Wpis usunięty z `src/data/public-roadmap.ts` przy archive.

---
change_id: free-events-filter
title: Filtr „Pokaż tylko darmowe”
roadmap_ref: S-06
status: in_progress
created: 2026-06-13
updated: 2026-06-13
plan: context/changes/free-events-filter/plan.md
---

# Change: free-events-filter

Roadmap **S-06** — fan włącza przełącznik „Pokaż tylko darmowe” i widzi wyłącznie wydarzenia z `is_free = true`; filtr łączy się z miastem, podgatunkiem i datą (AND między wymiarami).

## Notes

- Brak migracji DB — filtr na istniejącej kolumnie `is_free` (`events.is_free boolean NOT NULL DEFAULT false`).
- Proponowany parametr URL: `free=1` (checkbox GET).
- FR-010 (roadmap) — dodać do PRD przy `/10x-implement` lub archive.
- GitHub issue dla S-06 jeszcze nie istnieje — utworzyć i przenieść na **In Progress** przy starcie `/10x-implement`.
- Wpis w `src/data/public-roadmap.ts` już jest — usunąć dopiero przy `/10x-archive`.

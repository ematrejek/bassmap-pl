---
change_id: mobile-subgenre-dropdown
title: Subgatunki na mobile — dropdown wielokrotnego wyboru
roadmap_ref: S-07
status: archived
created: 2026-06-13
updated: 2026-06-13
verified_manual: 2026-06-13
plan: context/archive/2026-06-13-mobile-subgenre-dropdown/plan.md
archived_at: 2026-06-13T22:00:00Z
github-issue: 14
---

# Change: mobile-subgenre-dropdown

Roadmap **S-07** — na telefonie fan wybiera podgatunki z rozwijanej listy wielokrotnego wyboru (Popover) zamiast długiego scrolla checkboxów; desktop zachowuje siatkę checkboxów od `sm:`.

## Notes

- Czysto UI — bez migracji DB, bez zmian w `fan-schema.ts` ani `listPublishedEvents`.
- Nowy komponent `src/components/discovery/SubgenreFilter.tsx`; ukryte pola `subgenre` dla formularza GET i presetów dat.
- PRD **FR-011** dodane w `context/foundation/prd.md`.
- GitHub issue [#14](https://github.com/ematrejek/bassmap-pl/issues/14); board **Done**.
- Wpis usunięty z `src/data/public-roadmap.ts` przy archive.

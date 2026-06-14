---
change_id: structured-price-currency
title: Ustrukturyzowana cena i waluta
roadmap_ref: S-08
status: archived
created: 2026-06-13
updated: 2026-06-14
verified_manual: 2026-06-14
plan: context/archive/2026-06-14-structured-price-currency/plan.md
archived_at: 2026-06-14T12:00:00Z
github-issue: 15
---

# Change: structured-price-currency

Roadmap **S-08** — admin wpisuje cenę jako liczbę z trybem „od X” lub „X–Y” i wybiera walutę PLN / EUR / CZK; system waliduje dane; fan widzi sformatowaną cenę w liście i szczegółach; migracja istniejących wartości tekstowych `price`.

## Notes

- Ostatni slice **Partii I** (must-have przed F-04).
- PR #16 merged 2026-06-14; deploy na https://bassmap.pl.
- GitHub issue [#15](https://github.com/ematrejek/bassmap-pl/issues/15); board **Done**.
- Wpis usunięty z `src/data/public-roadmap.ts` przy archive.
- Impl review 2026-06-14: domyślna waluta `PLN` w `EventForm` blokowała „Cena do ustalenia” — poprawione w follow-up cleanup.

---
change_id: structured-price-currency
title: Ustrukturyzowana cena i waluta
roadmap_ref: S-08
status: implementing
created: 2026-06-13
updated: 2026-06-14
plan: context/changes/structured-price-currency/plan.md
github-issue: 15
---

# Change: structured-price-currency

Roadmap **S-08** — admin wpisuje cenę jako liczbę z trybem „od X” lub „X–Y” i wybiera walutę PLN / EUR / CZK; system waliduje dane; fan widzi sformatowaną cenę w liście i szczegółach; migracja istniejących wartości tekstowych `price`.

## Notes

- Ostatni slice **Partii I** (must-have przed F-04).
- Zależność: **S-01** (admin CRUD) — done.
- Powiązane FR: **FR-004** (fan widzi cenę), **FR-006** (admin dodaje wydarzenie); **FR-012** w PRD.
- **Nie** mieszać z **S-06** — filtr darmowych opiera się na `is_free`, nie na tekście ceny.
- GitHub: [#15](https://github.com/ematrejek/bassmap-pl/issues/15) — board **In Progress**.
- Wpis publiczny: `src/data/public-roadmap.ts` → `structured-price-currency` (usunąć przy `/10x-archive`).

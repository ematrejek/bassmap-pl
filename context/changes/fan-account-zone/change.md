---
change_id: fan-account-zone
title: Strefa zalogowanego fana
roadmap_ref: S-12
status: implemented
created: 2026-06-14
updated: 2026-06-15
github-issue: 24
plan: context/changes/fan-account-zone/plan.md
plan-review: context/changes/fan-account-zone/plan-review.md
---

# Change: fan-account-zone

Roadmap **S-12** – dedykowana strefa zalogowanego fana (nie-admin): nawigacja w menu, profil, lista własnych zgłoszeń, formularz dodawania wydarzenia do moderacji, placeholdery „Moja ekipa” i „Forum”.

## Outcome

Zalogowany fan (nie admin) widzi w menu: Lista eventów, Mój profil, Moje eventy, Dodaj wydarzenie, Moja ekipa (placeholder), Forum (placeholder), Wyloguj się. Admin dodatkowo Panel admina. Fan może wysłać wydarzenie ze statusem `pending` – nie jest od razu publiczne. Admin publikuje lub odrzuca w panelu.

## Prerequisites

F-04 (app shell), S-10 (menu gościa) – **done**.

## Notes

- Odblokowuje: S-13, S-14, S-15, S-16
- PRD Non-Goals wymaga aktualizacji (konta fanów) – osobna decyzja, nie blokuje implementacji
- Issue: [#24](https://github.com/ematrejek/bassmap-pl/issues/24)

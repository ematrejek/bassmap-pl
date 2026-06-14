---
change_id: app-shell-navigation
title: App shell i nawigacja zakładkowa
roadmap_ref: F-04
status: implementing
created: 2026-06-14
updated: 2026-06-14
research: context/changes/app-shell-navigation/research.md
frame: context/changes/app-shell-navigation/frame.md
plan: context/changes/app-shell-navigation/plan.md
github-issue: 21
also_covers: [S-09, S-10]
---

# Change: app-shell-navigation

Roadmap **F-04** (+ elementy **S-09**, **S-10**) – wspólny layout z rozwijanym menu (kafelek), nowa strona główna `/`, odkrywanie eventów pod `/events`.

## Outcome

Gość wchodzi na **`/`** – dynamiczną okładkę z logo typograficznym, sloganem, płynnym scrollem, CTA „Znajdź swój event!”, sekcją o projekcie i kontaktem; rozwija menu i przechodzi do listy eventów, logowania, rejestracji, zgłoszenia problemu lub archiwum. **Lista + mapa** żyją pod **`/events`** (obecny widok odkrywania).

## Routing (resolved 2026-06-14)

| URL | Zawartość |
|-----|-----------|
| `/` | Marketing homepage (scroll) |
| `/events` | Lista + mapa + filtry |
| `/archive` | Przeszłe eventy, lista bez mapy |
| `/report-issue` | Formularz „Zgłoś problem” → e-mail |
| `/auth/signin`, `/auth/signup` | Auth (bez zmian) |

Szczegóły: `frame.md`.

## Copy (resolved 2026-06-14)

- **Slogan:** Find the place, drop the bass!
- **Kim jesteśmy:** pełny tekst w `frame.md` § sekcje strony głównej.
- **Zgłoś problem:** formularz → **e-mail** na kontakt@bassmap.pl.
- **Archiwum:** `published` + data &lt; dziś (Europe/Warsaw, `NOT is_upcoming()`).
- **Redirect:** `/?…` → `/events?…` (302).

## Prerequisites

S-04…S-08, S-11 – **Partia I zamknięta**.

## Unlocks

S-12 (nawigacja fana rozszerza menu), dalsze Partia II.

## Open questions

_(brak)_

## Notes

- Research: `research.md` (2026-06-14).
- Frame / decyzje UX: `frame.md` (2026-06-14).
- Plan: `plan.md` (2026-06-14) – 5 faz; review: `plan-review.md`.
- **URL po angielsku:** `/archive`, `/report-issue` (etykiety menu po polsku).
- Wygląd: dynamiczny DnB, stonowane neony, lepsze fonty – **bez logo/grafik na start**.
- Następny krok: **`/10x-implement`**.

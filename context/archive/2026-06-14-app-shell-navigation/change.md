---
change_id: app-shell-navigation
title: App shell i nawigacja zakładkowa
roadmap_ref: F-04
also_covers: [S-09, S-10]
status: archived
created: 2026-06-14
updated: 2026-06-14
archived_at: 2026-06-14T19:30:00Z
verified_manual: pending
research: context/archive/2026-06-14-app-shell-navigation/research.md
frame: context/archive/2026-06-14-app-shell-navigation/frame.md
plan: context/archive/2026-06-14-app-shell-navigation/plan.md
impl-review: context/archive/2026-06-14-app-shell-navigation/reviews/impl-review.md
github-issue: 21
github-issues-also: [22, 23]
---

# Change: app-shell-navigation

Roadmap **F-04** (+ **S-09**, **S-10** w jednym vertical slice) – wspólny layout z rozwijanym menu (Sheet), marketing homepage `/`, odkrywanie pod `/events`, archiwum, formularz zgłoszenia.

## Outcome

Gość wchodzi na **`/`** – dynamiczną okładkę z typografią BassMap PL, sloganem, płynnym scrollem (Lenis), CTA „Znajdź swój event!”, sekcją o projekcie i kontaktem. **Lista + mapa + filtry** pod **`/events`**. Menu globalne: lista eventów, auth, zgłoszenie problemu, archiwum. Po logowaniu i wylogowaniu redirect na **`/`**.

## Routing

| URL                            | Zawartość                          |
| ------------------------------ | ---------------------------------- |
| `/`                            | Marketing homepage                 |
| `/events`                      | Lista + mapa + filtry              |
| `/archive`                     | Przeszłe eventy (lista, bez mapy)  |
| `/report-issue`                | Formularz „Zgłoś problem” → e-mail |
| `/auth/signin`, `/auth/signup` | Auth                               |

Redirect `/?query` → `/events?query` (302). Stare slugi prawne → `/privacy-policy`, `/terms` (301).

## Notes

- Commity: `b3cdbe7` (implementacja), `1e6bebd` (impl-review + Cloudflare Email API).
- Migracja archiwum: `20260615120000_events_select_archive.sql` (remote OK).
- Impl review: `reviews/impl-review.md` – **APPROVED WITH NOTES**.
- GitHub: issues [#21](https://github.com/ematrejek/bassmap-pl/issues/21) (F-04), [#22](https://github.com/ematrejek/bassmap-pl/issues/22) (S-09), [#23](https://github.com/ematrejek/bassmap-pl/issues/23) (S-10) – zamknięte przy archive.
- Odblokowuje: **S-12** (strefa zalogowanego fana).

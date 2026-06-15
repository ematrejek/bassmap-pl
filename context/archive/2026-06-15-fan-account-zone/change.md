---
change_id: fan-account-zone
title: Strefa zalogowanego fana
roadmap_ref: S-12
status: archived
created: 2026-06-14
updated: 2026-06-15
archived_at: 2026-06-15T20:00:00Z
verified_manual: pending
github-issue: 24
plan: context/archive/2026-06-15-fan-account-zone/plan.md
plan-review: context/archive/2026-06-15-fan-account-zone/plan-review.md
impl-review: context/archive/2026-06-15-fan-account-zone/reviews/impl-review.md
---

# Change: fan-account-zone

Roadmap **S-12** – dedykowana strefa zalogowanego fana (nie-admin): nawigacja w menu, profil, lista własnych zgłoszeń, formularz dodawania wydarzenia do moderacji, placeholdery „Moja ekipa” i „Forum”.

## Outcome

Zalogowany fan (nie admin) widzi w menu: Lista eventów, Mój profil, Moje eventy, Dodaj wydarzenie, Moja ekipa (placeholder), Forum (placeholder), Wyloguj się. Admin dodatkowo Panel admina. Fan może wysłać wydarzenie ze statusem `pending` – nie jest od razu publiczne. Admin publikuje lub odrzuca w panelu.

## Routing

| URL | Zawartość |
|-----|-----------|
| `/profile` | Profil fana |
| `/my-events` | Lista własnych zgłoszeń |
| `/my-events/new` | Formularz „Dodaj wydarzenie” |
| `/team` | Placeholder „Moja ekipa” |
| `/forum` | Placeholder „Forum” |

Redirect `/dashboard` → `/profile` (301).

## Notes

- Commity: `98a3847` (implementacja S-12), `4da82a1` (fix testów), merge PR [#29](https://github.com/ematrejek/bassmap-pl/pull/29) (`5106171`); audyt prawny: `ad53a46`, `aef5d23`, `76d8d7d`.
- Migracja: `20260616120000_fan_event_submissions.sql` (`created_by`, RLS fan INSERT/SELECT).
- **Drift vs plan:** okładki fana włączone w MVP (`FanEventForm` + `/api/fan/events/[id]/cover`) — zaakceptowane w impl-review.
- **Legal sync (S-12):** checkbox `acceptContentRights`, §3.3/§5.6–5.7 regulaminu, §2.1/§2.6 polityki — commity audytu 2026-06-15. Pełny slice **S-17** (dropdown źródła okładki + audyt w DB) — następny krok.
- Impl review: `reviews/impl-review.md` — **APPROVED** (manual QA migracji remote + E2E w przeglądarce nadal pending).
- GitHub: issue [#24](https://github.com/ematrejek/bassmap-pl/issues/24) — zamknięte przy archive.
- Odblokowuje: **S-17**, S-13, S-14, S-15, S-16.

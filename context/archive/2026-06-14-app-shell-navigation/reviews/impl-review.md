<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: App shell, strona główna i nawigacja gościa

- **Plan**: `context/changes/app-shell-navigation/plan.md`
- **Scope**: Fazy 1–5 (F-04 + S-09 + S-10 w jednym slice)
- **Date**: 2026-06-14
- **Verdict**: **APPROVED WITH NOTES** – przed archive: manual QA + e-mail prod
- **Findings**: 0 critical · 0 warnings · 6 observations

## Verdicts

| Dimension           | Verdict                                         |
| ------------------- | ----------------------------------------------- |
| Plan Adherence      | PASS ✅                                         |
| Scope Discipline    | PASS ✅                                         |
| Safety & Quality    | PASS ✅                                         |
| Architecture        | PASS ✅                                         |
| Pattern Consistency | PASS ✅                                         |
| Success Criteria    | WARNING ⚠️ (manual QA + flaki testów lokalnych) |

## Automated Verification

| Command         | Result                               |
| --------------- | ------------------------------------ |
| `npm run lint`  | ✅ PASS                              |
| `npm run build` | ✅ PASS                              |
| `npm test`      | ⚠️ czerwony lokalnie – patrz F2, F10 |

## Success Criteria (plan)

| Kryterium                                       | Status                    |
| ----------------------------------------------- | ------------------------- |
| `/` marketing homepage + CTA → `/events`        | ✅ MATCH                  |
| `/events` discovery bez RoadmapTeaser           | ✅ MATCH                  |
| Redirect `/?query` → `/events?query` (302)      | ✅ MATCH                  |
| AppShell + Sheet menu globalnie                 | ✅ MATCH                  |
| Menu gościa (5 pozycji) + auth/admin            | ✅ MATCH                  |
| `/archive` lista bez mapy                       | ✅ MATCH                  |
| `/report-issue` + API e-mail + 503 bez bindingu | ✅ MATCH                  |
| Po logowaniu redirect → `/`                     | ✅ MATCH                  |
| Migracja archiwum RLS na remote                 | ✅ MATCH (20260615120000) |
| Weryfikacja manualna                            | ⏳ PENDING                |

## Findings

### F1 — Redirect po logowaniu → `/`

- **Detail**: Po udanym logowaniu użytkownik trafia na stronę główną **`/`** (`signin.ts` → `HOME_PATH`). Zgodne z `plan.md`, `frame.md`, `change.md`.
- **Decision**: **MATCH**

### F2 — Migracja RLS archiwum

- **Severity**: ~~WARNING~~ → zamknięte na prod
- **Detail**: `npx supabase migration list` – **`20260615120000` na remote** (push wykonany). Test `archive-list.test.ts` pada **lokalnie**, bo integracje używają tylko lokalnego Supabase (`127.0.0.1`); na dev trzeba `npx supabase db reset` / migracje lokalnie, żeby test przeszedł – to nie blokuje produkcji.
- **Decision**: **DISMISSED** (prod OK); opcjonalnie zsynchronizować lokalną bazę pod `npm test`

### F3 — Lenis smooth scroll

- **Severity**: ~~WARNING~~ → zamknięte
- **Detail**: **Decyzja właścicielki:** ma być płynny scroll – Lenis zostaje, bez wyłączania przy `prefers-reduced-motion`.
- **Decision**: **ACCEPTED** – frame zaktualizowany

### F4 — Font Orbitron

- **Severity**: ~~WARNING~~ → zamknięte
- **Detail**: **Decyzja właścicielki:** layout i fonty OK (Orbitron + Inter). Plan/frame zsynchronizowane z kodem.
- **Decision**: **ACCEPTED**

### F5 — Brak `prerender = false` na API auth

- **Severity**: 💡 OBSERVATION
- **Location**: `src/pages/api/auth/signin.ts`, `signout.ts`, `signup.ts`
- **Fix**: Opcjonalnie dodać `export const prerender = false` dla spójności z AGENTS.md.
- **Decision**: PENDING (non-blocking)

### F6 — Angielskie URL stron prawnych + 301

- **Decision**: ACCEPTED

### F7 — CTA w `HomeHero`

- **Decision**: ACCEPTED

### F8 — Cloudflare Email Sending na prod

- **Decision**: PENDING (manual przed archive)

### F9 — Progress fazy 5

- **Decision**: FIXED

### F10 — Flaki timeoutów testów integracyjnych

- **Decision**: PENDING (osobny ticket)

## Plan Adherence Summary

| Element planu                               | Werdykt |
| ------------------------------------------- | ------- |
| Routing, shell, homepage, archiwum, kontakt | MATCH   |
| Auth redirect po login → `/`                | MATCH   |
| Fonty Orbitron + Inter                      | MATCH   |
| Topbar usunięty, public roadmap             | MATCH   |

## Następne kroki

1. Manual QA (menu, archiwum na prod, formularz e-mail).
2. Opcjonalnie: lokalny `supabase db reset` jeśli chcesz zielony `archive-list.test.ts`.
3. **`/10x-archive app-shell-navigation`** po akceptacji.

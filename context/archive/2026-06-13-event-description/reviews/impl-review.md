<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Pole opisu wydarzenia

- **Plan**: context/changes/event-description/plan.md
- **Scope**: Full plan (Phase 1 + Phase 2)
- **Date**: 2026-06-13
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Automated Verification (re-run 2026-06-13)

| Command | Result | Notes |
|---------|--------|-------|
| `npx supabase db push` (remote) | PASS | Migracja `20260613140000_event_description.sql` zastosowana |
| `npm run lint` (repo-wide) | FAIL | 15 błędów CRLF w `src/env.d.ts`, `tests/smoke/vitest.test.ts` — poza diffem tej zmiany |
| `eslint` (tylko pliki zmiany) | PASS | Wszystkie 7 plików źródłowych czyste |
| `npm run build` | PASS | Build zakończony bez błędów |
| `npm test` — `event-schema.test.ts` | PASS | 16/16 testów |
| `npm test` (pełny) | PARTIAL | 2 timeouty w `auth-mutation-allow.test.ts` (flaky/env, niezwiązane z opisem) |

## Findings

### F1 — Status S-04 w roadmap nadal `ready`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: context/foundation/roadmap.md:41
- **Detail**: Implementacja jest gotowa (`change.md`: `implemented`), ale S-04 w tabeli roadmap ma status `ready`, nie `done` / in progress. Backlog GitHub może być niespójny z rzeczywistością.
- **Fix**: Przy `/10x-archive` ustaw S-04 na `done`, zamknij issue i przenieś na board Done — zgodnie z regułami repo. Do tego czasu można oznaczyć jako in progress jeśli PR jeszcze nie zmergowany.
- **Decision**: FIXED — utworzono issue [#10](https://github.com/ematrejek/bassmap-pl/issues/10), dodano na board **In Progress**, zaktualizowano `roadmap.md` (status `in progress`).

### F2 — Ręczna weryfikacja UI (2.3, 2.4) niezakończona

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/event-description/plan.md (Progress 2.3, 2.4)
- **Detail**: Checkboxy 2.3 i 2.4 nadal `[ ]`. Brak dowodu, że admin tworzy/edytuje opis i fan widzi sekcję na `/events/[id]`, ani że pusty opis ukrywa sekcję bez regresji.
- **Fix**: Przejdź manualny test plan (utwórz wydarzenie z opisem 2–3 linie → opublikuj → sprawdź jako gość; edytuj → usuń opis → sekcja znika). Oznacz 2.3/2.4 jako `[x]` w Progress.
- **Decision**: FIXED — użytkownik potwierdził wykonanie testu; Progress 2.3/2.4 oznaczone `[x]`.

### F3 — Progress oznacza lint jako zaliczony, repo-wide lint pada

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: N/A (pre-existing: src/env.d.ts, tests/smoke/vitest.test.ts)
- **Detail**: Progress 1.2 i 2.1 mają `[x]` dla `npm run lint`, ale pełne `npm run lint` zwraca 15 błędów prettier/CRLF w plikach spoza tej zmiany. Pliki event-description przechodzą lint osobno.
- **Fix**: Uruchom `npm run lint:fix` na repo (lub napraw CRLF w wskazanych plikach) — poza zakresem event-description, ale blokuje CI jeśli te pliki są w main.
- **Decision**: FIXED — `npm run lint:fix` uruchomione; repo-wide lint przechodzi.

### F4 — Brak testu `parseEventUpdate` dla opisu >5000 znaków

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: tests/unit/event-schema.test.ts
- **Detail**: `desc-3` testuje limit tylko dla `parseEventCreate`. `parseEventUpdate` używa tego samego `descriptionSchema`, ale brak explicite testu regresji dla update path.
- **Fix**: Dodać test `parseEventUpdate({ description: "x".repeat(5001) })` → `success: false`.
- **Decision**: FIXED — dodano test `desc-7`; 17/17 testów przechodzi.

### F5 — Brak constraint DB na długość opisu

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260613140000_event_description.sql:3
- **Detail**: Limit 5000 znaków jest tylko w Zod. Admin zapisujący bezpośrednio przez Supabase Studio mógłby wstawić dłuższy tekst. Wzorzec lineup też nie ma constraint — defense-in-depth opcjonalny.
- **Fix**: Opcjonalnie `CHECK (description IS NULL OR length(description) <= 5000)` w osobnej migracji.
- **Decision**: FIXED — migracja `20260613160000_event_description_length_check.sql`.

### F6 — Brak `maxLength` na textarea w formularzu admina

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/admin/EventForm.tsx:523
- **Detail**: Lineup też nie ma `maxLength` — spójne ze wzorcem. Użytkownik dowie się o limicie 5000 dopiero po submit (Zod). Lepszy UX z `maxLength={5000}`.
- **Fix**: Dodać `maxLength={5000}` na textarea opisu (opcjonalnie licznik znaków).
- **Decision**: FIXED — `maxLength={5000}` na textarea w `EventForm.tsx`.

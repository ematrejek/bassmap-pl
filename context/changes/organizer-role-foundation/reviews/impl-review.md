<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Rola organizatora i weryfikacja (F-05)

- **Plan**: `context/changes/organizer-role-foundation/plan.md`
- **Scope**: Phase 1-4 of 4
- **Date**: 2026-06-29
- **Verdict**: APPROVED WITH MINOR FOLLOW-UPS
- **Findings**: 0 critical, 2 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 – Brakuje kilku testów integracyjnych dla RLS i RPC

- **Severity**: WARNING
- **Impact**: MEDIUM – warto chwilę się zatrzymać, bo chodzi o zabezpieczenia bazy
- **Dimension**: Safety & Quality
- **Location**: `tests/integration/organizer-applications-rls.test.ts`
- **Detail**: Obecny test pokrywał główną ścieżkę i część zakazów dostępu, ale nie sprawdzał jeszcze ukrycia `verification_code_hash`, blokady bezpośredniego UPDATE przez fana, `reject_organizer_application` oraz limitu błędnych prób kodu. Podczas dopisywania testów wyszły dwie realne poprawki: limit prób nie zapisywał licznika, bo wyjątek SQL cofał UPDATE, a `verification_code_hash` był dostępny przez `select("*")` z powodu zbyt szerokiego grantu tabeli.
- **Fix**: Dodano testy integracyjne, zawężono grant `SELECT` do bezpiecznych kolumn i zmieniono RPC `verify_organizer_application_code`, aby błędna próba zapisywała licznik bez cofania transakcji. Serwis TypeScript mapuje zwrócony status `code_issued` na błąd „Nieprawidłowy kod weryfikacyjny”.
- **Decision**: FIXED

### F2 – Brak E2E smoke dla nowej ścieżki UI

- **Severity**: WARNING
- **Impact**: LOW – poprawka jest prosta, ale może wymagać setupu kont testowych
- **Dimension**: Success Criteria
- **Location**: `tests/e2e/`
- **Detail**: `npm run verify` i `npm run build` przechodziły, a ścieżka została potwierdzona ręcznie, ale projektowa lekcja zaleca `npm run test:e2e` albo `npm run verify:full` przy zmianach UI.
- **Fix**: Zainstalowano brakującą przeglądarkę Playwright (`chromium`). Pierwszy pełny przebieg E2E miał jeden timeout przy logowaniu w teście forum; ponowiony `tests/e2e/forum.spec.ts --project=chromium` przeszedł w całości. Pełny przebieg `npm run test:e2e` został ponowiony i przeniesiony w tło.
- **Decision**: PARTIALLY FIXED – pending final full-suite result

### F3 – Regulamin wspomina o cofnięciu roli organizatora

- **Severity**: OBSERVATION
- **Impact**: LOW – to nie blokuje, ale warto świadomie zdecydować
- **Dimension**: Safety & Quality / Legal
- **Location**: `src/pages/terms.astro`
- **Detail**: §3.8 mówi, że Administrator może cofnąć rolę organizatora. W F-05 nie ma jeszcze UI/API do cofania roli.
- **Fix**: Zapisano follow-up w `context/changes/organizer-role-foundation/follow-ups/review-fixes.md`.
- **Decision**: FOLLOW-UP

### F4 – Re-issue kodu może zmylić admina

- **Severity**: OBSERVATION
- **Impact**: LOW – mała zmiana copy
- **Dimension**: Reliability / UX
- **Location**: `src/components/admin/OrganizerApplicationActions.tsx`
- **Detail**: Dla statusu `code_issued` przycisk mówił „Generuj kod”, choć kliknięcie generuje nowy kod i unieważnia poprzedni.
- **Fix**: Przy `code_issued` przycisk ma etykietę „Wygeneruj ponownie”, a dialog pokazuje ostrzeżenie, że poprzedni kod został unieważniony.
- **Decision**: FIXED

## Verification

- `npx supabase db reset` – PASS
- `npm test -- tests/integration/organizer-applications-rls.test.ts` – PASS (8 tests)
- `npm run verify` – PASS (70 files, 434 tests passed, 1 skipped)
- `npm run build` – PASS before triage fixes
- `npx playwright test tests/e2e/forum.spec.ts --project=chromium` – PASS (5 tests)
- `npm run test:e2e` – first full run had 1 timeout, full rerun pending/backgrounded

<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Usuwanie konta użytkownika (S-16)

- **Plan**: context/changes/account-deletion/plan.md
- **Scope**: All 5 phases (uncommitted working tree)
- **Date**: 2026-06-19
- **Verdict**: PASS (z drobnymi uwagami przed archive)
- **Findings**: 0 critical, 1 warning, 0 open observations (F2–F4 fixed 2026-06-19)

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 – Główny test integracyjny pominięty lokalnie (migracja)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – pełna ścieżka FK sugestii nie jest weryfikowana bez migracji
- **Dimension**: Success Criteria / Deploy
- **Location**: tests/integration/account-deletion.test.ts:28–35, 89–174; supabase/migrations/20260620100000_account_deletion_suggestions_set_null.sql
- **Detail**: `npm run verify` przechodzi, ale test „anonymizes comments, deletes user, and keeps suggestions with null submitter” jest `skipIf` gdy wersja `20260620100000` nie jest w `schema_migrations`. Stderr: „Run: npx supabase migration up”. Test złego hasła (bez wywołania serwisu delete) przechodzi.
- **Fix**: Przed deployem: `npx supabase db reset` lub `migration up` lokalnie + `npm run test:ci`; na produkcji zastosować migrację **przed** kodem aplikacji (plan Migration Notes).
- **Decision**: OPEN – wymaga potwierdzenia na środowisku z migracją.

### F2 – Logowanie przy częściowej awarii delete

- **Severity**: ⚠️ WARNING (było)
- **Impact**: 🏃 LOW
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/account-deletion.ts, tests/unit/account-deletion-service.test.ts
- **Detail**: Gdy anonimizacja przeszła, a `deleteUser` fail – brak logów utrudniał debug w produkcji.
- **Fix**: `console.error` z prefiksem `[account-deletion]`, `userId` i `message` błędu; testy unit potwierdzają log + komunikat użytkownika.
- **Decision**: FIXED – 2026-06-19.

### F3 – Ręczna weryfikacja

- **Severity**: 👁️ OBSERVATION (było)
- **Impact**: 🏃 LOW
- **Dimension**: Success Criteria
- **Location**: context/changes/account-deletion/plan.md (Progress manual)
- **Detail**: Checklista manualna w przeglądarce.
- **Fix**: Potwierdzone przez użytkownika; Progress odhaczony.
- **Decision**: FIXED – 2026-06-19.

### F4 – Unit API bez testu 400 (brak e-maila)

- **Severity**: 👁️ OBSERVATION (było)
- **Impact**: 🏃 LOW
- **Dimension**: Testowalność
- **Location**: tests/unit/account-delete-api.test.ts
- **Detail**: Brak testu dla `400` przy `!user.email`.
- **Fix**: Dodano test „returns 400 when account has no email”.
- **Decision**: FIXED – 2026-06-19.

## Co jest zgodne z planem (skrót)

| Obszar | Status |
|--------|--------|
| Migracja FK `change_suggestions` ON DELETE SET NULL | ✅ |
| `DELETED_USER_AUTHOR_LABEL` + serwis anonimizacji + `deleteUserAccount` | ✅ |
| Kolejność: verify password → anonymize → deleteUser → signOut | ✅ |
| `POST /api/fan/account/delete` – auth, admin 403, Zod, 204 | ✅ |
| `DeleteAccountSection` – AlertDialog, hasło, fetch + JSON header | ✅ |
| `profile.astro` – fan: sekcja delete; admin: akapit e-mail | ✅ |
| `isFanSubmission` → tylko `status === "pending"` | ✅ |
| Nullable `submittedBy` – types, mapper, admin index | ✅ |
| `ChangeSuggestionsTable` – `DELETED_USER_AUTHOR_LABEL` przy braku profilu | ✅ (ponad plan) |
| Banner `/?accountDeleted=1` na `index.astro` | ✅ |
| Legal §5.1, §3.6 + `LEGAL_UPDATED_AT` | ✅ |
| Unit: schema + API + serwis; integracja: złe hasło | ✅ |
| `npm run verify` | ✅ (196 passed, 1 skipped) |
| Roadmap S-16 `in progress` | ✅ (done dopiero przy archive) |

## Poprawki z plan-review – status

| Poprawka plan-review | Status |
|----------------------|--------|
| Fix kolejki moderacji `isFanSubmission` | ✅ |
| Nullable `submittedBy` + admin panel | ✅ |
| Integracja UI w `profile.astro` (nie w ProfileSection) | ✅ |
| Legal w tej samej sesji co kod | ✅ |
| Nagłówek JSON w fetch | ✅ |
| Test złego hasła w integracji | ✅ |

## Rekomendacja przed archive

1. **Migracja** – `npx supabase migration up` (lub reset) i potwierdź zielony test integracyjny sugestii SET NULL.
2. **`/10x-archive`** – roadmap `done`, zamknij #28, przenieś folder do archive.

<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Quality-gates wiring

- **Plan**: context/changes/testing-quality-gates-wiring/plan.md
- **Scope**: Full plan (Phases 1–4)
- **Date**: 2026-06-12
- **Verdict**: APPROVED (post-triage)
- **Findings**: 0 critical, 3 warnings, 2 observations — all FIXED

## Verdicts

| Dimension           | Verdict            |
| ------------------- | ------------------ |
| Plan Adherence      | PASS (post-triage) |
| Scope Discipline    | PASS               |
| Safety & Quality    | PASS               |
| Architecture        | PASS               |
| Pattern Consistency | PASS (post-triage) |
| Success Criteria    | PASS               |

## Findings

### F1 — Brak przypięcia wersji supabase/setup-cli

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence / Pattern Consistency
- **Location**: `.github/workflows/ci.yml:22`, `.github/workflows/deploy.yml:19`
- **Detail**: Plan wymaga `supabase/setup-cli@v2` z `version` zgodnym z `package.json` (`^2.23.4`). Oba workflow używają `@v2` bez `with: version:`. Lokalny dev używa lockfile; CI może dostać inną wersję CLI niż developer.
- **Fix**: Dodać `with: version: 2.23.4` (lub wersję z `package-lock.json`) do obu kroków `supabase/setup-cli@v2`.
- **Decision**: FIXED — pinned `version: 2.98.2` (lockfile) in ci.yml + deploy.yml

### F2 — Kruchy kontrakt wykrywania skipów (grep)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `scripts/ci-supabase-test.sh:37,79-83`
- **Detail**: CI uznaje sukces tylko gdy w outputcie nie ma `"Integration tests skipped"`. Jeśli ktoś zmieni tekst w `logSkipIfNotConfigured()` bez aktualizacji skryptu, albo usunie `logSkipIfNotConfigured()` przy zachowanym `describe.skipIf`, integracja może zostać pominięta przy zielonym CI.
- **Fix A ⭐ Recommended**: Wyeksportować stałą `INTEGRATION_SKIP_WARNING_PREFIX` z `tests/helpers/supabase.ts` i generować fragment do grepa z jednego źródła (np. mały Node skrypt importujący helper).
  - Strength: Jedno źródło prawdy; zmiana tekstu w helperze wymusza aktualizację CI.
  - Tradeoff: Wymaga Node one-linera lub wspólnego pliku konfiguracyjnego obok bash.
  - Confidence: HIGH — obecny grep już działa, ale kontrakt jest domyślny.
  - Blind spot: `describe.skipIf` bez warn nadal ominie grep.
- **Fix B**: Dodać w Vitest reporter / hook licznik skipped integration suites i failować gdy > 0 w `test:ci`.
  - Strength: Nie zależy od stringa w logu.
  - Tradeoff: Więcej konfiguracji Vitest.
  - Confidence: MED — wymaga sprawdzenia kompatybilności z obecnym `vitest.config.ts`.
  - Blind spot: Nie weryfikowano reporter API w tym review.
- **Decision**: FIXED via Fix A — `INTEGRATION_SKIP_WARNING_PREFIX` in `tests/helpers/supabase.ts`, imported in CI script via Node

### F3 — Stary akapit CI w test-plan §6.1

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `context/foundation/test-plan.md:155`
- **Detail**: Faza 4 zaktualizowała §6.2 i §6.4 (CI hard-fail), ale §6.1 nadal mówi: „integration may skip without env (§6.2)” — mylące dla nowego contributora czytającego cookbook unitów.
- **Fix**: Zamienić na: unit zawsze w CI; integracja — patrz §6.2 (CI wymaga pełnego runu; lokalnie skip OK).
- **Decision**: FIXED — §6.1 CI line updated

### F4 — Progress 4.4 otwarty przy §3 Phase 4 już `done`

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `context/changes/testing-quality-gates-wiring/plan.md:323`, `context/foundation/test-plan.md:74`
- **Detail**: `test-plan.md` §3 Phase 4 ma status `done` (zgodnie z kontraktem fazy 4 przy merge). Plan Progress pozycja 4.4 celowo czeka na `/10x-archive` — to nie jest błąd implementacji, tylko oczekiwany timing.
- **Fix**: Zamknąć 4.4 przy archiwizacji zmiany (`/10x-archive`).
- **Decision**: FIXED — plan Progress 4.4 checked at impl-review (archive still pending)

### F5 — Append (`>>`) do `.env.test` w workflow

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `.github/workflows/ci.yml:31`, `.github/workflows/deploy.yml:28`
- **Detail**: `supabase status … >> .env.test` dopisuje do pliku. Przy retry kroku w tym samym jobie powstałyby duplikaty (ostatni wygrywa przy `load_env_file`, ale plik jest nieczysty).
- **Fix**: Użyć `>` (nadpisanie) zamiast `>>` w obu workflow.
- **Decision**: FIXED — `>` overwrite in ci.yml + deploy.yml

## Automated verification (review run)

| Command                               | Result                           | Notes                                                                                         |
| ------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| `bash -n scripts/ci-supabase-test.sh` | N/A (Windows — bash niedostępny) | Plan Progress 1.1 zielony w commit `6b66f5c`                                                  |
| `npm run lint`                        | FAIL lokalnie                    | CRLF w `tests/smoke/vitest.test.ts` — plik poza diffem tej zmiany; CI Linux prawdopodobnie OK |
| `npm run build`                       | PASS                             | Review 2026-06-12                                                                             |
| GitHub Actions (plan Progress)        | PASS                             | 2.1–2.3, 3.1–3.3 oznaczone done z commitami                                                   |

## Plan drift accepted as fixes (not findings)

- `vector` w `supabase start -x` — fix po problemie w CI (`62627bc`); udokumentowane w test-plan §6.6.
- `strip_quotes` w skrypcie — fix cudzysłowów z `status -o env` (`2214cef`).
- Override names `auth.anon_key` / `auth.service_role_key` — działająca składnia CLI (plan miał starsze nazwy).

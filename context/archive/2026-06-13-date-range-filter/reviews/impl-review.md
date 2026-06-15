<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Filtr dat w odkrywaniu

- **Plan**: context/changes/date-range-filter/plan.md
- **Scope**: Phase 1–2 of 2 (full plan)
- **Date**: 2026-06-13
- **Verdict**: NEEDS ATTENTION → triage fixes applied
- **Findings**: 0 critical, 3 warnings, 3 observations

## Verdicts

| Dimension           | Verdict                          |
| ------------------- | -------------------------------- |
| Plan Adherence      | PASS                             |
| Scope Discipline    | PASS                             |
| Safety & Quality    | WARNING                          |
| Architecture        | PASS                             |
| Pattern Consistency | WARNING                          |
| Success Criteria    | PASS (automated); manual pending |

## Automated Verification

| Command         | Result          |
| --------------- | --------------- |
| `npm run lint`  | PASS            |
| `npm run build` | PASS            |
| `npm test`      | PASS (68 tests) |

## Findings

### F1 — Walidacja akceptuje niemożliwe daty

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM
- **Dimension**: Safety & Quality
- **Location**: src/lib/events/date-range.ts:16-22
- **Detail**: `isValidCalendarDate` nie odrzucała dat typu `2026-02-31` (JS przewija miesiąc).
- **Fix**: Round-trip check składników daty + test.
- **Decision**: FIXED

### F2 — Presety ignorują niezapisane zmiany formularza

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🔬 HIGH
- **Dimension**: Pattern Consistency
- **Location**: src/components/discovery/DateRangeFilter.tsx:57-105
- **Detail**: Presety budowały URL z `currentFilters` (SSR), nie z live pól formularza.
- **Fix**: Odczyt `FormData` z najbliższego `<form>` przed nawigacją presetów i „Wyczyść datę”.
- **Decision**: FIXED

### F3 — Kalendarz pozwalał wybór dat z przeszłości

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM
- **Dimension**: Safety & Quality
- **Location**: src/components/discovery/DateRangeFilter.tsx:128-133
- **Detail**: Etykieta zakresu mogła nie pasować do wyników po clampie serwisu.
- **Fix**: `disabled={{ before: calendarDateToLocalDate(getWarsawCalendarDate()) }}`.
- **Decision**: FIXED

### F4 — Puste ukryte pola from/to zaśmiecały URL

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW
- **Dimension**: Pattern Consistency
- **Location**: src/components/discovery/DateRangeFilter.tsx:157-158
- **Detail**: Puste `from=&to=` przy submit bez daty.
- **Fix**: Warunkowy render hidden inputów.
- **Decision**: FIXED

### F5 — Konwersja dat UI vs Warsaw

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🔎 MEDIUM
- **Dimension**: Pattern Consistency
- **Location**: src/lib/events/date-range.ts:50-57
- **Detail**: `calendarDateToLocalDate` / `localDateToCalendarDate` używały lokalnej strefy przeglądarki.
- **Fix**: `formatWarsawCalendarDateFromParts` przez `Intl` + `Europe/Warsaw`.
- **Decision**: FIXED

### F6 — Luki w pokryciu testów

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Success Criteria
- **Location**: tests/unit/date-range.test.ts
- **Detail**: Brak testu lutego non-leap dla preset month; brak testów `isValidCalendarDate` (uzupełnione w F1).
- **Fix**: Test lutego 2025 + testy walidacji.
- **Decision**: FIXED

### F7 — Weryfikacja ręczna niezaznaczona w Progress

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Success Criteria
- **Location**: plan.md Progress 1.7, 2.7–2.9
- **Detail**: Pozycje manualne nadal `[ ]` — oczekiwane przed archive.
- **Decision**: SKIPPED (praca użytkownika na dev serverze)

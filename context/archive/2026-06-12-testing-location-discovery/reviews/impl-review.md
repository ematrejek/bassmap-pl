<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Location and discovery hot-spots

- **Plan**: context/changes/testing-location-discovery/plan.md
- **Scope**: All 5 phases (full plan review)
- **Date**: 2026-06-12
- **Verdict**: APPROVED (post-triage)
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | PASS    |

## Automated verification

| Command                          | Result                                                    |
| -------------------------------- | --------------------------------------------------------- |
| `npm test` (with `.env.test`)    | PASS — 33 tests, 12 files                                 |
| `npm test` (without `.env.test`) | PASS — 21 unit tests pass, 12 integration skipped, exit 0 |
| `npm run lint`                   | PASS                                                      |

## Findings

### F1 — Brak testu częściowych współrzędnych (partial coords)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: tests/unit/city-centers.test.ts
- **Detail**: `resolveMapCoordinates` wymaga obu współrzędnych (`latitude !== null && longitude !== null`); gdy tylko jedna jest ustawiona, funkcja przechodzi do fallbacku miasta/Polski. To ważna ścieżka Risk #2, nieobjęta sub-fazami 1a–1e (testowane są tylko obie null lub obie ustawione).
- **Fix**: Dodać `it` np. `(1f)` z `latitude: 52.0, longitude: null, city: "Warszawa"` → oczekiwane `WARSAW_CENTER`.
- **Decision**: FIXED

### F2 — Integracja bez read-back z bazy

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: tests/integration/location-coords-persist.test.ts:25-39
- **Detail**: Test sprawdza tylko wartość zwróconą przez `createEvent`. Wzorzec z `auth-mutation-allow.test.ts` dodatkowo wywołuje `getEventById(serviceClient, id)` — niezależne potwierdzenie zapisu w DB.
- **Fix**: Po `createEvent`, odczytać `getEventById(createServiceClient(), id)` i porównać `latitude`/`longitude` z payloadem.
- **Decision**: FIXED

### F3 — Kolizja etykiety sub-fazy `(4a)`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: tests/integration/location-coords-persist.test.ts:25
- **Detail**: Tytuł `createEvent persists… (4a)` kolizja z `data-integrity-delete.test.ts` (`deleteEvent reduces row count… (4a)`). W obrębie repo `(4a)` nie jest unikalne — utrudnia mapowanie test ↔ plan/ryzyko.
- **Fix**: Zmienić etykietę na unikalną, np. `(L4a)` lub `(phase3-4a)`.
- **Decision**: FIXED

### F4 — Luźny regex w asercji datetime

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: tests/unit/event-format.test.ts:13
- **Detail**: Wzorzec `...\d{2}.\d{3}Z` używa `.` (dowolny znak), nie literalnej kropki ISO. Test i tak przechodzi dzięki drugiej asercji `toISOString()`, ale pierwsza asercja jest słabsza niż zamierzono.
- **Fix**: Zamienić na `\\.` w regex lub polegać wyłącznie na `toBe(expectedIso)`.
- **Decision**: FIXED

### F5 — Brak symetrycznego testu longitude poza zakresem

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: tests/unit/event-schema.test.ts
- **Detail**: Sub-faza 2c testuje tylko `latitude: 91`; brak analogicznego przypadku dla `longitude` (np. `181`). Nie blokuje merge, ale pokrycie Risk #7 jest nieco asymetryczne.
- **Fix**: Dodać jeden `it` z `longitude: 181` → `success: false`.
- **Decision**: FIXED

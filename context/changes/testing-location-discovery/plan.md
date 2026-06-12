# Location and discovery hot-spots — Implementation Plan

## Overview

Rollout Phase 3 from `context/foundation/test-plan.md`: add **unit** tests (primary) and one **integration** smoke proving map pin logic (`resolveMapCoordinates`) and API input boundaries (`parseEventCreate` / `parseEventUpdate`, `parseFanFilters`, `parseDatetimeLocalWarsaw`) protect Risks #2 and #7. Reuse Vitest + localhost Supabase harness from Phases 1–2; no Leaflet, Nominatim HTTP, or Astro API route harness.

## Current State Analysis

- **Test base:** Vitest 3.2.x, `fileParallelism: false`, `tests/unit/require-admin.test.ts`, integration harness in `tests/helpers/supabase.ts` + `mutation-fixtures.ts`.
- **Map pins:** `EventsMap` → `resolveMapCoordinates` (`src/lib/geocoding/city-centers.ts`) — stored lat/lng, else `CITY_CENTERS`, else `DEFAULT_POLAND_CENTER`.
- **Write validation:** `src/lib/events/schema.ts` — Zod parsers called by `src/pages/api/admin/events/*` before `createEvent` / `updateEvent`.
- **Fan URL sanitization:** `src/lib/events/fan-schema.ts` — invalid `subgenre` query params dropped.
- **Datetime second gate:** `parseDatetimeLocalWarsaw` (`src/lib/events/format.ts`) stricter than Zod `Date.parse` on `startsAt`.
- **No unit tests** for city-centers, schema, fan-schema, or format yet. `test-plan.md` §6.1 still TBD.

### Key Discoveries

- DB allows `latitude` and `longitude` both `NULL` — fallback path is production-relevant, not only legacy edge case.
- `schema.ts` already exports `eventCreateCoordinatesSchema` etc. for tests.
- Integration smoke should reuse `buildMutationCreatePayload()` (`locationMode: "coordinates"`) — no Nominatim.
- Research open items **resolved for this plan:** split unit files by domain; datetime gap tested via `parseDatetimeLocalWarsaw` unit (not private `toStoredStartsAt`); one integration smoke included.

## Desired End State

After this plan completes:

1. `npm test` runs new unit suites **without** Supabase; integration smoke skips gracefully when env missing.
2. Tests fail if `resolveMapCoordinates` mis-orders coords vs city fallback vs Poland center (Risk #2).
3. Tests fail if invalid subgenres, coords, or fan filter params slip through validation boundaries (Risk #7).
4. `context/foundation/test-plan.md` §6.1 documents unit-test pattern; §6.6 lists Phase 3 shipped files.

### Verification

- `npm test` — all tests pass with local Supabase + `.env.test`.
- `npm test` — unit suites pass without env; integration smoke skipped (exit 0) without env.
- `npm run lint` passes.

## What We're NOT Doing

- Nominatim / `geocodeAddress` HTTP tests.
- Leaflet / `EventsMap` component or screenshot E2E.
- Full Astro `POST /api/admin/events` HTTP integration.
- DB CHECK constraint tests (`events_subgenres_min_one`) — Zod catches earlier.
- Null-coords DB row integration (duplicates unit signal — deferred).
- CI hard-fail wiring (rollout Phase 4).
- Application code changes unless a test exposes a real bug (fix in separate commit).

## Implementation Approach

Sub-phases ordered by **cost × signal** (pure unit first → integration smoke → docs):

| Order | Sub-phase | Cost | Signal | Risk |
|-------|-----------|------|--------|------|
| 1 | `resolveMapCoordinates` unit | Low | Highest for map | #2 |
| 2 | Admin schema validation unit | Low | High | #7 |
| 3 | Fan filters + datetime unit | Low | Medium | #7 |
| 4 | Admin create coords persist (integration) | Low | Wiring smoke | #7 |
| 5 | Cookbook §6.1 + test-plan §6.6 | Low | Durability | — |

Oracle conventions:

- **Map:** table-driven `expect(resolveMapCoordinates(input)).toEqual({ latitude, longitude })` — import `DEFAULT_POLAND_CENTER` and known city entries from `city-centers.ts` where useful.
- **Schema:** `parseEventCreate` / `parseEventUpdate` → `success: false` for rejects; use `buildMutationCreatePayload()` from `tests/helpers/mutation-fixtures.ts` as valid coordinates-mode baseline.
- **Fan filters:** `new URLSearchParams(...)` → `parseFanFilters`.

---

## Phase 1: Risk #2 — Map coordinate resolution unit tests

### Overview

Lock pin placement logic without DB or map UI.

### Test sub-phase 1a — Stored coordinates win

| Field | Value |
|-------|-------|
| **Behavior asserted** | Non-null `latitude` / `longitude` returned as-is regardless of `city` |
| **Regression caught** | City fallback overriding explicit coords |

### Test sub-phase 1b — City center fallback

| Field | Value |
|-------|-------|
| **Behavior asserted** | `null` coords + `Warszawa` → Warsaw center from `CITY_CENTERS` |
| **Regression caught** | Missing fallback when coords absent |

### Test sub-phase 1c — Diacritic / case normalization

| Field | Value |
|-------|-------|
| **Behavior asserted** | `Kraków` and `krakow` with null coords → same center |
| **Regression caught** | Broken `normalizeCityKey` aliases |

### Test sub-phase 1d — Unknown city → Poland center

| Field | Value |
|-------|-------|
| **Behavior asserted** | Null coords + unknown city → `DEFAULT_POLAND_CENTER` |
| **Regression caught** | `undefined` / throw instead of safe default |

### Test sub-phase 1e — Whitespace trimming

| Field | Value |
|-------|-------|
| **Behavior asserted** | `"  Poznań  "` → Poznań center via `getCityCenter` |
| **Regression caught** | Trim regression on city key |

### Changes Required

#### 1. Unit test file

**File:** `tests/unit/city-centers.test.ts` (new)

**Intent:** Implement sub-phases 1a–1e against `resolveMapCoordinates` and `getCityCenter`.

**Contract:** Import from `@/lib/geocoding/city-centers`. Event-shaped inputs use `{ latitude, longitude, city }` only. No mocks.

### Success Criteria

#### Automated Verification

- `npm test` — city-centers unit tests pass (no Supabase)
- `npm run lint` passes

#### Manual Verification

- None required

---

## Phase 2: Risk #7 — Admin event schema validation unit tests

### Overview

Prove Zod boundary rejects corrupt admin write payloads before service/DB.

### Test sub-phase 2a — Invalid subgenre

| Field | Value |
|-------|-------|
| **Behavior asserted** | `parseEventCreate` with unknown subgenre slug → `success: false` |
| **Regression caught** | Out-of-catalog genre persisted |

### Test sub-phase 2b — Empty subgenres array

| Field | Value |
|-------|-------|
| **Behavior asserted** | `subgenres: []` → `success: false` |
| **Regression caught** | Events without genres |

### Test sub-phase 2c — Latitude out of range

| Field | Value |
|-------|-------|
| **Behavior asserted** | `latitude: 91` in coordinates mode → `success: false` |
| **Regression caught** | Invalid map data in DB |

### Test sub-phase 2d — Coordinates mode incomplete

| Field | Value |
|-------|-------|
| **Behavior asserted** | `locationMode: "coordinates"` without longitude → `success: false` |
| **Regression caught** | Partial coordinate pairs |

### Test sub-phase 2e — Valid coordinates create payload

| Field | Value |
|-------|-------|
| **Behavior asserted** | Baseline payload from `buildMutationCreatePayload()` → `success: true` |
| **Regression caught** | Accidental schema tightening breaking admin create |

### Test sub-phase 2f — Update rejects invalid subgenre

| Field | Value |
|-------|-------|
| **Behavior asserted** | `parseEventUpdate({ subgenres: ["bogus"] })` → `success: false` |
| **Regression caught** | Partial update bypass |

### Changes Required

#### 1. Unit test file

**File:** `tests/unit/event-schema.test.ts` (new)

**Intent:** Implement sub-phases 2a–2f.

**Contract:** Import `parseEventCreate`, `parseEventUpdate` from `@/lib/events/schema`. Cast intentionally invalid bodies as `unknown` before parse. Reuse `buildMutationCreatePayload` for 2e.

### Success Criteria

#### Automated Verification

- `npm test` — event-schema unit tests pass without Supabase
- `npm run lint` passes

#### Manual Verification

- None required

---

## Phase 3: Risk #7 — Fan filters and datetime format unit tests

### Overview

Prove fan URL params cannot poison filters; document datetime-local contract.

### Test sub-phase 3a — Invalid subgenre stripped

| Field | Value |
|-------|-------|
| **Behavior asserted** | `?subgenre=neurofunk&subgenre=bogus` → `subgenres: ["neurofunk"]` only |
| **Regression caught** | Bad URL breaking list queries |

### Test sub-phase 3b — Empty filter defaults

| Field | Value |
|-------|-------|
| **Behavior asserted** | No params → `{ city: null, subgenres: [] }` |
| **Regression caught** | Accidental filter state from empty URL |

### Test sub-phase 3c — ISO datetime with Z rejected

| Field | Value |
|-------|-------|
| **Behavior asserted** | `parseDatetimeLocalWarsaw("2026-06-15T20:00:00.000Z")` → `null` |
| **Regression caught** | Zod/service datetime gap accepting wrong format |

### Test sub-phase 3d — Canonical datetime-local accepted

| Field | Value |
|-------|-------|
| **Behavior asserted** | `parseDatetimeLocalWarsaw("2026-12-01T20:00")` → non-null ISO string |
| **Regression caught** | Regression breaking admin form datetime contract |

### Changes Required

#### 1. Fan filter unit tests

**File:** `tests/unit/fan-schema.test.ts` (new)

**Intent:** Sub-phases 3a–3b.

**Contract:** Import `parseFanFilters` from `@/lib/events/fan-schema`; construct `URLSearchParams`.

#### 2. Datetime unit tests

**File:** `tests/unit/event-format.test.ts` (new)

**Intent:** Sub-phases 3c–3d.

**Contract:** Import `parseDatetimeLocalWarsaw` from `@/lib/events/format`.

### Success Criteria

#### Automated Verification

- `npm test` — fan-schema and event-format unit tests pass without Supabase
- `npm run lint` passes

#### Manual Verification

- None required

---

## Phase 4: Risk #7 — Coordinates persist integration smoke

### Overview

Thin wiring check: admin `createEvent` stores submitted lat/lng (service path used by API).

### Test sub-phase 4a — Create persists coordinates

| Field | Value |
|-------|-------|
| **Behavior asserted** | `createEvent(adminClient, buildMutationCreatePayload())` → `data.latitude` / `data.longitude` match payload |
| **Regression caught** | Mapper/service dropping coords on insert |

### Changes Required

#### 1. Integration test file

**File:** `tests/integration/location-coords-persist.test.ts` (new)

**Intent:** Implement sub-phase 4a.

**Contract:** `describe.skipIf(!isSupabaseConfigured())`; `beforeAll` → `createAdminClient()`; `afterAll` → `deleteMutationFixtureIds(serviceClient, [id])` if created; assert coords equality with fixture payload; no Nominatim (coordinates mode only).

### Success Criteria

#### Automated Verification

- `npm test` — integration smoke passes with local Supabase + `.env.test`
- `npm test` — suite skipped cleanly without env

#### Manual Verification

- None required

---

## Phase 5: Cookbook and test-plan §6 sync

### Overview

Document unit-test pattern for future rollout phases; record shipped paths.

### Changes Required

#### 1. Test-plan cookbook §6.1

**File:** `context/foundation/test-plan.md`

**Intent:** Replace §6.1 TBD with unit-test pattern (where, imports, no Supabase, table-driven oracles).

**Contract:** Reference `tests/unit/*.test.ts` from this change; link to §6.2 for integration.

#### 2. §6.6 phase note

**File:** `context/foundation/test-plan.md`

**Intent:** Append Phase 3 shipped file list; set rollout row 3 status `done` when change archives.

**Contract:** List all new `tests/unit/*` and `tests/integration/location-coords-persist.test.ts`.

#### 3. README pointer (optional)

**File:** `tests/README.md`

**Intent:** One line linking §6.1 for unit tests.

**Contract:** ≤2 lines added.

### Success Criteria

#### Automated Verification

- `npm test` still passes after doc updates
- `npm run lint` passes

#### Manual Verification

- §6.1 actionable without opening `research.md`

---

## Testing Strategy

### Unit

- `city-centers` — pin resolution priority and city table
- `event-schema` — admin create/update rejects
- `fan-schema` — URL filter sanitization
- `event-format` — datetime-local parse contract

### Integration

- Single admin `createEvent` coords persist smoke

### Manual probing (optional during implement)

1. Temporarily break `CITY_CENTERS.warszawa` → city-centers test fails
2. Remove `min(1)` on subgenres in schema → event-schema test fails

## Performance Considerations

- All Phase 1–3 tests are in-memory — fast, no DB.
- Phase 4 adds one insert/delete per run; reuse existing sequential `fileParallelism: false`.

## Migration Notes

- No schema migrations in this change.
- Prerequisite: prior test rollout harness + `20260611140000_fix_is_admin_use_uid.sql` for Phase 4 integration.

## References

- Research: `context/changes/testing-location-discovery/research.md`
- Test plan: `context/foundation/test-plan.md` §2–§4, §6
- Prior harness: `context/archive/2026-06-11-testing-critical-path-fan-read/`, `context/archive/2026-06-11-testing-authorization-data-integrity/`
- Map: `src/lib/geocoding/city-centers.ts`, `src/components/discovery/EventsMap.tsx`
- Validation: `src/lib/events/schema.ts`, `fan-schema.ts`, `format.ts`
- Service: `src/lib/services/events.ts` (`createEvent`)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Risk #2 — Map coordinate resolution unit tests

#### Automated

- [x] 1.1 City-centers unit tests pass (sub-phases 1a–1e) — 9720fee
- [x] 1.2 `npm run lint` passes — 9720fee

#### Manual

- [x] 1.3 None — 9720fee

### Phase 2: Risk #7 — Admin event schema validation unit tests

#### Automated

- [x] 2.1 Event-schema unit tests pass (sub-phases 2a–2f) — 040a5e1
- [x] 2.2 `npm run lint` passes — 040a5e1

#### Manual

- [x] 2.3 None — 040a5e1

### Phase 3: Risk #7 — Fan filters and datetime format unit tests

#### Automated

- [x] 3.1 Fan-schema unit tests pass (sub-phases 3a–3b) — 56dc6cf
- [x] 3.2 Event-format unit tests pass (sub-phases 3c–3d) — 56dc6cf
- [x] 3.3 `npm run lint` passes — 56dc6cf

#### Manual

- [x] 3.4 None — 56dc6cf

### Phase 4: Risk #7 — Coordinates persist integration smoke

#### Automated

- [x] 4.1 Location-coords-persist integration passes with local Supabase (sub-phase 4a) — ce8fbcc
- [x] 4.2 Suite skipped cleanly without Supabase env — ce8fbcc

#### Manual

- [x] 4.3 None — ce8fbcc

### Phase 5: Cookbook and test-plan §6 sync

#### Automated

- [x] 5.1 `npm test` still passes after doc updates
- [x] 5.2 `npm run lint` passes

#### Manual

- [x] 5.3 §6.1 actionable standalone

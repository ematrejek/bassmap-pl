# Location and discovery hot-spots — Plan Brief

> Full plan: `context/changes/testing-location-discovery/plan.md`
> Research: `context/changes/testing-location-discovery/research.md`

## What & Why

Rollout Phase 3 adds automated tests so fans never see **wrong map pins** (Risk #2) and bad data never slips through **admin or URL validation** (Risk #7). This is test-only work — no new product features.

## Starting Point

Vitest and integration harness exist from Phases 1–2. Map pins use `resolveMapCoordinates`; admin API uses Zod parsers in `schema.ts`. No unit tests cover these modules yet.

## Desired End State

`npm test` includes fast unit suites for map fallback and validation boundaries, plus one optional integration smoke that admin create persists coordinates. `test-plan.md` §6.1 documents how to add unit tests.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Map test layer | Unit on `city-centers.ts` | Same signal as map UI without Leaflet or screenshots | Research |
| Admin validation layer | Unit on `parseEventCreate` / `parseEventUpdate` | API routes are thin wrappers — no HTTP harness | Research |
| Datetime gap | Unit on `parseDatetimeLocalWarsaw` | Function is public; documents stricter contract than Zod | Plan |
| Integration scope | One coords-persist smoke only | Proves service wiring; null-coords DB row duplicates unit | Plan |
| File layout | Four unit files + one integration file | Clear ownership per domain | Plan |
| Nominatim / E2E | Out of scope | Cost × signal — deferred per test-plan | Research |

## Scope

**In scope:** Unit tests for city centers, event schema, fan filters, datetime format; one integration smoke; cookbook §6.1 + §6.6.

**Out of scope:** Nominatim HTTP, Leaflet UI, Astro API HTTP tests, CI gate (Phase 4 rollout), app code changes unless bug found.

## Architecture / Approach

```
Risk #2 → tests/unit/city-centers.test.ts → resolveMapCoordinates
Risk #7 → tests/unit/event-schema.test.ts  → parseEventCreate/Update
         → tests/unit/fan-schema.test.ts   → parseFanFilters
         → tests/unit/event-format.test.ts  → parseDatetimeLocalWarsaw
         → tests/integration/location-coords-persist.test.ts → createEvent (admin)
```

Phases 1–3 need no Supabase. Phase 4 reuses `mutation-fixtures` + `createAdminClient`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. City-centers unit | Pin priority: coords → city → Poland | Wrong expectations on `CITY_CENTERS` keys |
| 2. Event-schema unit | Reject bad subgenres/coords | TypeScript casts on invalid payloads |
| 3. Fan + format unit | URL sanitization + datetime contract | Zod vs format.ts boundary confusion |
| 4. Integration smoke | Admin create keeps lat/lng | Needs local Supabase |
| 5. Docs | §6.1 cookbook + §6.6 file list | — |

**Prerequisites:** Vitest harness from Phases 1–2; `.env.test` + local Supabase for Phase 4 only.

**Estimated effort:** ~1–2 sessions across 5 phases (mostly unit tests).

## Open Risks & Assumptions

- If `buildMutationCreatePayload()` `startsAt` format drifts from `parseDatetimeLocalWarsaw`, Phase 2e / Phase 4 may need aligned fixture dates.
- No production code changes expected; if tests expose a bug, fix outside this plan’s scope.

## Success Criteria (Summary)

- Unit tests fail when map fallback or validation rules regress.
- `npm test` and `npm run lint` green locally.
- Contributors can add unit tests using §6.1 without reading research.

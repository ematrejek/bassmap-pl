# Critical-path fan read — Implementation Plan

## Overview

Rollout Phase 1 from `context/foundation/test-plan.md`: bootstrap Vitest (no test runner exists today) and add integration tests that prove the fan-facing event list is **not falsely empty** (Risk #1) and that **admin sessions on public read paths** still see only published upcoming events (Risk #6). Tests target `src/lib/services/events.ts` public entry points with real local Supabase clients — not RLS-only SQL, not Astro page rendering, not mocks of internal service logic.

## Current State Analysis

- **Test base:** `none` — no Vitest config, no `*.test.*` files, no `npm test` script; CI runs lint + build only.
- **Fan-read predicates** live in `listPublishedEvents`, `listDistinctCities`, `getPublishedEventById` (`src/lib/services/events.ts:121–188`) with explicit `.eq("status", "published")` and `.gte("starts_at", getStartOfTodayWarsawUtcIso())`.
- **RLS widens admin visibility:** `events_select_admin` allows authenticated admins to SELECT all rows; service filters are mandatory on public paths (`lessons.md`, research Risk #6).
- **Separate failure mode:** `index.astro` returns `{ data: [] }` when `createClient` is null (missing env) — out of Phase 1 automated scope; document as manual/smoke follow-up.
- **Vitest + Astro 6:** `getViteConfig()` from Astro can crash with CJS `cookie` regression (astro#15847); Phase 1 uses **standalone** `vitest.config.ts` in Node environment for service-only tests.

### Key Discoveries

- Fixture oracle must be **insert contract** (known UUIDs/status/dates), not a re-implementation of `getStartOfTodayWarsawUtcIso()` (`research.md` Risk #1 anti-pattern).
- Admin tests require migration `20260611140000_fix_is_admin_use_uid.sql` applied and a test user on `admin_allowlist` matched via `auth.uid()`.
- Integration tests need local Supabase (`npx supabase start`); recommend **skip with warning** when `SUPABASE_URL` unset until Phase 4 wires CI.

## Desired End State

After this plan completes:

1. `npm test` runs Vitest and executes fan-read integration tests against local Supabase when available.
2. Tests fail if `listPublishedEvents` returns zero while fixture data includes published-upcoming rows (Risk #1).
3. Tests fail if admin-authenticated clients receive draft or past events from `*Published*` functions (Risk #6).
4. `context/foundation/test-plan.md` §6.2 and §6.6 document the shipped integration-test cookbook pattern.

### Verification

- `npm test` — all tests pass with local Supabase running and env set.
- `npm test` — skips integration suite gracefully (exit 0 + console warning) when Supabase env missing.
- `npm run lint` and `npm run build` — unchanged, still pass.

## What We're NOT Doing

- Astro page / Container API tests for `index.astro` env-null fallback (defer — higher cost, lower signal vs service integration).
- Unit tests on `getStartOfTodayWarsawUtcIso()` alone (Phase 3 candidate; does not catch wiring/env regressions).
- RLS-only tests without calling `*Published*` service functions.
- Mocking `listPublishedEvents` internals or Supabase at module level.
- CI hard-fail on integration tests (Phase 4).
- E2E / Playwright.
- Fan URL filter narrowing (city/subgenre) — optional stretch; not required for Risk #1/#6 closure.
- Warsaw midnight boundary drift test (JS vs SQL `is_upcoming`) — document as known edge; add only if cheap after core cases green.

## Implementation Approach

Sub-phases ordered by **cost × signal** and **risk priority** (#1 before #6 depth, bootstrap first):

| Order | Sub-phase | Cost | Signal | Risk |
|-------|-----------|------|--------|------|
| 1 | Vitest bootstrap + Supabase harness | Low | Enables all | — |
| 2 | `listPublishedEvents` — not falsely empty (anon) | Medium | Highest | #1 |
| 3 | `listPublishedEvents` — excludes draft/past (anon) | Low (same file) | High | #1 |
| 4 | `listPublishedEvents` — admin parity | Medium | High | #6 |
| 5 | `getPublishedEventById` — admin detail guard | Medium | Medium | #6 |
| 6 | `listDistinctCities` — admin city guard | Low | Medium | #6 |
| 7 | Cookbook + test-plan §6 update | Low | Durability | — |

Each integration sub-phase uses a **fixture contract**: service-role client inserts rows with fixed `starts_at` values guaranteed upcoming relative to test run date (e.g. `now + 30 days`, `now + 60 days` for published-upcoming; `now - 7 days` for published-past; draft rows with future dates). Cleanup in `afterAll` deletes fixture IDs only.

## Critical Implementation Details

- **Fixture dates:** Use relative offsets from `new Date()` at insert time, not hard-coded Sep 2026 seed dates — keeps oracle valid regardless of calendar day and avoids coupling to `seed.sql`.
- **Two Supabase clients:** service-role for setup/teardown (`auth: { persistSession: false }`); anon and authenticated admin for assertions — never share session state between them.
- **Admin provisioning:** `auth.admin.createUser` (or sign-up + allowlist insert via service role) with email on `admin_allowlist`; sign in to obtain authenticated client before assertions.
- **Skip gate:** If `process.env.SUPABASE_URL` (or project-specific test env vars) is unset, `describe.skipIf` or equivalent — log once: "Integration tests skipped: local Supabase not configured."

---

## Phase 1: Vitest bootstrap and Supabase harness

### Overview

Install Vitest, add standalone config with `@/*` path alias, test env loading, and reusable Supabase client factories. No integration assertions yet — prove the runner resolves `@/lib/services/events` imports.

### Changes Required

#### 1. Dependencies and scripts

**File:** `package.json`

**Intent:** Add Vitest as dev dependency and expose `npm test` / `npm test:watch` per test-plan §4.

**Contract:** New scripts `"test": "vitest run"`, `"test:watch": "vitest"`. Dev dependency `vitest` (pin stable 3.x or 4.x after local spike — avoid `getViteConfig` until Astro page tests needed).

#### 2. Vitest configuration

**File:** `vitest.config.ts` (new, repo root)

**Intent:** Run tests in Node with TypeScript ESM and `@/*` → `./src/*` alias matching `tsconfig.json` — without importing `getViteConfig` from Astro.

**Contract:** `test.environment: "node"`, `resolve.alias` for `@`, include pattern `tests/**/*.test.ts` (or `src/**/*.integration.test.ts` — pick one convention and use consistently).

#### 3. Test support module

**File:** `tests/helpers/supabase.ts` (new)

**Intent:** Centralize client creation and skip-if-not-configured logic so integration files stay focused on behavior.

**Contract:** Exports at minimum: `isSupabaseConfigured()`, `createServiceClient()`, `createAnonClient()`, `createAuthenticatedClient(email, password)` (or session from sign-in). Reads `SUPABASE_URL`, anon key, service role key from env (document vars in file header; values from `supabase status --output json` for local dev).

#### 4. Smoke test

**File:** `tests/smoke/vitest.test.ts` (new)

**Intent:** Verify Vitest runs and path alias resolves.

**Contract:** Trivial assertion (e.g. `expect(true).toBe(true)`) plus import of a type or named export from `@/lib/services/events` without executing DB calls.

### Success Criteria

#### Automated Verification

- `npm test` exits 0 and runs smoke test
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification

- Developer with Docker can copy env vars from `npx supabase status` into `.env.test` or shell and confirm helper module connects (optional one-liner script or comment in helper)

---

## Phase 2: Risk #1 — Public list not falsely empty (anon)

### Overview

Core Risk #1 proof: when fixture data contains two published-upcoming events, `listPublishedEvents(anonClient)` returns both — not zero, not a strict subset caused by broken filters.

### Test sub-phase 2a — Not falsely empty

| Field | Value |
|-------|-------|
| **Behavior asserted** | After inserting 2 published-upcoming fixture rows, `listPublishedEvents` returns `{ data }` with `data.length >= 2` and both fixture IDs present |
| **Regression caught** | Missing/wrong `.eq("status")` or `.gte("starts_at")`, broken query chain, silent empty due to filter bug |
| **Research source** | `research.md` Risk #1 "What would prove protection"; test-plan §2 Risk #1 |
| **Edge/boundary** | Assert against **fixture insert IDs**, not count from seed; use relative future `starts_at` so test is not date-flaky |
| **Anti-pattern avoided** | Asserting `length === 0` as expected; re-implementing `getStartOfTodayWarsawUtcIso()` as expected output; relying on `seed.sql` alone |

### Test sub-phase 2b — Excludes non-public rows (anon)

| Field | Value |
|-------|-------|
| **Behavior asserted** | Same call returns IDs matching **only** published-upcoming fixtures; excludes draft-upcoming and published-past control rows |
| **Regression caught** | Service returns drafts or past events to anon (broken status/date filters) |
| **Research source** | `research.md` recommended case #3; failure path B |
| **Edge/boundary** | Control rows use same city/subgenre as fixtures where possible — proves exclusion is status/date, not accidental city mismatch |
| **Anti-pattern avoided** | Happy-path-only (only asserting count ≥ 2 without checking excluded IDs appear absent) |

### Changes Required

#### 1. Fixture factory

**File:** `tests/helpers/event-fixtures.ts` (new)

**Intent:** Build insert payloads and track created IDs for cleanup; encode the **fixture contract** (published-upcoming ×2, draft-upcoming ×1, published-past ×1).

**Contract:** Returns `{ publishedUpcomingIds, draftUpcomingId, publishedPastId }` after insert via service client. Uses relative dates. Minimal required columns per `events` table schema.

#### 2. Integration test file

**File:** `tests/integration/fan-read-list.test.ts` (new)

**Intent:** Implement sub-phases 2a and 2b against `listPublishedEvents` with anon client.

**Contract:** `describe.skipIf(!isSupabaseConfigured())`; `beforeAll` seed fixtures; `afterAll` delete by tracked IDs; assertions use fixture ID sets, never `getStartOfTodayWarsawUtcIso()`.

### Success Criteria

#### Automated Verification

- `npm test` — fan-read list tests pass with local Supabase + env
- Tests skipped cleanly without Supabase env

#### Manual Verification

- Temporarily remove `.eq("status", "published")` in service — test fails (confirms signal, revert before commit)

---

## Phase 3: Risk #6 — Admin session on public read paths

### Overview

Prove admin-authenticated clients get the **same filtered results** as anon when calling public `*Published*` functions — RLS would allow all rows, but service filters must hold.

### Test sub-phase 3a — Admin list parity

| Field | Value |
|-------|-------|
| **Behavior asserted** | `listPublishedEvents(adminClient)` returns same published-upcoming ID set as anon; draft and past fixture IDs absent |
| **Regression caught** | Public pages wired to unfiltered queries; `.eq("status")` removed because "RLS handles it" |
| **Research source** | `research.md` Risk #6; `lessons.md` fan-read filters |
| **Edge/boundary** | Admin user confirmed on allowlist (`is_admin()` true via uid migration) — test fails loudly if admin setup wrong |
| **Anti-pattern avoided** | RLS test "admin can SELECT all rows" without calling `listPublishedEvents`; using `listEventsForAdmin` in public-path test |

### Test sub-phase 3b — Admin detail path

| Field | Value |
|-------|-------|
| **Behavior asserted** | `getPublishedEventById(adminClient, publishedPastId)` → `null`; `getPublishedEventById(adminClient, publishedUpcomingId)` → event |
| **Regression caught** | Detail page refactor to `getEventById` exposes past/draft events to admin on `/events/[id]` |
| **Research source** | `research.md` call graph `events/[id].astro` → `getPublishedEventById`; recommended case #5 |
| **Edge/boundary** | Past event ID is known to exist in DB (inserted by fixture) but must not be returned by published getter |
| **Anti-pattern avoided** | Testing only list, not detail entry point |

### Test sub-phase 3c — Admin city dropdown

| Field | Value |
|-------|-------|
| **Behavior asserted** | `listDistinctCities(adminClient)` includes cities from published-upcoming fixtures only; excludes city exclusive to draft-only or past-only control row if applicable |
| **Regression caught** | City filter dropdown shows draft/past venues on homepage for admin |
| **Research source** | `research.md` recommended case #6; `index.astro` → `listDistinctCities` |
| **Edge/boundary** | If control rows share city with fixtures, assert count/subset logic carefully — prefer unique city on draft-only row for clear signal |
| **Anti-pattern avoided** | Mirror implementation (re-copying `.eq`/`.gte` in test expectations instead of fixture-derived city set) |

### Changes Required

#### 1. Admin session helper

**File:** `tests/helpers/supabase.ts` (extend)

**Intent:** Create authenticated admin client for integration tests.

**Contract:** Creates user if needed, ensures allowlist row, returns signed-in `SupabaseClient`. Document dependency on migration `20260611140000_fix_is_admin_use_uid.sql`.

#### 2. Integration test files

**File:** `tests/integration/fan-read-admin.test.ts` (new) — sub-phases 3a–3c

**Intent:** Reuse fixtures from Phase 2 (shared setup module or import fixture factory) and assert admin parity on all three public read functions.

**Contract:** Same skip/cleanup pattern as Phase 2; do **not** call `listEventsForAdmin` / `getEventById`.

### Success Criteria

#### Automated Verification

- `npm test` — admin fan-read tests pass with local Supabase
- With admin filters removed in service (manual probe), admin test fails

#### Manual Verification

- Sign in as seed admin in browser on `/` — still see only published upcoming (sanity; not automated in Phase 1)

---

## Phase 4: Cookbook and test-plan §6 sync

### Overview

Ship durable patterns so future tests (Phase 2 rollout, `/10x-tdd`) follow the same harness. Final sub-phase per user request.

### Changes Required

#### 1. Test-plan cookbook

**File:** `context/foundation/test-plan.md`

**Intent:** Replace §6.2 TBD and add §6.6 phase notes with concrete patterns from this change.

**Contract §6.2 — Adding an integration test:**

- File location: `tests/integration/*.test.ts`
- Prerequisites: local Supabase, env vars documented in `tests/helpers/supabase.ts`
- Use service-role fixture insert + tracked cleanup — do not rely on seed alone
- Oracle from fixture contract (inserted IDs/status/dates), not production helper re-implementation
- Call public service entry points (`listPublishedEvents`, `getPublishedEventById`, `listDistinctCities`) with real clients
- Skip when env unset until Phase 4 CI wiring
- Anti-patterns: RLS-only assertions, mocking service internals, asserting empty without proving data absent

**Contract §6.6 — Per-rollout-phase notes:**

- Phase 1 shipped: fan-read integration pattern; Vitest standalone config; Supabase harness paths

#### 2. Optional contributor note

**File:** `tests/README.md` (new, brief)

**Intent:** One-page setup: Docker, `supabase start`, env export, `npm test`.

**Contract:** ≤30 lines; link to test-plan §6.2.

### Success Criteria

#### Automated Verification

- `npm test` still passes
- `npm run lint` passes

#### Manual Verification

- §6.2 and §6.6 in test-plan read as actionable without opening research.md

---

## Testing Strategy

### Integration (primary)

- Fan-read list not empty + exclusion (anon) — Risk #1
- Admin parity on list, detail, cities — Risk #6
- All use fixture oracle independent of `getStartOfTodayWarsawUtcIso()`

### Unit

- None in Phase 1 (cost × signal: integration catches the documented failure modes)

### Manual probing (during implement)

1. Break service filter → confirm test fails
2. Run without Supabase → confirm skip + exit 0
3. Verify migration applied before admin tests

## Performance Considerations

- Single fixture setup per file (`beforeAll`); minimal row count (4–5 rows)
- No parallel integration files against same tables without isolation (sequential Vitest file scope is sufficient for MVP)

## Migration Notes

- Ensure `20260611140000_fix_is_admin_use_uid.sql` applied locally before admin integration tests: `npx supabase db reset` or `migration up`
- No application schema changes in this change

## References

- Research: `context/changes/testing-critical-path-fan-read/research.md`
- Test plan: `context/foundation/test-plan.md` §2–§4, §6
- Service: `src/lib/services/events.ts`
- Lessons: `context/foundation/lessons.md` (fan-read filters)
- RLS: `supabase/migrations/20260610100000_create_events.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Vitest bootstrap and Supabase harness

#### Automated

- [x] 1.1 `npm test` exits 0 and runs smoke test — 49e0234
- [x] 1.2 `npm run lint` passes — 49e0234
- [x] 1.3 `npm run build` passes — 49e0234

#### Manual

- [x] 1.4 Developer can connect helpers to local Supabase using documented env vars — 49e0234

### Phase 2: Risk #1 — Public list not falsely empty (anon)

#### Automated

- [x] 2.1 Fan-read list tests pass with local Supabase + env (sub-phases 2a, 2b) — 5481a1b
- [x] 2.2 Tests skipped cleanly without Supabase env — 5481a1b

#### Manual

- [ ] 2.3 Removing `.eq("status", "published")` causes test failure (probe then revert)

### Phase 3: Risk #6 — Admin session on public read paths

#### Automated

- [x] 3.1 Admin fan-read tests pass (sub-phases 3a–3c) — 1e09382

#### Manual

- [ ] 3.2 Removing service date filter causes admin test failure (probe then revert)

### Phase 4: Cookbook and test-plan §6 sync

#### Automated

- [x] 4.1 `npm test` still passes after doc updates
- [x] 4.2 `npm run lint` passes

#### Manual

- [x] 4.3 test-plan §6.2 and §6.6 are actionable standalone

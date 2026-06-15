# Authorization and data integrity — Implementation Plan

## Overview

Rollout Phase 2 from `context/foundation/test-plan.md`: add integration and unit tests proving non-admin clients cannot mutate `events` (Risk #4), allowlisted admins can (Risk #5), and scoped deletes change row count by exactly one (Risk #3). Reuse Vitest + localhost Supabase harness from Phase 1; target `createEvent` / `updateEvent` / `deleteEvent` and `requireAdmin` — not Astro page rendering or full HTTP API harness.

## Current State Analysis

- **Test base:** Vitest 3.2.x, `tests/helpers/supabase.ts` (anon/service/admin, localhost guard), `tests/integration/fan-read-*.test.ts`, `tests/helpers/event-fixtures.ts` (read fixtures only).
- **Mutation paths:** `POST/PUT/DELETE /api/admin/events*` → `requireAdmin` → service mutations → RLS `events_*_admin` policies (`supabase/migrations/20260610100000_create_events.sql`).
- **Admin check:** `resolveIsAdmin` → RPC `is_admin()` (uid + allowlist join, migration `20260611140000_fix_is_admin_use_uid.sql`).
- **No mutation tests yet;** CI still lint + build only (test gate wiring is rollout Phase 4).

### Key Discoveries

- Middleware on `/admin` does **not** protect direct Supabase/service calls — RLS + service tests are mandatory (research Risk #4).
- `createEvent` / `updateEvent` call `resolveCoordinates` — mutation fixtures must use **`locationMode: "coordinates"`** to avoid Nominatim HTTP.
- Service-first mutation tests are sufficient; raw `.from("events").insert` RLS probes deferred unless service errors are ambiguous (research open item resolved).
- `deleteEvent` always uses `.eq("id", id)` — count-delta oracle proves Risk #3 for application path.

## Desired End State

After this plan completes:

1. `npm test` runs new integration suites when `.env.test` + local Supabase available; skips gracefully otherwise.
2. Tests fail if anon or non-admin clients can create, update, or delete events via service functions (Risk #4).
3. Tests fail if allowlisted admin cannot `rpc("is_admin")` or mutate events (Risk #5).
4. Tests fail if `deleteEvent` removes more than one row or succeeds on missing id without error semantics (Risk #3).
5. `requireAdmin` unit tests catch 401/403 without Astro request harness.
6. `context/foundation/test-plan.md` §6.4 documents mutation/auth integration pattern.

### Verification

- `npm test` — all tests pass with local Supabase + `.env.test`.
- `npm test` — integration suites skipped (exit 0) without env.
- `npm run lint` passes.

## What We're NOT Doing

- Astro `POST /api/admin/events` HTTP integration (defer — `requireAdmin` unit + service integration sufficient).
- Middleware redirect tests for `/admin` pages.
- Migration replay / `db reset` automation.
- Raw RLS-only tests without calling service mutation functions.
- Mocking Supabase or service internals.
- CI hard-fail on integration tests (rollout Phase 4).
- E2E / Playwright.
- Testing admin panel UI chrome (test-plan §7 exclusion).

## Implementation Approach

Sub-phases ordered by **cost × signal** and **dependency** (harness → deny → allow → integrity → docs):

| Order | Sub-phase                       | Cost   | Signal      | Risk           |
| ----- | ------------------------------- | ------ | ----------- | -------------- |
| 1     | Harness + `requireAdmin` unit   | Low    | Enables all | #5 (API guard) |
| 2     | Non-admin mutation denied       | Medium | Highest     | #4             |
| 3     | Admin mutation + `is_admin` RPC | Medium | High        | #5             |
| 4     | Scoped delete count stability   | Low    | Medium      | #3             |
| 5     | Cookbook §6.4 + test-plan sync  | Low    | Durability  | —              |

Fixture contract: service-role inserts tracked rows; mutation attempts use **fixture IDs** or **unique name prefix** (`integration-auth-mutation`); cleanup deletes **only** tracked IDs.

## Critical Implementation Details

- **Non-admin user:** `integration-auth-nonadmin@example.com` — distinct from fan-read admin email; created via `auth.admin.createUser` **without** allowlist row.
- **Count oracle:** `countEvents(serviceClient)` before/after delete — assert `after === before - 1` for successful single-id delete; unchanged on failed delete.
- **Update patch:** minimal field change (e.g. `name`) to prove row unchanged on denied update — read back via `getEventById(serviceClient, id)`.
- **Prerequisite:** migration `20260611140000_fix_is_admin_use_uid.sql` applied locally.

---

## Phase 1: Harness extensions and API guard unit tests

### Overview

Extend Supabase helpers and add mutation fixture builders; prove `requireAdmin` returns correct HTTP responses without DB.

### Changes Required

#### 1. Non-admin client helper

**File:** `tests/helpers/supabase.ts`

**Intent:** Provision authenticated user **not** on `admin_allowlist` for Risk #4 tests.

**Contract:** Export `createNonAdminClient()` — `auth.admin.createUser` with `INTEGRATION_NON_ADMIN_EMAIL` / password; no allowlist upsert; sign in and return client. Localhost guard unchanged.

#### 2. Mutation fixture module

**File:** `tests/helpers/mutation-fixtures.ts` (new)

**Intent:** Build `ParsedEventCreate` payloads and DB helpers for mutation tests.

**Contract:** Exports at minimum: `buildMutationCreatePayload(label?)` → `ParsedEventCreate` with `locationMode: "coordinates"`, fixed lat/lng, relative future `startsAt` (ISO string acceptable to `parseEventCreate` / service); `countEvents(serviceClient)` → number; `insertMutationFixtureRow(serviceClient)` → `{ id }` for update/delete targets (service-role insert, coordinates mode, unique name prefix `integration-auth-mutation`).

#### 3. Unit tests for API guard

**File:** `tests/unit/require-admin.test.ts` (new)

**Intent:** Lock `requireAdmin` / `requireAuth` behavior without Astro.

**Contract:** Mock `APIContext["locals"]`: no user → 401 + JSON error; user + `isAdmin: false` → 403; user + `isAdmin: true` → `null`. No Supabase calls.

### Success Criteria

#### Automated Verification

- `npm test` — unit tests pass (no Supabase required)
- `npm run lint` passes

#### Manual Verification

- None required

---

## Phase 2: Risk #4 — Non-admin cannot mutate events

### Overview

Prove anon and authenticated non-admin clients cannot create, update, or delete events through service functions.

### Test sub-phase 2a — Create denied

| Field                    | Value                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Behavior asserted**    | `createEvent(anonClient, payload)` and `createEvent(nonAdminClient, payload)` return `{ error }`; no row with fixture name in DB (service-role select) |
| **Regression caught**    | RLS or service allows INSERT for non-admin                                                                                                             |
| **Edge/boundary**        | Coordinates mode payload — no geocode network                                                                                                          |
| **Anti-pattern avoided** | Only testing `/admin` redirect                                                                                                                         |

### Test sub-phase 2b — Update and delete denied

| Field                    | Value                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Behavior asserted**    | After service-role insert fixture: `updateEvent(nonAdminClient, id, { name: "…" })` → error; `deleteEvent(nonAdminClient, id)` → error; row still present unchanged |
| **Regression caught**    | UPDATE/DELETE policies bypassed at service layer                                                                                                                    |
| **Edge/boundary**        | Same fixture id for both operations                                                                                                                                 |
| **Anti-pattern avoided** | Happy-path-only create denial without update/delete                                                                                                                 |

### Changes Required

#### 1. Integration test file

**File:** `tests/integration/auth-mutation-deny.test.ts` (new)

**Intent:** Implement sub-phases 2a and 2b.

**Contract:** `describe.skipIf(!isSupabaseConfigured())`; `afterAll` deletes any rows created by service-role setup only; assertions via service functions, not raw SQL.

### Success Criteria

#### Automated Verification

- `npm test` — deny tests pass with local Supabase + env
- Tests skipped cleanly without Supabase env

#### Manual Verification

- Temporarily drop `events_insert_admin` policy locally — test fails (probe then revert) — optional

---

## Phase 3: Risk #5 — Admin can mutate and `is_admin` RPC

### Overview

Prove allowlisted admin session passes `is_admin()` and can create, update, and delete via service functions.

### Test sub-phase 3a — RPC and create

| Field                    | Value                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Behavior asserted**    | `adminClient.rpc("is_admin")` → `true`; `nonAdminClient.rpc("is_admin")` → `false`; `createEvent(adminClient, payload)` → `{ data }` with id |
| **Regression caught**    | Allowlist / uid migration regression; admin cannot persist                                                                                   |
| **Anti-pattern avoided** | Allowlist row without signed-in session                                                                                                      |

### Test sub-phase 3b — Update and delete

| Field                    | Value                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Behavior asserted**    | `updateEvent(adminClient, id, patch)` succeeds; `deleteEvent(adminClient, id)` succeeds; fixture id absent after delete |
| **Regression caught**    | Admin UPDATE/DELETE broken while INSERT works                                                                           |
| **Anti-pattern avoided** | Testing only RPC without mutation                                                                                       |

### Changes Required

#### 1. Integration test file

**File:** `tests/integration/auth-mutation-allow.test.ts` (new)

**Intent:** Implement sub-phases 3a and 3b.

**Contract:** Use `createAdminClient()`; track all created ids for cleanup; reuse `buildMutationCreatePayload` / `insertMutationFixtureRow`.

### Success Criteria

#### Automated Verification

- `npm test` — allow tests pass with local Supabase

#### Manual Verification

- None required

---

## Phase 4: Risk #3 — Scoped delete count stability

### Overview

Prove `deleteEvent` affects exactly one row and failed deletes leave count unchanged.

### Test sub-phase 4a — Single-row delete delta

| Field                    | Value                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Behavior asserted**    | `countEvents` before delete; `deleteEvent(admin, fixtureId)` success; `countEvents` after === before - 1 |
| **Regression caught**    | Unscoped delete in service or test cleanup                                                               |
| **Anti-pattern avoided** | Asserting absolute seed count                                                                            |

### Test sub-phase 4b — Missing id

| Field                 | Value                                                           |
| --------------------- | --------------------------------------------------------------- |
| **Behavior asserted** | `deleteEvent(admin, randomUuid)` → `{ error }`; count unchanged |
| **Regression caught** | Silent no-op on missing row treated as success                  |

### Changes Required

#### 1. Integration test file

**File:** `tests/integration/data-integrity-delete.test.ts` (new)

**Intent:** Implement sub-phases 4a and 4b.

**Contract:** Reuse `countEvents`, `insertMutationFixtureRow`, `createAdminClient`; cleanup tracked ids only.

### Success Criteria

#### Automated Verification

- `npm test` — data-integrity tests pass with local Supabase

#### Manual Verification

- None required

---

## Phase 5: Cookbook and test-plan §6 sync

### Overview

Document mutation/auth integration pattern for future rollout phases.

### Changes Required

#### 1. Test-plan cookbook §6.4

**File:** `context/foundation/test-plan.md`

**Intent:** Replace §6.4 TBD with concrete mutation/auth pattern.

**Contract:** File locations; harness (`createNonAdminClient`, `mutation-fixtures`); service entry points; coordinates-mode fixtures; count-delta oracle; localhost-only; anti-patterns (middleware-only, unscoped delete).

#### 2. §6.6 phase note

**File:** `context/foundation/test-plan.md`

**Intent:** Append Phase 2 shipped paths under §6.6.

**Contract:** List new test files and helpers.

#### 3. Optional README pointer

**File:** `tests/README.md`

**Intent:** One line linking §6.4 for mutation tests.

**Contract:** ≤3 lines added.

### Success Criteria

#### Automated Verification

- `npm test` still passes
- `npm run lint` passes

#### Manual Verification

- §6.4 actionable without opening research.md

---

## Testing Strategy

### Unit

- `requireAdmin` / `requireAuth` — 401, 403, pass-through

### Integration

- Risk #4: create/update/delete denied (anon + non-admin)
- Risk #5: `is_admin` RPC + admin create/update/delete
- Risk #3: count delta on delete; error on missing id

### Manual probing (optional during implement)

1. Break RLS insert policy → deny test fails
2. Remove allowlist row for admin user → allow tests fail

## Performance Considerations

- Minimal fixture rows per file; single `beforeAll` where possible
- No parallel integration files mutating same tables without isolation (sequential file scope sufficient)

## Migration Notes

- Ensure `20260611140000_fix_is_admin_use_uid.sql` applied: `npx supabase migration up` or `db reset`
- No application schema changes in this change

## References

- Research: `context/changes/testing-authorization-data-integrity/research.md`
- Test plan: `context/foundation/test-plan.md` §2–§4, §6
- Prior harness: `context/archive/2026-06-11-testing-critical-path-fan-read/`
- Service: `src/lib/services/events.ts`
- Guards: `src/lib/auth/guards.ts`, `src/lib/auth/admin.ts`
- RLS: `supabase/migrations/20260610100000_create_events.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Harness extensions and API guard unit tests

#### Automated

- [x] 1.1 `npm test` — unit tests pass without Supabase — b4eccc5
- [x] 1.2 `npm run lint` passes — b4eccc5

#### Manual

- [x] 1.3 None — b4eccc5

### Phase 2: Risk #4 — Non-admin cannot mutate events

#### Automated

- [x] 2.1 Deny mutation tests pass with local Supabase + env (sub-phases 2a, 2b) — 5d4dcec
- [x] 2.2 Tests skipped cleanly without Supabase env — 5d4dcec

#### Manual

- [ ] 2.3 Optional RLS probe causes test failure (probe then revert)

### Phase 3: Risk #5 — Admin can mutate and is_admin RPC

#### Automated

- [x] 3.1 Allow mutation + RPC tests pass (sub-phases 3a, 3b) — e364061

#### Manual

- [x] 3.2 None — e364061

### Phase 4: Risk #3 — Scoped delete count stability

#### Automated

- [x] 4.1 Data-integrity delete tests pass (sub-phases 4a, 4b) — f0c7127

#### Manual

- [x] 4.2 None — f0c7127

### Phase 5: Cookbook and test-plan §6 sync

#### Automated

- [x] 5.1 `npm test` still passes after doc updates — de62bb2
- [x] 5.2 `npm run lint` passes — de62bb2

#### Manual

- [x] 5.3 §6.4 actionable standalone — de62bb2

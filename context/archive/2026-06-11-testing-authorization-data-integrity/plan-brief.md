# Authorization and data integrity — Plan Brief

> Full plan: `context/changes/testing-authorization-data-integrity/plan.md`
> Research: `context/changes/testing-authorization-data-integrity/research.md`

## What & Why

Rollout Phase 2 adds tests so only admins can change events in the database, admins who should have access actually can, and deleting one event never wipes the whole table. This protects against the worst authorization and data-loss failures (risks #3, #4, #5 in the test plan).

## Starting Point

Phase 1 shipped Vitest, localhost Supabase harness, and fan-read integration tests. Mutation APIs exist (`requireAdmin` + `createEvent` / `updateEvent` / `deleteEvent`) with RLS admin policies, but nothing tests write paths yet.

## Desired End State

`npm test` runs unit tests for `requireAdmin` and integration tests that prove anon/non-admin cannot mutate, admin can, and scoped delete changes row count by exactly one. Cookbook §6.4 documents how to add the next auth test.

## Key Decisions Made

| Decision          | Choice                                   | Why (1 sentence)                                                   | Source          |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------ | --------------- |
| Test layer        | Service integration + guard unit         | Catches RLS bypass and API guard without Astro HTTP harness        | Research        |
| Raw RLS probes    | Service-first only                       | Service is what API calls; duplicate signal low                    | Research / Plan |
| Mutation fixtures | `mutation-fixtures.ts`, coordinates mode | Avoids Nominatim; separate from fan-read read fixtures             | Research        |
| Non-admin user    | Dedicated `createNonAdminClient()`       | Distinct email, no allowlist row                                   | Research        |
| Risk #3 scope     | Count-delta on `deleteEvent`             | Proves scoped delete; migration smoke deferred                     | Research        |
| HTTP API tests    | Deferred                                 | `requireAdmin` unit + service tests sufficient under cost × signal | Research        |

## Scope

**In scope:** harness extensions, `requireAdmin` unit tests, integration deny/allow mutation suites, delete count stability, test-plan §6.4 + §6.6.

**Out of scope:** Astro API route tests, middleware page redirects, migration automation, CI wiring, E2E, admin UI.

## Architecture / Approach

```
requireAdmin (unit) ──► API routes (not integration-tested here)
                              │
createEvent / updateEvent / deleteEvent ◄── integration tests
                              │
                         Supabase RLS (events_*_admin)
```

Tests use localhost-only clients from Phase 1 harness; fixtures inserted/deleted by service role with tracked IDs.

## Phases at a Glance

| Phase                   | What it delivers                                                | Key risk                         |
| ----------------------- | --------------------------------------------------------------- | -------------------------------- |
| 1. Harness + unit guard | `createNonAdminClient`, mutation fixtures, `requireAdmin` tests | None (no DB)                     |
| 2. Mutation denied      | Anon + non-admin cannot CUD                                     | False negative if only UI tested |
| 3. Admin allow          | `is_admin` RPC + admin CUD                                      | uid migration not applied        |
| 4. Delete integrity     | Count delta exactly 1                                           | Unscoped cleanup                 |
| 5. Cookbook             | §6.4 + §6.6 docs                                                | —                                |

**Prerequisites:** Docker + local Supabase, `.env.test`, migration `20260611140000` applied.

**Estimated effort:** ~2–3 sessions across 5 phases (similar footprint to Phase 1 fan-read).

## Open Risks & Assumptions

- Local migration `20260611140000_fix_is_admin_use_uid.sql` must be applied (uncommitted in repo at plan time — apply before Phase 3).
- Service error messages on RLS denial must be assertable as `{ error }` (not throw).

## Success Criteria (Summary)

- Non-admin cannot create/update/delete events via service layer.
- Admin passes `is_admin()` and can mutate.
- Single delete changes event count by exactly one.
- `requireAdmin` returns 401/403 correctly.

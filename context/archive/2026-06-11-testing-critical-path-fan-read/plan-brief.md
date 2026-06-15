# Critical-path fan read — Plan Brief

> Full plan: `context/changes/testing-critical-path-fan-read/plan.md`
> Research: `context/changes/testing-critical-path-fan-read/research.md`

## What & Why

Fans must see every published upcoming event when data exists (Risk #1), and admins browsing public pages must not see drafts or past events (Risk #6). The project has zero tests today. Phase 1 bootstraps Vitest and adds the cheapest high-signal layer: integration tests on `*Published*` service functions with real local Supabase fixtures.

## Starting Point

No test runner or test files. Fan-read filters already exist in `src/lib/services/events.ts`, but RLS widens visibility for admins — service-layer filters are the regression surface. Pages (`index.astro`, `events/[id].astro`) are thin wrappers around those functions.

## Desired End State

`npm test` runs integration tests that fail on falsely empty lists and on admin leakage of draft/past events. Tests use fixture insert contracts, not re-implementations of date helpers. `test-plan.md` §6.2 documents how to add the next integration test.

## Key Decisions Made

| Decision            | Choice                                  | Why (1 sentence)                                                           | Source               |
| ------------------- | --------------------------------------- | -------------------------------------------------------------------------- | -------------------- |
| Test runner         | Vitest standalone (Node env)            | Avoids Astro 6 + `getViteConfig` CJS crash; service tests don't need Astro | Research             |
| Test layer          | Integration (service + DB)              | Catches filter/wiring bugs unit tests and RLS-only tests miss              | Research / Test-plan |
| Fixture oracle      | Insert contract with relative dates     | Independent of `getStartOfTodayWarsawUtcIso()` and seed.sql calendar       | Research             |
| CI behavior         | Skip integration if env unset           | Phase 4 wires CI; don't block lint/build now                               | Research             |
| Page/env-null tests | Deferred                                | Lower signal per cost; service integration covers filter bugs              | Plan                 |
| Admin setup         | Real auth + allowlist via uid migration | Matches production `is_admin()` behavior                                   | Research             |

## Scope

**In scope:** Vitest bootstrap, Supabase harness, Risk #1 list tests (anon), Risk #6 admin tests (list/detail/cities), test-plan §6 cookbook update.

**Out of scope:** E2E, Astro page tests, CI gate (Phase 4), fan URL filters, Warsaw midnight boundary test, RLS-only tests, admin panel paths.

## Architecture / Approach

```
tests/helpers/supabase.ts     → clients (service, anon, admin)
tests/helpers/event-fixtures.ts → insert contract + cleanup
tests/integration/*.test.ts   → call listPublishedEvents / getPublishedEventById / listDistinctCities
src/lib/services/events.ts  → system under test (no mocks)
local Supabase (PostgREST)   → real DB edge
```

Sub-phases ordered: bootstrap → Risk #1 not empty → Risk #1 exclusion → Risk #6 list → detail → cities → §6 docs.

## Phases at a Glance

| Phase            | What it delivers                       | Key risk                         |
| ---------------- | -------------------------------------- | -------------------------------- |
| 1. Bootstrap     | Vitest + Supabase helpers + smoke test | Wrong path alias / env loading   |
| 2. Risk #1 anon  | List not empty; excludes draft/past    | False green from seed coupling   |
| 3. Risk #6 admin | Same filters with admin session        | RLS-only false confidence        |
| 4. Cookbook      | test-plan §6.2 + §6.6                  | Patterns not durable for Phase 2 |

**Prerequisites:** Docker, local Supabase, migration `20260611140000_fix_is_admin_use_uid.sql` applied.

**Estimated effort:** ~1–2 sessions (4 plan phases).

## Open Risks & Assumptions

- Vitest version pin may need spike if ESM resolution issues appear on Windows/Node 22.
- Admin test user provisioning approach (createUser vs seed email) chosen at implement time.
- Warsaw JS vs SQL date boundary remains documented but untested unless cheap.

## Success Criteria (Summary)

- Tests fail when published-upcoming fixtures exist but list returns empty or subset (Risk #1).
- Admin client cannot read draft/past via `*Published*` functions (Risk #6).
- §6.2 cookbook enables Phase 2 auth tests without re-researching harness.

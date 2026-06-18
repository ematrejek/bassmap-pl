# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-18

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the team
   is worried about X, and the failure would surface somewhere in the fan
   discovery or events data path" carry the same weight as PRD lines or
   hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents _what
   could fail_ and _why we believe it's likely_ \u2013 drawn from documents,
   interview, and codebase _signal_ (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/`, `supabase/`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the _evidence that surfaced
this risk_ \u2013 never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| #   | Risk (failure scenario)                                                                                 | Impact | Likelihood | Source (evidence \u2013 not anchor)                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Fan sees an **empty event list** although published upcoming events exist in the database               | High   | High       | interview Q1; PRD guardrails; `lessons.md` (explicit fan-read filters); hot-spot dir `src/lib/services` (4 commits/30d) |
| 2   | Fan sees **wrong map locations** (pin in the wrong place or incorrect city fallback)                    | High   | Medium     | interview Q1; PRD "wrong info is worse than no info"; hot-spot dir `src/lib/events` (8 commits/30d)                     |
| 3   | **Events disappear** or the public list "resets" after a code change or deploy                          | High   | Medium     | interview Q1, Q3; hot-spot dir `supabase/migrations` (7 commits/30d)                                                    |
| 4   | A **non-admin user** can create, edit, or delete events                                                 | High   | Medium     | interview Q1; PRD Access Control + FR-006/007; abuse lens (authorization)                                               |
| 5   | An **admin in the database** cannot access the admin panel (403 / unauthorized)                         | Medium | Medium     | interview Q2 (already occurred); hot-spot dir `src/pages/api` (5 commits/30d)                                           |
| 6   | A logged-in admin on public pages sees **drafts or past events** instead of only public upcoming events | Medium | Medium     | `lessons.md`; PRD guardrails                                                                                            |
| 7   | Untrusted API input (invalid subgenres, dates) passes validation and corrupts list or map data          | Medium | Low        | PRD Business Logic (25 subgenres, upcoming rule); hot-spot dir `src/pages/api`                                          |

### Risk Response Guidance

| Risk | What would prove protection                                                                                                  | Must challenge                                       | Context `/10x-research` must ground                                                           | Likely cheapest layer               | Anti-pattern to avoid                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| #1   | Public list returns every published upcoming event when seed/fixture data says they exist; empty only when data truly absent | "RLS alone is enough for fan read"                   | Fan-read entry point, filter predicates (`published`, upcoming), session vs anon client shape | integration (service + DB fixture)  | Asserting empty because the test copied production filter bugs |
| #2   | Coordinates and city-centre fallback match business rules for events with/without lat/lng                                    | "Geocode at save time means runtime never lies"      | Mapper output, fallback table, events missing coordinates                                     | unit on pure mapping/fallback logic | E2E map screenshot where unit on mapper suffices               |
| #3   | Mutations and migrations do not wipe or hide the full events table; list count stable after guarded operations               | "DELETE in test cleanup equals production data loss" | Which operations are destructive, migration idempotency, seed contract                        | integration + seed smoke            | Happy-path-only CRUD without delete/count assertions           |
| #4   | Anonymous and authenticated non-admin clients cannot INSERT/UPDATE/DELETE on events                                          | "Middleware on `/admin` is enough"                   | RLS policies, API route guards, direct Supabase client paths                                  | integration (RLS + API)             | Only testing the admin UI route, not the data layer            |
| #5   | Allowlisted admin reaches admin routes; non-admin gets 403                                                                   | "Row in admin table implies `is_admin()` true"       | Auth session, RPC/allowlist check, middleware guard chain                                     | integration                         | Testing only the login form, not post-login authorization      |
| #6   | Public read paths filter `published` + upcoming even when session belongs to admin                                           | "Logged-in user uses the same query as anon"         | Service-layer filters vs RLS-only reliance                                                    | integration                         | Relying on RLS test while service omits explicit filters       |
| #7   | Server rejects out-of-catalog subgenres and invalid dates before persist                                                     | "Zod on client is enough"                            | Validation schema, API handler boundary                                                       | unit on validation                  | Snapshot of error message copied from implementation           |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| #   | Phase name                       | Goal (one line)                                                                               | Risks covered | Test types              | Status | Change folder                        |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------- | ------------- | ----------------------- | ------ | ------------------------------------ |
| 1   | Critical-path fan read           | Bootstrap Vitest; prove fan list is not falsely empty and respects published/upcoming filters | #1, #6        | bootstrap + integration | done   | testing-critical-path-fan-read       |
| 2   | Authorization and data integrity | Non-admin cannot mutate events; admin access works; no mass data loss on guarded paths        | #3, #4, #5    | integration             | done   | testing-authorization-data-integrity |
| 3   | Location and discovery hot-spots | Correct coordinates/fallback; reject bad input at API boundary                                | #2, #7        | unit + integration      | done   | testing-location-discovery           |
| 4   | Quality-gates wiring             | `npm test` required in CI alongside lint + build                                              | cross-cutting | CI gate                 | done   | testing-quality-gates-wiring         |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.
Recommendations in this section must be grounded in local manifests/configs
plus the MCP/tools actually exposed in the current session.

| Layer                | Tool                        | Version  | Notes                                                       |
| -------------------- | --------------------------- | -------- | ----------------------------------------------------------- |
| unit + integration   | Vitest                      | 3.2.x    | standalone `vitest.config.ts` (Node); see `tests/README.md` |
| API mocking          | MSW or Supabase test client | TBD      | Mock at HTTP/DB edge only; do not mock internal modules     |
| e2e                  | Playwright                  | none yet | Defer until integration cannot catch the failure mode       |
| accessibility        | axe-core                    | none yet | Not in initial rollout                                      |
| (optional) AI-native | none                        | n/a      | Not justified under cost × signal for this rollout          |

**Stack grounding tools (current session):**

- Docs: none (Context7 / framework docs MCP not available in session) \u2013 skipped; checked: 2026-06-11
- Search: WebSearch \u2013 available; Vitest + Astro SSR patterns to verify during Phase 1 research; checked: 2026-06-11
- Runtime/browser: none (Playwright MCP not available in session) \u2013 not used in initial phases; checked: 2026-06-11
- Provider/platform: GitHub Actions (`.github/workflows/ci.yml`, `deploy.yml`) \u2013 lint + `npm test` + build; checked: 2026-06-12

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase N" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate                        | Where                | Required?   | Catches                                                   |
| --------------------------- | -------------------- | ----------- | --------------------------------------------------------- |
| lint + typecheck            | local + CI           | required    | syntactic / type drift                                    |
| unit + integration          | local + CI + deploy  | required    | logic regressions on fan read, auth, location, validation |
| e2e on critical flows       | CI on PR             | planned     | defer until integration gaps proven                       |
| post-edit hook              | local (agent loop)   | not planned | \u2013                                                         |
| visual diff (deterministic) | CI on PR             | not planned | \u2013                                                         |
| multimodal visual review    | CI on PR             | not planned | \u2013                                                         |
| pre-prod smoke              | between merge + prod | optional    | environment-specific failures (manual today)              |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD \u2013 see §3 Phase N."

### 6.1 Adding a unit test

Use this pattern for **pure logic** tests \u2013 map fallback, Zod parsers, URL
filter sanitization, datetime helpers (shipped in
`testing-location-discovery`). No Supabase, no Docker, no mocks of internals.

**Where:** `tests/unit/*.test.ts`

**Prerequisites:**

- `npm test` only \u2013 no `.env.test` required for unit suites
- Import production code via `@/…` path alias (see `vitest.config.ts`)

**Steps:**

1. Create `tests/unit/<domain>.test.ts` next to existing unit specs.
2. Import the function under test from `src/lib/…` (e.g. `resolveMapCoordinates`,
   `parseEventCreate`, `parseFanFilters`, `parseDatetimeLocalWarsaw`).
3. Use table-driven `it(…)` cases with explicit oracles \u2013 expected coordinates,
   `success: false`, filtered arrays, `null` parse results.
4. For invalid admin payloads, spread `buildMutationCreatePayload()` from
   `tests/helpers/mutation-fixtures.ts` and override one field (no DB).
5. Label sub-phases in test titles when mapping to rollout risks (e.g. `(2a)`).

**Reuse:**

- `tests/unit/require-admin.test.ts` \u2013 mock `App.Locals` for API guards
- `tests/helpers/mutation-fixtures.ts` \u2013 valid `ParsedEventCreate` baseline

**Anti-patterns:**

- Calling Supabase or starting Docker for pure functions
- Leaflet / component mount tests when a `src/lib/` helper is the oracle
- Snapshotting Zod error strings copied from implementation
- `as unknown` casts when `parse*(input: unknown)` already accepts the payload

**CI:** Unit suites always run in CI. Integration behavior (CI hard-fail vs local
skip) \u2013 see §6.2.

### 6.2 Adding an integration test

Use this pattern for service + local Supabase tests (fan read shipped in
`testing-critical-path-fan-read`).

**Where:** `tests/integration/*.test.ts`

**Prerequisites:**

- Docker + `npx supabase start`
- `.env.test` with `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  (see `tests/helpers/supabase.ts` and `.env.test.example`)
- Localhost only \u2013 integration refuses production URLs

**Steps:**

1. Gate with `describe.skipIf(!isSupabaseConfigured())` and call
   `logSkipIfNotConfigured()` once when skipped.
2. `beforeAll`: insert fixtures via `createServiceClient()` (service role).
3. `afterAll`: delete **only** tracked fixture IDs \u2013 never `DELETE` without
   `.in("id", …)`.
4. Assert via public service entry points (`listPublishedEvents`,
   `getPublishedEventById`, `listDistinctCities`, …) using anon or
   `createAdminClient()` \u2013 not admin-only getters on public-path tests.
5. Oracle = fixture contract (inserted IDs, status, relative `starts_at`) \u2013
   do not re-implement `getStartOfTodayWarsawUtcIso()` in expectations.

**Reuse:** `tests/helpers/event-fixtures.ts` for fan-read rows; extend or
copy the factory for new domains.

**Anti-patterns:**

- RLS-only SQL without calling the service under test
- Mocking service internals or Supabase at module level
- Asserting empty list without proving fixture rows exist
- Pointing test env at cloud/production Supabase

**CI:** GitHub Actions (`ci.yml`, `deploy.yml`) starts local Supabase, writes
`.env.test`, runs `scripts/ci-supabase-test.sh` \u2013 integration must execute;
job fails on skip warning or test failure. **Local:** `npm test` still skips
integration with a warning when `.env.test` / env is missing (unit + smoke only).

### 6.3 Adding an e2e test

TBD \u2013 not in initial rollout; add only when integration cannot catch the failure mode.

### 6.4 Adding a test for a new API endpoint

Use this pattern for **auth + mutation** integration tests (shipped in
`testing-authorization-data-integrity`). Prefer calling **service functions**
(`createEvent`, `updateEvent`, `deleteEvent`) with Supabase clients \u2013 not
only Astro HTTP routes or middleware redirects.

**Where:** `tests/integration/auth-mutation-*.test.ts`,
`tests/integration/data-integrity-delete.test.ts`

**Prerequisites:** Same as §6.2 (local Supabase, `.env.test`, localhost guard).
Migration `20260611140000_fix_is_admin_use_uid.sql` must be applied for admin /
`is_admin` RPC tests.

**Harness:**

- `createAnonClient()` \u2013 unauthenticated mutations (Risk #4)
- `createNonAdminClient()` \u2013 signed-in user **without** allowlist row
- `createAdminClient()` \u2013 allowlisted integration admin
- `tests/helpers/mutation-fixtures.ts` \u2013 `buildMutationCreatePayload`,
  `insertMutationFixtureRow`, `countEvents`, `deleteMutationFixtureIds`
- Fixture prefix `integration-auth-mutation`; city `TestMutation` (draft rows
  for deny/update probes)

**Steps:**

1. Gate with `describe.skipIf(!isSupabaseConfigured())` + `logSkipIfNotConfigured()`.
2. `beforeAll` / `afterAll`: track fixture IDs; cleanup via
   `deleteMutationFixtureIds(serviceClient, ids)` only \u2013 never unscoped
   `DELETE`.
3. **Deny (Risk #4):** call `createEvent` / `updateEvent` / `deleteEvent` with
   anon or `createNonAdminClient()`; expect `{ error }`; on update, read back
   via service role and assert row unchanged.
4. **Allow (Risk #5):** `createAdminClient()` + `rpc("is_admin")` → `true`;
   admin mutations succeed.
5. **Delete integrity (Risk #3):** `countEvents(serviceClient)` before/after
   `deleteEvent(admin, id)` \u2013 assert `after === before - 1`; missing id →
   `{ error }` and count unchanged.
6. Mutation payloads: **`locationMode: "coordinates"`** (avoids Nominatim HTTP
   during `createEvent` / `updateEvent`).

**Reuse:** `tests/unit/require-admin.test.ts` for API guard (`requireAdmin`
401/403) without DB.

**Anti-patterns:**

- Testing only `/admin` middleware \u2013 direct Supabase/service calls bypass it
- Raw `.from("events").insert` without the service under test (unless
  debugging ambiguous service errors)
- Unscoped delete in tests or asserting absolute seed row counts
- Pointing env at cloud/production Supabase

**CI:** Same gate as §6.2 \u2013 `fileParallelism: false` in `vitest.config.ts` keeps
one local DB safe when multiple integration files run in CI.

### 6.5 Adding a test for a new content-build rule

Not applicable \u2013 SSR pages, not static content build.

### 6.6 Per-rollout-phase notes

**§3 Phase 1 \u2013 Critical-path fan read (`testing-critical-path-fan-read`):**

- Vitest 3.x bootstrap: `vitest.config.ts`, `npm test`, `tests/smoke/`
- Supabase harness: `tests/helpers/supabase.ts` (localhost guard, anon /
  service / admin clients)
- Fan-read fixtures: `tests/helpers/event-fixtures.ts`
- Integration specs: `tests/integration/fan-read-list.test.ts` (Risk #1),
  `tests/integration/fan-read-admin.test.ts` (Risk #6)
- Contributor setup: `tests/README.md`

**§3 Phase 2 \u2013 Authorization and data integrity (`testing-authorization-data-integrity`):**

- Non-admin client: `createNonAdminClient()` in `tests/helpers/supabase.ts`
- Mutation fixtures: `tests/helpers/mutation-fixtures.ts`
- Unit guard: `tests/unit/require-admin.test.ts`
- Integration specs: `tests/integration/auth-mutation-deny.test.ts` (Risk #4),
  `tests/integration/auth-mutation-allow.test.ts` (Risk #5),
  `tests/integration/data-integrity-delete.test.ts` (Risk #3)
- Sequential integration files: `fileParallelism: false` in `vitest.config.ts`
- Cookbook: §6.4

**§3 Phase 3 \u2013 Location and discovery hot-spots (`testing-location-discovery`):**

- Unit specs: `tests/unit/city-centers.test.ts` (Risk #2),
  `tests/unit/event-schema.test.ts`, `tests/unit/fan-schema.test.ts`,
  `tests/unit/event-format.test.ts` (Risk #7)
- Integration smoke: `tests/integration/location-coords-persist.test.ts`
  (admin `createEvent` persists lat/lng)
- Cookbook: §6.1

**§3 Phase 4 \u2013 Quality-gates wiring (`testing-quality-gates-wiring`):**

- CI runner: `scripts/ci-supabase-test.sh` (`npm run test:ci`)
- Workflows: `.github/workflows/ci.yml` (lint → Supabase → tests → build),
  `.github/workflows/deploy.yml` (tests before production build)
- Supabase in Actions: `supabase/setup-cli@v2`, exclude
  `studio,imgproxy,edge-runtime,logflare,vector`
- Local vs CI: integration skip allowed locally only; CI hard-fails

**Post-rollout feature tests (not separate §3 phases):**

- Duplicate / similar events: `tests/unit/event-similarity.test.ts`,
  `tests/unit/fan-check-similar-api.test.ts`
- Change suggestions: `tests/integration/change-suggestions-rls.test.ts`,
  `tests/unit/fan-change-suggestions-api.test.ts`
- Event covers / fan cover API: `tests/unit/cover-rights.test.ts`,
  `tests/unit/event-covers.test.ts`, `tests/unit/fan-cover-api.test.ts`,
  `tests/integration/event-cover-read.test.ts`
- Fan event submit: `tests/integration/fan-event-submit.test.ts`
- Admin allowlist privacy: `tests/integration/admin-allowlist-privacy.test.ts`

Current totals (2026-06-18): 28 files, 147 tests. See `context/foundation/health-check.md`.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **Internal admin panel UI** (layout, tables, form chrome) \u2013 small trusted admin group; low blast radius for fans. Re-evaluate if more than ~5 admins rely on the panel or fan-facing flows depend on admin UI behavior. (Source: Phase 2 interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-18
- Stack versions last verified: 2026-06-18
- AI-native tool references last verified: 2026-06-12
- Rollout §3 Phases 1–2 archived: 2026-06-12
- Rollout §3 Phase 3 shipped: 2026-06-12
- Rollout §3 Phase 4 shipped: 2026-06-12
- Post-rollout feature tests catalogued: 2026-06-18

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.

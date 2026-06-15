---
topic: Critical-path fan read (rollout Phase 1)
researcher: agent
date: 2026-06-11
change_id: testing-critical-path-fan-read
risks: [#1, #6]
---

# Research: Critical-path fan read

Grounding for rollout Phase 1 of `context/foundation/test-plan.md`. Verifies Risk #1 (falsely empty public list) and Risk #6 (admin on public pages sees drafts/past events).

## Executive summary

| Risk                                      | Verdict                                                                                                                                                | Cheapest useful layer                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| #1 Empty list                             | **Real, multiple surfaces** — service filters exist today, but env-null fallback and date-boundary drift are separate failure modes                    | **Integration** — `listPublishedEvents` + local Supabase fixtures        |
| #6 Admin sees drafts/past on public pages | **Mitigated in current code** — public paths use `*Published*` service functions with explicit filters; RLS admin policy alone would **not** be enough | **Integration** — same service calls with **admin-authenticated** client |

**Test-base profile:** `none` — no `vitest.config.*`, no `*.test.*` / `*.spec.*` files, no `npm test` script.

**Hot-spot signal (30d):** 4 commits touching `src/lib/services` + `src/lib/events` (S-02 fan discovery, admin-event-management slices). Churn aligns with test-plan likelihood evidence; failure paths confirmed in `src/lib/services/events.ts`, not only in page shells.

---

## Risk #1 — Fan sees empty list although published upcoming events exist

### What would prove protection (verified)

Integration test that:

1. Seeds the DB with **known** rows: at least two `published` + upcoming events, plus control rows (draft upcoming, published past).
2. Calls `listPublishedEvents(supabase)` with a valid anon Supabase client.
3. Asserts returned count and IDs match **only** the published-upcoming fixture set — not zero, not a subset caused by copying production filter bugs.

Oracle must come from **fixture contract** (what was inserted), not from re-implementing `getStartOfTodayWarsawUtcIso()` in the test.

### Challenge: "RLS alone is enough for fan read"

**Rejected for this product.**

RLS on `events` (migration `20260610100000_create_events.sql`):

```144:151:supabase/migrations/20260610100000_create_events.sql
CREATE POLICY events_select_public
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND public.is_upcoming(starts_at)
  );
```

```153:157:supabase/migrations/20260610100000_create_events.sql
CREATE POLICY events_select_admin
  ON public.events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
```

- **Anon:** RLS public policy alone would hide drafts/past — sufficient for anonymous reads **if** the app always hits the table without extra broken filters.
- **Authenticated admin:** RLS **widens** visibility to all rows via `events_select_admin`. Service-layer filters are mandatory on public paths (see Risk #6 and `lessons.md`).

Service layer **already** applies explicit filters in fan-read functions:

```121:130:src/lib/services/events.ts
export async function listPublishedEvents(
  supabase: SupabaseClient,
  filters?: FanEventFilters,
): Promise<ServiceResult<Event[]>> {
  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("starts_at", getStartOfTodayWarsawUtcIso())
    .order("starts_at", { ascending: true });
```

**Conclusion:** Testing RLS in isolation does **not** prove fan-read protection for admins or that the **service** predicates stay correct. Phase 1 must test **`listPublishedEvents` (and siblings) with injected Supabase clients**, not RLS-only SQL.

### Failure paths that can cause a falsely empty list

| #   | Surface                                               | Mechanism                                                                                                                       | Test layer                                           |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| A   | `src/pages/index.astro`                               | `createClient` returns `null` when `SUPABASE_URL` / `SUPABASE_KEY` missing → `{ data: [] }` with no error surfaced to assertion | Integration (valid env) + optional follow-up smoke   |
| B   | `listPublishedEvents`                                 | Wrong/missing `.eq("status")` or `.gte("starts_at", …)`                                                                         | Integration                                          |
| C   | `getStartOfTodayWarsawUtcIso()` vs DB `is_upcoming()` | JS Warsaw midnight vs SQL `(starts_at AT TIME ZONE 'Europe/Warsaw')::date >= today` — drift at day boundary                     | Integration edge (defer if costly); document in plan |
| D   | Fan URL filters                                       | `parseFanFilters` + `.eq("city")` / subgenre `.or()` over-narrows                                                               | Integration with filter args (secondary case)        |
| E   | Supabase query error                                  | Returns `{ error: "…" }` — UI shows error, not silent empty                                                                     | Separate assertion on error path                     |

**Page entry (fan list):**

```12:18:src/pages/index.astro
const supabase = createClient(Astro.request.headers, Astro.cookies);
const currentFilters = parseFanFilters(Astro.url.searchParams);

const listResult = supabase ? await listPublishedEvents(supabase, currentFilters) : { data: [] };
```

Public event detail uses the same pattern via `getPublishedEventById` (`src/pages/events/[id].astro`).

### Seed / fixture contract

- `supabase/seed.sql` inserts **5** `published` events with `starts_at` in Sep–Dec 2026 — valid oracle for local dev **when** “today” is before those dates (true on 2026-06-11).
- Tests should **not** rely on seed alone: use service-role client to insert isolated fixture rows and clean up, so tests are deterministic and don’t assume seed state.

### Anti-pattern to avoid

Asserting `length === 0` because the test copied `getStartOfTodayWarsawUtcIso()` as expected output, or because env vars were unset in CI.

---

## Risk #6 — Admin on public pages sees drafts or past events

### What would prove protection (verified)

Integration test that:

1. Seeds draft-upcoming and published-past rows (visible to admin via RLS `events_select_admin`).
2. Creates an **authenticated admin** Supabase session (user on `admin_allowlist`, `is_admin()` true — note pending migration `20260611140000_fix_is_admin_use_uid.sql` uses `auth.uid()` not JWT email).
3. Calls **`listPublishedEvents`**, **`listDistinctCities`**, and **`getPublishedEventById`** — the functions used on public pages, **not** `listEventsForAdmin` / `getEventById`.
4. Asserts results exclude draft and past rows identically to anon client.

### Challenge: "Logged-in user uses the same query as anon"

**Partially true, partially misleading.**

| Path                         | Function                                    | Explicit published/upcoming filters? |
| ---------------------------- | ------------------------------------------- | ------------------------------------ |
| Public homepage `/`          | `listPublishedEvents`, `listDistinctCities` | Yes                                  |
| Public detail `/events/[id]` | `getPublishedEventById`                     | Yes                                  |
| Admin panel `/admin`         | `listEventsForAdmin`                        | **No** — intentional                 |
| Admin edit                   | `getEventById`                              | **No** — intentional                 |

Public pages **do** use the same **service functions** for anon and logged-in users (including admin). The critical distinction is they use **`*Published*`** variants, not admin variants.

If a future refactor wired public pages to `getEventById` or `listEventsForAdmin`, Risk #6 would regress immediately while RLS still “passes.” Tests must target **public service entry points**, not “authenticated SELECT on events.”

`listDistinctCities` also filters published + upcoming:

```150:156:src/lib/services/events.ts
export async function listDistinctCities(supabase: SupabaseClient): Promise<ServiceResult<string[]>> {
  const response = await supabase
    .from("events")
    .select("city")
    .eq("status", "published")
    .gte("starts_at", getStartOfTodayWarsawUtcIso())
```

### Anti-pattern to avoid

Relying on an RLS test (“admin can SELECT all rows”) while the **service under test** omits explicit filters. Phase 1 should fail if someone removes `.eq("status", "published")` from `listPublishedEvents` even when RLS still restricts anon.

---

## Call graph (fan read)

```
index.astro
  → createClient()
  → parseFanFilters(url)
  → listPublishedEvents(supabase, filters)   ← Risk #1, #6
  → listDistinctCities(supabase)             ← Risk #6 (city dropdown)

events/[id].astro
  → getPublishedEventById(supabase, id)    ← Risk #6

Admin (out of Phase 1 scope but contrast):
  admin/index.astro → listEventsForAdmin()   ← no published/upcoming filter
  admin/events/[id]/edit.astro → getEventById()
```

Supporting pure logic (Phase 3 candidate, not Phase 1):

- `src/lib/events/format.ts` — `getStartOfTodayWarsawUtcIso()`
- `src/lib/events/fan-schema.ts` — `parseFanFilters`
- `src/lib/events/mapper.ts` — `mapEventRow`

---

## Existing tests

**None.** Grep found no vitest/jest/playwright configs or test files. CI (`.github/workflows/ci.yml`) runs lint + build only.

---

## Stack grounding — Vitest bootstrap (Phase 1)

| Item             | Finding                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Astro            | 6.3.1, `output: "server"`, Vite 7 (override in package.json)                                                                                                                                                                                                                                                                                                                          |
| Vitest           | Not installed                                                                                                                                                                                                                                                                                                                                                                         |
| Astro + Vitest   | Official pattern uses `getViteConfig()` from `astro/config` ([Astro testing guide](https://docs.astro.build/en/guides/testing/))                                                                                                                                                                                                                                                      |
| Known regression | Astro 6 + Vitest 4 + `getViteConfig()` can crash with `ReferenceError: exports is not defined` (CJS `cookie` via `astro:server` plugin) — [astro#15847](https://github.com/withastro/astro/issues/15847). Mitigations: Vitest ≥4.1.0-beta.6, or filter `astro:server` / `astro:server-client` plugins, or **standalone Vitest config without `getViteConfig`** for service-only tests |

**Recommendation for Phase 1:** Bootstrap Vitest with a **standalone** `vitest.config.ts` (Node environment, `@/*` path alias). Test `src/lib/services/events.ts` directly with `@supabase/supabase-js` clients — **no** `astro:env`, **no** Astro page rendering. Defers Astro Container API / `getViteConfig` until a later phase needs `.astro` tests.

Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

### Supabase integration test harness

Per Supabase testing guidance and `lessons.md` pattern:

1. **Prerequisite:** local Supabase running (`npx supabase start`) — Docker required.
2. **Fixture client:** service role, `auth: { persistSession: false }` (avoids session bleed with user client).
3. **Assertion clients:** anon key; optional authenticated admin (sign up / sign in test user on allowlist).
4. **Env:** `SUPABASE_URL=http://127.0.0.1:54321`, anon key + service role from `supabase status --output json` (document in test README / setup file).
5. **Do not mock** `listPublishedEvents` internals — mock at HTTP/DB edge only (real local PostgREST).

Phase 4 will wire `npm test` into CI; Phase 1 can document “requires local Supabase” gate.

---

## Response-guidance corrections vs test-plan

| Test-plan cell                                                 | Research correction                                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| #1 “Likely cheapest layer: integration (service + DB fixture)” | **Confirmed** — unit tests on `getStartOfTodayWarsawUtcIso` alone do not catch empty-list regressions from wiring or env |
| #1 “Must challenge RLS alone”                                  | **Confirmed** — especially for authenticated admin; anon-only RLS test is insufficient for whole fan-read contract       |
| #6 “Service-layer filters vs RLS-only reliance”                | **Current code complies** with `lessons.md`; test is regression guard, not greenfield fix                                |
| Hot-spot `src/lib/services`                                    | **Accurate** — fan-read predicates live here; pages are thin                                                             |

No speculative risks flagged for removal. Both risks describe real, testable failure modes.

---

## Recommended test cases (for `/10x-plan`)

1. **Bootstrap:** Vitest + `@/` alias + `npm test` script; optional `tests/setup.ts` loading env from `supabase status`.
2. **Risk #1 — not falsely empty:** After fixture insert (2× published upcoming), `listPublishedEvents(anonClient)` returns both IDs, count ≥ 2.
3. **Risk #1 — exclusion:** Same call excludes draft-upcoming and published-past fixture rows.
4. **Risk #6 — admin parity:** Same assertions with admin-authenticated client on `listPublishedEvents`.
5. **Risk #6 — detail path:** `getPublishedEventById(adminClient, pastEventId)` returns `null`; published-upcoming returns event.
6. **Risk #6 — cities:** `listDistinctCities(adminClient)` excludes cities only present on draft/past rows.

Optional later: filter narrowing (city/subgenre), `createClient` null → empty (page-level, needs Astro test harness).

---

## Open items for plan phase

- Pin Vitest version after spike (stable vs 4.1.0-beta.6 for Astro compatibility if later adopting `getViteConfig`).
- Admin test user provisioning: auth.admin.createUser + allowlist email vs existing seed allowlist.
- Whether Phase 1 runs in CI without Supabase (skip integration if URL unset) vs hard-fail — recommend skip with warning until Phase 4.
- Apply / verify migration `20260611140000_fix_is_admin_use_uid.sql` before admin-session tests.

---

## Sources read

- `context/foundation/test-plan.md` §2–§4
- `context/foundation/lessons.md`
- `context/foundation/prd.md` (upcoming / public guardrails)
- `src/lib/services/events.ts`
- `src/pages/index.astro`, `src/pages/events/[id].astro`
- `supabase/migrations/20260610100000_create_events.sql`
- `supabase/seed.sql`
- `package.json`, `astro.config.mjs`, `.github/workflows/ci.yml`
- Astro 6 testing docs + GitHub issues (Vitest regression)

---
topic: Authorization and data integrity (rollout Phase 2)
researcher: agent
date: 2026-06-11
change_id: testing-authorization-data-integrity
risks: [#3, #4, #5]
---

# Research: Authorization and data integrity

Grounding for rollout Phase 2 of `context/foundation/test-plan.md`. Verifies Risk #3 (events disappear / mass data loss), Risk #4 (non-admin mutates events), and Risk #5 (admin cannot access admin paths).

## Executive summary

| Risk                               | Verdict                                                                                                                                               | Cheapest useful layer                                                                                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #4 Non-admin mutates events        | **Real bypass surface** — mutations go through service + Supabase; RLS is the data-layer gate; API adds `requireAdmin` before service calls           | **Integration** — `createEvent` / `updateEvent` / `deleteEvent` + direct `.from("events")` with anon and non-admin clients; **unit** on `requireAdmin` for HTTP 401/403 |
| #5 Admin cannot access admin panel | **Real, occurred in prod** — chain is `middleware` → `resolveIsAdmin` → RPC `is_admin()` matched via `auth.uid()` + allowlist email                   | **Integration** — RPC + service mutation success for allowlisted admin; **unit** on `requireAdmin` / `resolveIsAdmin` with mocked locals                                |
| #3 Events disappear / list resets  | **Partially testable** — destructive ops are scoped `deleteEvent` by id; test cleanup must stay ID-scoped; migration wipe is out of integration scope | **Integration** — row-count oracle around single-id delete; document migration smoke as manual/CI follow-up                                                             |

**Test-base profile:** Vitest 3.2.x shipped (Phase 1). Harness: `tests/helpers/supabase.ts` (localhost guard, anon/service/admin clients). Patterns: `tests/integration/fan-read-*.test.ts`, `tests/helpers/event-fixtures.ts`.

**Hot-spot signal:** `src/pages/api/admin/events/*` (POST/PUT/DELETE + `requireAdmin`), `supabase/migrations/*` (RLS insert/update/delete policies), `src/middleware.ts` (admin page guard). Aligns with test-plan likelihood evidence for `src/pages/api` and `supabase/migrations`.

---

## Risk #4 — Non-admin user can create, edit, or delete events

### What would prove protection (verified)

1. **RLS layer:** anon and authenticated **non-admin** clients cannot INSERT/UPDATE/DELETE on `public.events` (PostgREST returns policy violation or zero rows affected).
2. **Service layer:** `createEvent`, `updateEvent`, `deleteEvent` called with those clients return `{ error: … }` — same signal the admin API would surface if guards were removed.
3. **API layer (thin):** `requireAdmin` returns 401 without session, 403 for authenticated non-admin — proves middleware locals wiring is not the only gate (RLS still required for direct Supabase bypass).

Oracle: fixture row inserted by **service role**; mutation attempts use **tracked fixture id**; success only for **admin client**.

### Challenge: "Middleware on `/admin` is enough"

**Rejected.**

Admin UI routes are guarded in `src/middleware.ts`:

```7:40:src/middleware.ts
function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
// ...
  if (isAdminRoute(pathname)) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }

    if (!context.locals.isAdmin) {
      return context.redirect("/403");
    }
  }
```

API mutations use a **separate** guard — not the pathname middleware alone:

```10:14:src/pages/api/admin/events/index.ts
export const POST: APIRoute = async (context) => {
  const adminError = requireAdmin(context.locals);
  if (adminError) {
    return adminError;
  }
```

A attacker or bug could call `createEvent(supabase, …)` with any authenticated Supabase client **without** hitting `/admin` pages. RLS policies are the backstop:

```159:176:supabase/migrations/20260610100000_create_events.sql
CREATE POLICY events_insert_admin
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY events_update_admin
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY events_delete_admin
  ON public.events
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
```

**Anon** has no INSERT/UPDATE/DELETE policies — mutations fail at RLS.

### Mutation entry points (call graph)

| Path                            | Guard          | Service               | DB                 |
| ------------------------------- | -------------- | --------------------- | ------------------ |
| `POST /api/admin/events`        | `requireAdmin` | `createEvent`         | `INSERT`           |
| `PUT /api/admin/events/[id]`    | `requireAdmin` | `updateEvent`         | `UPDATE`           |
| `DELETE /api/admin/events/[id]` | `requireAdmin` | `deleteEvent`         | `DELETE .eq("id")` |
| Direct Supabase client (bypass) | none           | optional service call | RLS only           |

No other write paths found under `src/pages/api/`. Auth routes (`signin`, `signup`, `signout`) do not touch `events`.

Service mutations always target a single row on update/delete:

```339:339:src/lib/services/events.ts
  const { error } = await supabase.from("events").delete().eq("id", id);
```

### Test fixture note — avoid geocoding

`createEvent` / `updateEvent` call `resolveCoordinates`. **Coordinates mode** avoids Nominatim HTTP in tests (Phase 1 lesson). Use `locationMode: "coordinates"` with fixed lat/lng in parsed payloads for mutation tests.

### Anti-patterns to avoid

- Only asserting `/admin` returns 403 in a browser — does not prove RLS or service layer.
- RLS-only test without calling `createEvent` / `updateEvent` / `deleteEvent` — misses service error mapping.
- Using `DELETE` without `.eq("id", …)` in cleanup — violates Risk #3 guardrails.

---

## Risk #5 — Admin in database cannot access admin panel

### What would prove protection (verified)

1. **RPC:** `supabase.rpc("is_admin")` returns `true` for allowlisted admin session, `false` for non-admin authenticated user.
2. **App helper:** `resolveIsAdmin(supabase, user)` mirrors RPC (returns `false` on RPC error — fail-closed).
3. **Mutation success:** `createEvent(adminClient, …)` persists a row; same payload with non-admin client fails.

### Challenge: "Row in admin table implies `is_admin()` true"

**Partially rejected — uid migration required.**

Current `is_admin()` (migration `20260611140000_fix_is_admin_use_uid.sql`) joins allowlist email to `auth.users` by **`auth.uid()`**, not JWT email claim:

```11:17:supabase/migrations/20260611140000_fix_is_admin_use_uid.sql
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_allowlist a
    INNER JOIN auth.users u ON lower(a.email) = lower(u.email)
    WHERE u.id = auth.uid()
      AND u.deleted_at IS NULL
  );
```

Tests must provision **both** auth user and allowlist row (pattern already in `createAdminClient()`). Allowlist row alone without matching session → `false`.

`resolveIsAdmin`:

```3:14:src/lib/auth/admin.ts
export async function resolveIsAdmin(supabase: SupabaseClient, user: User | null): Promise<boolean> {
  if (!user?.id) {
    return false;
  }

  const response = await supabase.rpc("is_admin");

  if (response.error) {
    return false;
  }

  return response.data === true;
}
```

`requireAdmin` (API 403):

```18:28:src/lib/auth/guards.ts
export function requireAdmin(locals: APIContext["locals"]): Response | null {
  const authError = requireAuth(locals);
  if (authError) {
    return authError;
  }

  if (!locals.isAdmin) {
    return jsonError("Brak uprawnień administratora", 403);
  }

  return null;
}
```

### Anti-patterns to avoid

- Testing only login form — does not prove post-login `is_admin()` RPC.
- Using seed allowlist email without signing in as that user in the test client.

---

## Risk #3 — Events disappear or public list resets

### What would prove protection (verified)

Integration scope for this rollout phase:

1. **Scoped delete:** After `deleteEvent(adminClient, fixtureId)`, total row count decreases by **exactly 1**; other fixture/seed rows remain.
2. **Failed delete:** `deleteEvent` on non-existent id returns error; count unchanged.
3. **Cleanup contract:** Test `afterAll` deletes only tracked IDs (reuse Phase 1 pattern) — never table-wide delete.

### Challenge: "DELETE in test cleanup equals production data loss"

**Rejected for this harness.**

Production data loss from **application** paths would require unscoped delete in service code — not present today. Test cleanup uses `.in("id", fixtureIds)` via service role.

**Out of scope for Phase 2 integration:** migration idempotency, `db reset` wiping prod, deploy scripts. Document as manual checklist / future migration smoke — not Vitest integration.

### Count oracle

Before/after `deleteEvent`: `serviceClient.from("events").select("id", { count: "exact", head: true })` or select ids and compare length. Oracle is **delta = 1**, not absolute seed count (seed may vary).

---

## Response-guidance corrections vs test-plan

| Test-plan cell                               | Research correction                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| #4 "integration (RLS + API)"                 | **Confirmed** — split: RLS+service integration is highest signal; API `requireAdmin` adds cheap **unit** tests (no Astro request harness needed) |
| #4 "Must challenge middleware on `/admin`"   | **Confirmed** — test direct Supabase + service paths                                                                                             |
| #5 "Auth session, RPC/allowlist, middleware" | **Confirmed** — integration on RPC + admin mutation; unit on `requireAdmin`                                                                      |
| #3 "integration + seed smoke"                | **Narrowed** — integration proves scoped delete + count stability; full migration/seed smoke deferred                                            |
| §6.2 anti-pattern "RLS-only without service" | **Applies to reads**; for **writes**, service+RLS together is correct — service is what API calls                                                |

---

## Recommended test cases (for `/10x-plan`)

### Harness extensions

1. **`createNonAdminClient()`** in `tests/helpers/supabase.ts` — auth user **not** on allowlist (distinct email from integration admin).
2. **`mutation-fixtures.ts`** (or extend `event-fixtures.ts`) — minimal `ParsedEventCreate` with `locationMode: "coordinates"`; helper to build relative `startsAt` string for `parseEventCreate` / service calls.
3. Reuse `createAdminClient()`, localhost guard, skip gate from Phase 1.

### Risk #4 — non-admin cannot mutate

4. **Anon insert blocked:** `createEvent(anonClient, payload)` → `{ error }`; row absent in DB (service role select by name/id).
5. **Non-admin insert blocked:** same with `createNonAdminClient()`.
6. **Non-admin update blocked:** service-role insert fixture → `updateEvent(nonAdminClient, id, patch)` → error; row unchanged.
7. **Non-admin delete blocked:** `deleteEvent(nonAdminClient, id)` → error; row still present.
8. **Direct RLS (optional same file):** non-admin `.from("events").insert(…)` → PostgREST error code / no row.

### Risk #5 — admin can mutate

9. **`is_admin` RPC:** admin client → `true`; non-admin → `false`.
10. **Admin create:** `createEvent(adminClient, payload)` → `{ data }` with id; cleanup deletes that id only.
11. **Admin update/delete:** on fixture id → success; verify with service-role get.

### Risk #5 — API guard (unit, low cost)

12. **`requireAdmin` unit tests** in `tests/unit/require-admin.test.ts`: mock `locals` `{ user: null }` → 401; `{ user, isAdmin: false }` → 403; `{ user, isAdmin: true }` → `null`.

### Risk #3 — scoped delete / count stability

13. **Single-row delete:** count before/after `deleteEvent(admin, fixtureId)` → delta exactly 1.
14. **Delete missing id:** error; count unchanged.

### Deferred (document, do not block Phase 2)

- Full Astro `POST /api/admin/events` integration (needs request/cookie harness) — unit `requireAdmin` + service integration sufficient under cost × signal.
- Middleware redirect tests for `/admin` pages.
- Migration replay / `supabase db reset` automation.

---

## Open items for plan phase

- Pin whether Risk #4 direct `.insert` RLS tests duplicate service tests or add signal — recommend service-first; add raw RLS only if service errors are ambiguous.
- Shared vs separate fixture module for mutation payloads.
- Non-admin user email constant (avoid collision with `integration-fan-read-admin@example.com`).
- Confirm local migration `20260611140000_fix_is_admin_use_uid.sql` applied (`npx supabase migration up` / `db reset`).
- Phase 4 CI: integration still skip without env; no change in Phase 2.
- Update `test-plan.md` §6.4 when Phase 2 ships (API + RLS mutation cookbook).

---

## Sources read

- `context/foundation/test-plan.md` §2–§4, §6.2
- `context/foundation/lessons.md`
- `context/foundation/prd.md` (FR-006/007, access control)
- `context/archive/2026-06-11-testing-critical-path-fan-read/` (harness patterns)
- `src/middleware.ts`
- `src/lib/auth/admin.ts`, `src/lib/auth/guards.ts`
- `src/lib/services/events.ts` (create/update/delete)
- `src/pages/api/admin/events/index.ts`, `[id].ts`
- `supabase/migrations/20260610100000_create_events.sql`
- `supabase/migrations/20260610110000_grant_is_admin_rpc.sql`
- `supabase/migrations/20260611140000_fix_is_admin_use_uid.sql`
- `tests/helpers/supabase.ts`, `tests/helpers/event-fixtures.ts`
- `package.json`, `vitest.config.ts`

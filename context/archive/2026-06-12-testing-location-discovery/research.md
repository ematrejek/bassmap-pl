---
topic: Location and discovery hot-spots (rollout Phase 3)
researcher: agent
date: 2026-06-12
change_id: testing-location-discovery
risks: [#2, #7]
---

# Research: Location and discovery hot-spots

Grounding for rollout Phase 3 of `context/foundation/test-plan.md`. Verifies Risk #2 (fan sees wrong map locations / city fallback) and Risk #7 (untrusted API input corrupts list or map data).

## Executive summary

| Risk                   | Verdict                                                                                                                                                                              | Cheapest useful layer                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| #2 Wrong map locations | **Real runtime path** — map pins use `resolveMapCoordinates` (stored lat/lng, else city table, else Poland center); DB allows `NULL` coords pairs                                    | **Unit** on `src/lib/geocoding/city-centers.ts` — no DB, no Leaflet, no Nominatim                                                     |
| #7 Bad API input       | **Real boundary** — admin write API validates via `parseEventCreate` / `parseEventUpdate` (Zod) before `createEvent` / `updateEvent`; fan URL filters sanitized in `parseFanFilters` | **Unit** on `src/lib/events/schema.ts` + `fan-schema.ts`; optional thin **integration** smoke that valid admin create persists coords |

**Test-base profile:** Vitest 3.2.x, `fileParallelism: false`, harness from Phases 1–2 (`tests/helpers/supabase.ts`, mutation fixtures with `locationMode: "coordinates"`).

**Hot-spot signal:** `src/lib/events` (8 commits/30d per test-plan), `src/lib/geocoding/city-centers.ts`, `src/lib/events/schema.ts`, `src/pages/api/admin/events/*`. Map UI (`EventsMap.tsx`) delegates pin position to `resolveMapCoordinates` — testing the pure function is equivalent signal to screenshot E2E.

---

## Risk #2 — Fan sees wrong map locations

### What would prove protection (verified)

1. **Stored coordinates win:** event with non-null `latitude` / `longitude` → map uses exact values (not city center).
2. **City fallback:** both coords `null` (allowed by `events_coordinates_both_or_neither`) + known catalog city (e.g. `Warszawa`, `Kraków`) → pin at `CITY_CENTERS` entry.
3. **Unknown city fallback:** null coords + city not in table → `DEFAULT_POLAND_CENTER` (`52.0`, `19.0`).
4. **Normalization:** `normalizeCityKey` trims and lowercases; diacritic variants (`Wrocław` / `wroclaw`) resolve consistently.

Oracle: table-driven expectations on `resolveMapCoordinates` / `getCityCenter` — do not assert Leaflet marker pixels or tile URLs.

### Failure entry point (ground truth)

Fan-facing pin placement:

```33:47:src/lib/geocoding/city-centers.ts
export function resolveMapCoordinates(event: Pick<Event, "latitude" | "longitude" | "city">): {
  latitude: number;
  longitude: number;
} {
  if (event.latitude !== null && event.longitude !== null) {
    return { latitude: event.latitude, longitude: event.longitude };
  }

  const cityCenter = getCityCenter(event.city);
  if (cityCenter) {
    return cityCenter;
  }

  return { ...DEFAULT_POLAND_CENTER };
}
```

`EventsMap` calls this for every listed event — no second geocode at render time.

### Challenge: "Geocode at save time means runtime never lies"

**Partially rejected.**

`createEvent` / `updateEvent` call `resolveCoordinates` → Nominatim or explicit coordinates before persist, so **new** admin saves usually store lat/lng. However:

- DB constraint allows **both** coords `NULL` (legacy rows, service-role fixtures, future imports).
- Map read path still runs `resolveMapCoordinates` — fallback table must stay correct.
- Wrong **city key** in `CITY_CENTERS` or missing diacritic alias would misplace pins even with perfect geocode-on-save.

**Anti-pattern:** Playwright map screenshot or testing Leaflet mount — unit on `city-centers.ts` is cheaper and stable.

### Nominatim / address mode

`resolveCoordinates` → `geocodeAddress` (HTTP) for `locationMode: "address"`. Prior rollout phases avoid Nominatim in Vitest (mutation fixtures use `coordinates` mode). **Defer** address-mode geocode integration unless a regression proves service-layer geocode wiring broke — not Risk #2's map fallback.

### Integration scope (narrow)

Optional low-cost integration (single file): service-role insert row with `latitude: null, longitude: null, city: 'Warszawa'` → `getPublishedEventById` / `mapEventRow` → `resolveMapCoordinates` equals Warsaw center. **Signal duplicates unit** unless we want end-to-end null-coords row readable from DB — recommend **unit-first**; add integration only if plan wants one “DB null coords” smoke.

---

## Risk #7 — Untrusted API input corrupts data

### What would prove protection (verified)

1. **Admin API boundary:** `POST /api/admin/events` and `PUT /api/admin/events/[id]` call `parseEventCreate` / `parseEventUpdate` before service — invalid body returns 400 without persist.
2. **Catalog subgenres:** `z.enum(SUBGENRES)` rejects unknown slugs; empty array fails `min(1)`.
3. **Coordinate bounds:** latitude ∈ [-90, 90], longitude ∈ [-180, 180]; coordinates mode requires both.
4. **Datetime contract:** form uses `datetime-local` (`YYYY-MM-DDTHH:mm`); service `toStoredStartsAt` → `parseDatetimeLocalWarsaw` is **stricter** than Zod's `Date.parse` refine — gap is a real second line of defense.
5. **Fan read URL:** `parseFanFilters` **silently drops** invalid `subgenre` query params (does not throw, does not persist) — list cannot be “poisoned” by bad URL subgenres.

Oracle: `parse*(…).success === false` for rejects; for fan filters, invalid params omitted from `subgenres` array.

### Failure entry points

**Write boundary (admin):**

```28:31:src/pages/api/admin/events/index.ts
  const parsed = parseEventCreate(body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error }, 400);
  }
```

**Schema exports for unit tests (already present):**

```166:167:src/lib/events/schema.ts
// Exported for tests / reuse
export { eventCreateAddressSchema, eventCreateCoordinatesSchema, eventUpdatePartialSchema };
```

**Service second gate (datetime):**

```25:30:src/lib/services/events.ts
function toStoredStartsAt(startsAt: string): string | { error: string } {
  const iso = parseDatetimeLocalWarsaw(startsAt);
  if (!iso) {
    return { error: "Nieprawidłowa data i godzina" };
  }
  return iso;
}
```

**Fan filter sanitization:**

```14:26:src/lib/events/fan-schema.ts
export function parseFanFilters(searchParams: URLSearchParams): FanEventFilters {
  const cityRaw = searchParams.get("city")?.trim() ?? "";
  const city = cityRaw.length > 0 ? cityRaw : null;

  const subgenres: Subgenre[] = [];
  for (const value of searchParams.getAll("subgenre")) {
    const trimmed = value.trim();
    if (trimmed && isSubgenre(trimmed) && !subgenres.includes(trimmed)) {
      subgenres.push(trimmed);
    }
  }

  return { city, subgenres };
}
```

### Challenge: "Zod on client is enough"

**Rejected.**

Admin form is client-validated, but API accepts raw JSON. Server Zod + service datetime parsing are the gates that matter for corruption. **Unit tests target `parseEventCreate` / `parseEventUpdate`**, not React form state.

### Challenge: "Must test HTTP API routes"

**Narrowed (same as Phase 2).**

Full Astro `POST` harness is deferred under cost × signal. `parseEventCreate` unit tests prove the same validation the route calls. Optional: one table-driven test that mirrors route order (`parse` → reject) without `APIRoute` context.

### Zod vs service datetime gap (plan note)

`startsAtSchema` uses `Date.parse` — strings like ISO with `Z` or seconds may pass Zod but fail `parseDatetimeLocalWarsaw`. Worth one unit case documenting expected **service** rejection via `createEvent` or direct `toStoredStartsAt` test if exported — today `toStoredStartsAt` is private; test through `createEvent(admin, payload)` integration or export for test — **prefer integration single case** or test `parseDatetimeLocalWarsaw` in `format.ts` unit file.

---

## Response-guidance corrections vs test-plan

| Test-plan cell                           | Research correction                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| #2 "unit on pure mapping/fallback logic" | **Confirmed** — `city-centers.ts` is the pin oracle; mapper is pass-through                         |
| #2 "Geocode at save time…"               | **Narrowed** — still test null-coords fallback; do not rely on geocode-only                         |
| #7 "unit on validation"                  | **Confirmed** — `schema.ts` + `fan-schema.ts`; admin API routes thin-wrap parsers                   |
| #7 "integration"                         | **Optional smoke** — valid coordinates create persists lat/lng; not required for every invalid case |
| §6.1 TBD                                 | **Fill in Phase 3** — unit file pattern under `tests/unit/`                                         |

---

## Recommended test cases (for `/10x-plan`)

### Risk #2 — map coordinates (unit: `tests/unit/city-centers.test.ts`)

1. **Explicit coords:** `{ latitude: 50.1, longitude: 19.2, city: "X" }` → same lat/lng.
2. **Null coords + Warszawa:** → `CITY_CENTERS.warszawa`.
3. **Null coords + diacritic alias:** `Kraków` and `krakow` → same center.
4. **Null coords + unknown city:** → `DEFAULT_POLAND_CENTER`.
5. **Whitespace city:** `"  Poznań  "` → Poznań center (`getCityCenter`).

### Risk #7 — validation (unit: `tests/unit/event-schema.test.ts`)

6. **Invalid subgenre:** `parseEventCreate` with `subgenres: ["not_a_real_genre"]` → `success: false`.
7. **Empty subgenres:** `subgenres: []` → fail.
8. **Lat out of range:** `latitude: 91` in coordinates mode → fail.
9. **Coordinates mode missing lng:** → fail (`superRefine`).
10. **Valid minimal coordinates payload:** `success: true` (happy path for create).
11. **parseEventUpdate** partial invalid subgenre → fail.
12. **parseFanFilters:** `?subgenre=neurofunk&subgenre=bogus` → only `neurofunk` in array.
13. **parseFanFilters:** empty/missing params → `city: null`, `subgenres: []`.

### Risk #7 — datetime gap (unit: `tests/unit/event-format.test.ts` or schema integration)

14. **`parseDatetimeLocalWarsaw`:** rejects `2026-06-15T20:00:00.000Z` (if Zod would accept via Date.parse — document boundary).
15. **Accepts** canonical `2026-12-01T20:00` → ISO string.

### Optional integration (`tests/integration/location-coords-persist.test.ts`)

16. Admin `createEvent` with coordinates payload → returned `Event` has same lat/lng as input (reuse mutation harness, cleanup by id).

### Deferred

- Nominatim / address-mode geocode HTTP tests.
- Leaflet / `EventsMap` component tests.
- Full Astro admin API HTTP tests.
- DB CHECK constraint tests for `events_subgenres_min_one` (Zod catches earlier).

---

## Open items for plan phase

- Whether to export / unit-test `parseDatetimeLocalWarsaw` vs one admin `createEvent` integration for datetime gap.
- Single vs split unit files (`city-centers`, `event-schema`, `event-format`, `fan-schema`).
- Whether optional integration #16 is worth CI time or unit-only phase is sufficient.
- Phase 5 cookbook: fill `test-plan.md` §6.1 (unit pattern) when Phase 3 ships.
- No new Supabase migrations expected.

---

## Sources read

- `context/foundation/test-plan.md` §2–§4, §6.2–§6.4
- `context/foundation/prd.md` (business logic, guardrails)
- `context/archive/2026-06-11-testing-critical-path-fan-read/`
- `context/archive/2026-06-11-testing-authorization-data-integrity/`
- `src/lib/geocoding/city-centers.ts`
- `src/lib/geocoding/nominatim.ts` (scope boundary)
- `src/lib/events/schema.ts`, `fan-schema.ts`, `format.ts`, `mapper.ts`
- `src/lib/services/events.ts` (`resolveCoordinates`, `toStoredStartsAt`, `createEvent`)
- `src/components/discovery/EventsMap.tsx`
- `src/pages/api/admin/events/index.ts`, `[id].ts`
- `supabase/migrations/20260610100000_create_events.sql` (coords nullability)
- `tests/helpers/supabase.ts`, `mutation-fixtures.ts`, `event-fixtures.ts`
- `vitest.config.ts`, `package.json`

<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Katalog podgatunków v2 (S-29)

- **Plan**: context/changes/subgenre-catalog-v2/plan.md
- **Scope**: Full plan (Phases 1–3 + legacy-preservation fix for S-24 compatibility)
- **Date**: 2026-06-28 (re-run after E2E + verify)
- **Verdict**: **APPROVED**
- **Findings**: 0 critical open, 0 open warnings, 0 open observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Automated verification (re-run 2026-06-28)

| Command | Result |
|---------|--------|
| `npm run check` | PASS (0 errors) |
| `npm run lint:all` | PASS (pre-existing `no-console` warnings in `account-deletion.ts` only) |
| `npm test` | PASS – 395 passed, 1 skipped (396 total) |
| `npm run verify` | PASS |
| `npm run test:e2e` | PASS – **33/33** (includes `tests/e2e/subgenre-catalog-v2.spec.ts` 7/7) |

Subgenre-related unit coverage: `subgenres.test.ts`, `fan-schema.test.ts`, `event-schema.test.ts`, `suggestion-schema.test.ts`, `profile-section.test.tsx`, `profile-editor.test.tsx`, `suggestion-format.test.ts`, `event-discovery-card.test.tsx` (legacy badge hide).

## Plan coverage checklist

| Plan item | Status |
|-----------|--------|
| `ACTIVE_SUBGENRES` + `SUBGENRES` alias | Done – `src/types.ts` |
| `Subgenre` union = full DB enum + 5 new values | Done |
| `src/lib/subgenres.ts` helpers | Done – `filterActiveSubgenres`, `isActiveSubgenre`, `activeSubgenresChanged`, `subgenreSetsEqual` |
| Additive SQL migration | Done – `20260628100000_add_subgenre_catalog_v2_values.sql` |
| Zod schemas (event, profile, crew) | Done – active catalog only |
| URL filters (`fan-schema`, `DateRangeFilter`) | Done |
| Display filter (badges, map, archive, profile, event detail) | Done |
| S-24 ekipy (`CrewForm`, `CrewDashboard` badges) | Done – compatible after legacy-preservation fix |
| Sugestie zmian – pole `subgenres` | Done – form + schema + `suggestion-format` |
| PRD + roadmap v2 | Done |
| E2E smoke for catalog v2 | Done – `tests/e2e/subgenre-catalog-v2.spec.ts` |
| GitHub issue + board | Not done (deferred to `/10x-archive`) |
| Manual QA checklist (plan) | Covered by E2E for core flows; sugestia apply – unit/API only |

## Findings

### F1 – `CrewFormValues` union breaks `CrewDashboard` type-check

- **Severity**: 🔴 CRITICAL
- **Impact**: 🔎 MEDIUM – blocks CI (`astro check`)
- **Dimension**: Safety & Quality
- **Location**: `src/components/fan/CrewForm.tsx`, `src/components/fan/CrewDashboard.tsx`
- **Detail**: After widening `CrewFormValues` to `CreateCrewInput | UpdateCrewInput`, `handleCreate` typing failed assignability to `createCrew` input.
- **Fix**: `handleCreate(values: CrewFormValues)` + cast to `CreateCrewInput` at API boundary.
- **Decision**: FIXED (triage 2026-06-28)

### F2 – Incidental save could wipe legacy subgenres from DB

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – data integrity vs plan „zero UPDATE czyszczący legacy”
- **Dimension**: Safety & Quality
- **Location**: `EventForm.tsx`, `ProfileSection.tsx`, `CrewForm.tsx`
- **Detail**: Edit forms initialized with `filterActiveSubgenres()` but submit always sent active selection → unrelated field edits dropped legacy enum values from DB columns.
- **Fix**: `activeSubgenresChanged()`; omit `subgenres` / `favoriteSubgenres` from PATCH when active selection unchanged (edit mode).
- **Decision**: FIXED (triage 2026-06-28)

### F3 – Conscious subgenre edit removes legacy from DB permanently

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🔎 MEDIUM – product semantics
- **Dimension**: Plan Adherence
- **Detail**: When user edits subgenre checkboxes and saves, only active ids persist; legacy values drop from array column. Records remain; tags shrink only after explicit subgenre edit.
- **Decision**: ACCEPTED-AS-DESIGNED (no code change)

### F4 – Deploy order: migration before code exposing new enum values

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🔎 MEDIUM – production save failures for Garage/Bassline/etc.
- **Dimension**: Safety & Quality
- **Location**: `20260628100000_add_subgenre_catalog_v2_values.sql`, deploy runbook
- **Fix**: Apply migration on target DB **before** deploying app code. E2E verified locally after `supabase db reset`.
- **Decision**: SKIPPED (operational – note in archive / deploy checklist)

### F5 – Brak GitHub issue i board item S-29

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Detail**: Roadmap row S-29 exists; issue + board sync deferred per plan convention.
- **Decision**: SKIPPED (defer to `/10x-archive`)

### F6 – Brak E2E dla katalogu v2 i legacy UI

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Location**: `tests/e2e/subgenre-catalog-v2.spec.ts` (was missing)
- **Detail**: Plan manual QA list; no Playwright regression for 13-checkbox catalog, legacy URL param, or legacy badge hide.
- **Fix**: Added `tests/e2e/subgenre-catalog-v2.spec.ts` + `tests/e2e/helpers/subgenre-fixture.ts` (7 scenarios). Full suite 33/33 green.
- **Decision**: FIXED (2026-06-28)

### F7 – `event-discovery-card.test.tsx` nie assertuje ukrycia legacy

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Safety & Quality
- **Location**: `tests/unit/event-discovery-card.test.tsx`
- **Detail**: Tests used active subgenres only; no regression guard for `filterActiveSubgenres` on discovery card path.
- **Fix**: Test case `subgenres: ["neurofunk", "halftime"]` → Neurofunk visible, Halftime absent.
- **Decision**: FIXED (impl-review 2026-06-28)

## S-24 compatibility (post-push `main`)

| Area | Assessment |
|------|------------|
| `CrewForm` / `/team` | Compatible – edit without subgenre change preserves legacy in DB (F2) |
| `CrewDashboard` badges | Uses `EventCardSubgenreBadges` → legacy hidden in UI |
| Forum threads | No subgenre field; crew context unaffected |
| DB `crews.subgenres` | Additive enum only; RLS unchanged |
| E2E `crew-teams.spec.ts` | PASS in full suite (33/33) |

## E2E coverage map (S-29 manual QA)

| Manual QA item (plan) | E2E coverage |
|-----------------------|--------------|
| `/events` – 13 podgatunków w filtrze | ✅ guest: count + labels |
| URL `?subgenre=halftime` ignorowany | ✅ guest: URL + checkbox state |
| Event z legacy tagiem – brak badge | ✅ DB fixture + detail page |
| Admin zapis z `garage` po migracji | ✅ admin form + row in catalog |
| Profil – 13 chipów | ✅ fan profile editor |
| Fan submit – 13 checkboxów | ✅ `/my-events/new` |
| Edycja ekipy bez zmiany podgatunków | ⚠️ unit logic only (F2); no dedicated E2E PATCH assert |
| Sugestia zmiany podgatunków → admin apply | ⚠️ unit/API tests only |

## Positive notes

- Single module `src/lib/subgenres.ts` centralizes active vs legacy logic.
- `Subgenre` type remains superset of Postgres enum – Supabase reads need no casts.
- Display surfaces consistently use `filterActiveSubgenres` before labels.
- URL poison (`?subgenre=halftime`) safely ignored via `isActiveSubgenre`.
- Sugestie zmian extended without breaking duplicate-flow payload shape.
- Zero destructive SQL; no mass `UPDATE` on tag columns.
- S-24 + S-29 ship together safely after F1/F2.

## Triage summary

| ID | Decision | Action |
|----|----------|--------|
| F1 | FIXED | `CrewDashboard` typing |
| F2 | FIXED | `activeSubgenresChanged` omit-on-save |
| F3 | ACCEPTED-AS-DESIGNED | – |
| F4 | SKIPPED | Deploy: migration before code |
| F5 | SKIPPED | Issue at archive |
| F6 | FIXED | E2E spec + fixture |
| F7 | FIXED | Unit test legacy badge hide |

**Ready for `/10x-archive`** after: commit to tree, migration applied on production DB before deploy, GitHub issue + board sync during archive.

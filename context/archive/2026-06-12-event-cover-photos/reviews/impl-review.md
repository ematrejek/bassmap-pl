<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Event Cover Photos

- **Plan**: context/changes/event-cover-photos/plan.md
- **Scope**: All phases (1–4)
- **Date**: 2026-06-13
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 5 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING ⚠️ |
| Scope Discipline | WARNING ⚠️ |
| Safety & Quality | WARNING ⚠️ |
| Architecture | WARNING ⚠️ |
| Pattern Consistency | PASS ✅ |
| Success Criteria | PASS ✅ |

## Findings

### F1 — Phase 2 upload architecture differs from plan

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: src/pages/api/admin/events/[id]/cover.ts, src/lib/supabase-service.ts
- **Detail**: Plan specified browser-side upload via `createBrowserClient` (`supabase-browser.ts`) with `supabaseUrl`/`supabaseAnonKey` props on `EventForm`. Implementation uses server multipart endpoint + `SUPABASE_SERVICE_ROLE_KEY`. Product goals are met; architecture inverted from plan (“bez multipart API na Workerze”).
- **Fix A ⭐ Recommended**: Add plan addendum documenting server-side upload + service role rationale (RLS/session issues on Windows).
  - Strength: Preserves working production fix; updates source of truth for future agents.
  - Tradeoff: Plan becomes a moving target.
  - Confidence: HIGH — user verified upload works with this approach.
  - Blind spot: Stakeholders who reviewed original browser-upload design not notified.
- **Fix B**: Revert to browser upload per plan
  - Strength: Strict plan adherence.
  - Tradeoff: Reintroduces upload failures user already hit; requires RLS/session debugging.
  - Confidence: LOW — prior manual tests failed with browser path.
  - Blind spot: Whether service role can be removed entirely.
- **Decision**: FIXED via Fix A — plan addendum 2026-06-13

### F2 — Orphan Storage file when upload succeeds but DB update fails

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/admin/events/[id]/cover.ts:87–103
- **Detail**: `storage.upload` succeeds, then `updateEvent` may fail. Uploaded object remains in `event-covers` without `cover_path` in DB.
- **Fix**: On `updateEvent` error, call `storageClient.storage.remove([storagePath])` before returning 400.
- **Decision**: FIXED — rollback on DB failure (2026-06-13 triage)

### F3 — Old cover deleted before DB update on replace

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/events.ts:293–295
- **Detail**: On cover replace (e.g. JPG→PNG), `removeEventCoverFromStorage` runs before DB `UPDATE`. If update fails, DB still points at deleted file.
- **Fix**: Move `removeEventCoverFromStorage` to after successful DB update (or only delete path that differs from new path post-commit).
- **Decision**: FIXED — delete after DB commit (2026-06-13 triage)

### F4 — removeEventCoverFromStorage ignores Storage errors

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/events.ts:32–34
- **Detail**: `remove()` result is discarded. Clear-cover and delete-event flows may leave orphan files silently.
- **Fix**: Check `{ error }` from `remove()`; ignore only “not found”, propagate other errors to caller.
- **Decision**: FIXED — check remove result, ignore not-found (2026-06-13 triage)

### F5 — cover_aspect feature outside original plan scope

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: supabase/migrations/20260612140000_event_cover_aspect.sql, src/types.ts, EventForm.tsx
- **Detail**: Portrait/landscape aspect (DB column, UI radios, preview layout) added beyond plan phases. User-requested during implementation; product value clear.
- **Fix**: Document in plan.md Phase 2/3 as approved addendum; note in research.md decision log.
- **Decision**: FIXED — documented in plan addendum 2026-06-13

### F6 — MIME validation trusts client metadata only

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/storage/event-covers.ts:39–66
- **Detail**: `validateCoverFile` uses `file.type` and extension; no magic-byte sniffing. Malicious non-image could pass if bucket MIME check is bypassed.
- **Fix**: Add server-side magic-byte check in `cover.ts` after reading `bytes` (JPEG/PNG/WebP signatures).
- **Decision**: FIXED — verifyCoverMagicBytes in cover.ts (2026-06-13 triage)

### F7 — Flaky unrelated integration timeout during review run

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: tests/integration/auth-mutation-allow.test.ts:30
- **Detail**: One run during review: `is_admin RPC and create succeed` timed out at 5000ms; 50/51 passed. Not cover-related; likely Supabase cold-start flake. Prior session reported 51/51 green.
- **Fix**: Increase timeout on admin harness test or retry once — separate from cover slice.
- **Decision**: SKIPPED — pre-existing flake, not cover-related (2026-06-13 triage)

### F8 — EventPreviewCard preview layout exceeds plan thumbnail spec

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/discovery/EventPreviewCard.tsx
- **Detail**: Plan said `variant="preview"` as ~64×64 thumb; implementation uses full-width portrait/landscape hero in popup per user UX feedback. Intentional improvement.
- **Fix**: Update plan Phase 3 contract to “full-width cover in preview card”.
- **Decision**: FIXED — plan Phase 3 intent updated (2026-06-13 triage)

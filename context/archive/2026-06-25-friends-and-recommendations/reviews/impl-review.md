<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Friends and Recommendations (S-23)

- **Plan**: context/changes/friends-and-recommendations/plan.md
- **Scope**: Full plan (Phases 1–5 + follow-up `9dfca5d`)
- **Date**: 2026-06-25
- **Verdict**: APPROVED (post-triage fixes applied)
- **Findings**: 0 critical, 0 open warnings, 1 skipped observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Automated verification (re-run 2026-06-25)

| Command | Result |
|---------|--------|
| `npm run verify` | PASS |
| `npm run build` | PASS (after `npm run cache:clean`) |
| `npm run test:e2e` | PASS 17/17 (after `npm run cache:clean`) |

Note: first `build` / `e2e` attempt failed with stale Vite cache (`node_modules/.vite/deps_ssr` missing). Not an S-23 logic failure; matches `context/foundation/lessons.md` Vite cache lesson.

## Manual verification

All Progress manual items for Phases 1–5 are `[x]`, including follow-up friend-request notifications verified by user in session.

## Findings

### F1 – `create_notification` RPC allows unvalidated cross-user notifications

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260625100000_friends_recommendations_notifications.sql:149–214
- **Detail**: `GRANT EXECUTE ... TO authenticated` lets any logged-in user call `create_notification` with arbitrary `recipient_id`, `type`, and optional `event_id` / `friend_request_id`. RPC checks actor = `auth.uid()` and type enum, but not that the caller is party to the referenced friend request or recommendation. A malicious client could spam notifications.
- **Fix**: Harden RPC with context checks per `type` (friend request exists + caller is requester; event recommendation path only via service role or validated friendship + event), or revoke `authenticated` grant and expose creation only through additional SECURITY DEFINER helpers called from app services.
  - Strength: Closes abuse vector at the database boundary.
  - Tradeoff: New migration + test updates.
  - Confidence: HIGH – pattern matches other hardened RPCs in repo.
  - Blind spot: None significant.
- **Decision**: FIXED (hardened RPC in `20260625120000_harden_create_notification.sql`)

### F2 – Notification and domain row created in separate steps (no transaction)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/friends.ts:245–282, 307–338; src/lib/services/event-recommendations.ts:91–121
- **Detail**: Friend invite: insert `friend_requests` then `create_notification` – failure on step 2 leaves pending invite without notification; retry hits existing pending branch and still skips notification. Accept: status updated before notify requester. Recommendation: notification created before `event_recommendations` insert – orphan notification on insert failure; retry can duplicate notifications.
- **Fix**: Wrap each flow in a single Postgres RPC/transaction (insert both rows or neither), or add idempotent “repair missing notification” on retry.
  - Strength: Eliminates inconsistent states users already hit in manual QA edge cases.
  - Tradeoff: One new migration with RPC functions.
  - Confidence: HIGH – standard pattern for multi-table writes.
  - Blind spot: Existing orphan rows in local DB may need one-off cleanup.
- **Decision**: FIXED (`20260625130000_atomic_friend_and_recommendation_writes.sql` + service RPC calls)

### F3 – Declined friend request blocks future re-invite forever

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/friends.ts:224–229; supabase/migrations/20260625100000_friends_recommendations_notifications.sql:18
- **Detail**: Unique pair `(pair_user_low, pair_user_high)` applies to all statuses. After `declined`, `createFriendRequestByLogin` returns `FRIEND_REQUEST_NOT_PENDING_ERROR` instead of allowing a fresh invite. No DELETE policy for declined/pending rows.
- **Fix**: DELETE friend_request row on decline (or reset to pending when requester re-invites), plus RLS policy for requester cancel on pending.
- **Decision**: FIXED (decline deletes row + re-invite path + RLS delete policies)

### F4 – Event recommendation notification body may exceed DB limit (500 chars)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/event-recommendations.ts:87–89
- **Detail**: `notifications.body` has `char_length(body) BETWEEN 1 AND 500`. Template adds sender label + event name + optional message (up to 300). Long event names can cause RPC failure on otherwise valid input.
- **Fix**: Truncate composed body to 500 chars before `createNotification`, or shorten event name in template.
- **Decision**: FIXED (truncate in `event-recommendations.ts`)

### F5 – No dedicated E2E for friends → recommendation → bell flow

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: tests/e2e/ (missing S-23 spec)
- **Detail**: Plan Phase 5 expected UI-heavy smoke for this slice. Existing E2E covers forum/events/smoke but not the S-23 vertical path. Unit + RLS tests pass; manual QA done in session.
- **Fix**: Add `tests/e2e/friends-recommendations.spec.ts` with serial flow: send request → accept → recommend event → bell unread → open event.
- **Decision**: FIXED (`tests/e2e/friends-recommendations.spec.ts`)

### F6 – Roadmap still `planned` while change is `implemented`

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/foundation/roadmap.md (S-23 rows)
- **Detail**: `change.md` status `implemented`; roadmap table and S-23 section still `planned`. Expected to sync during `/10x-archive`, not blocking merge if archive follows immediately.
- **Fix**: Update roadmap + GitHub issue #43 during archive session.
- **Decision**: SKIPPED (defer to `/10x-archive`)

### F7 – `FriendActionButton` loads full friends overview per profile view

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (performance)
- **Location**: src/components/fan/FriendActionButton.tsx
- **Detail**: Each public profile visit calls `GET /api/fan/friends` to resolve one relationship. Acceptable at MVP scale; unnecessary payload as friend lists grow.
- **Fix**: Add lightweight `GET /api/fan/friends/status?userId=` or SSR relationship state on profile page.
- **Decision**: FIXED (`status` API + `useFriendRelationship` hook)

## Positive notes

- RLS keeps friend requests, recommendations, and notifications private to involved users.
- API routes follow repo conventions (`prerender = false`, `requireAuth`, zod, `jsonResponse`).
- Admin accounts are not blocked from fan friend/recommendation endpoints.
- Pair uniqueness A↔B enforced.
- Notification bell, event recommendations, and post-review friend-request notifications work in manual QA.
- Follow-up commit `9dfca5d` aligns with schema types prepared in Phase 1; not scope creep for email/websocket/S-24.

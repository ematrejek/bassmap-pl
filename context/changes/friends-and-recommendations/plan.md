# Friends and Recommendations Implementation Plan

## Overview

Implement S-23: private friend connections between fan accounts, event recommendations sent only to accepted friends, and in-app notifications surfaced through a visible bell in the top navigation. E-mail notifications are deliberately out of the MVP and stay as a later phase after the in-app flow is working.

## Current State Analysis

BassMap PL already has the foundations needed for this slice: fan profiles with public logins, RSVP/event attendance, event detail interactions, a protected `/team` placeholder, and API conventions built around `requireAuth`, zod validation, service functions, and `jsonResponse`.

What is missing today:

- no friend request or friendship data model,
- no private recommendation data model,
- no notification data model,
- no notification bell in the global app shell,
- no UI for sending, accepting, declining, or viewing friend requests,
- no event recommendation UI on the event detail page.

## Desired End State

A logged-in user can open another fan's public profile, send a friend request, see pending requests and accepted friends on `/team`, and accept or decline incoming requests. From an event detail page, the user can recommend an upcoming published event to one accepted friend with an optional short message. The recipient sees an in-app notification from the top-bar bell and can open the recommended event.

The feature is private by default: friend lists and notifications are not publicly visible. Admin accounts may use the feature as fan accounts, matching the user's planning decision, so new fan endpoints must not block admins by role.

### Key Discoveries:

- `fan_profiles` already provides public fan identity through `user_id` and unique `login`, with public reads and owner-only writes in `supabase/migrations/20260624100000_fan_profiles.sql:3`.
- `event_attendance` is the closest relation pattern for `user_id + event_id`, uniqueness, indexes, and published-event checks in `supabase/migrations/20260623100000_event_attendance.sql:3`.
- Private RLS should copy the "own records only" shape from change suggestions in `supabase/migrations/20260616140000_duplicate_detection_and_suggestions.sql:55`.
- API routes must use `export const prerender = false`, uppercase handlers, zod validation, `requireAuth`, and `jsonResponse`, as shown in `src/pages/api/events/[id]/attendance.ts:11`.
- Global navigation is currently rendered in `src/components/shell/AppShell.astro:17` with `AppMenu` as a `client:only="react"` island, so the notification bell should be added next to the menu in the header.
- `/team` is currently a protected placeholder and is the best MVP home for friends and requests in `src/pages/team.astro:10`.

## What We're NOT Doing

- No e-mail notifications in the MVP.
- No Resend dependency in this slice.
- No public list of friends on profiles.
- No recommending events to non-friends.
- No recommendation from event cards in the discovery grid.
- No full crew/team feature from S-24.
- No admin moderation panel for private notifications.
- No real-time websocket updates; the bell can fetch on load and after user actions.

## Implementation Approach

Build this in five incremental phases. First add the data model and typed contracts, then friend request services/API, then the `/team` UI, then event recommendations with notification creation, and finally the top-bar notification bell plus full verification.

The most important invariant is privacy: RLS and service queries must treat friend requests, accepted friendships, recommendations, and notifications as private records visible only to the involved users. The second important invariant is pair uniqueness: A -> B and B -> A must be treated as one relationship pair, not two independent pending requests.

## Critical Implementation Details

### User Identity And Admins

Planning decision: admin accounts may use the feature as fan accounts. Unlike `src/pages/api/fan/profile.ts`, these new fan endpoints should not reject `context.locals.isAdmin`. They should still require authentication and should resolve display data from `fan_profiles`.

### Pair Uniqueness

Friend requests must block duplicate pairs in both directions. Use normalized pair columns or a functional unique index over `least(requester_id, addressee_id)` and `greatest(requester_id, addressee_id)`. This is load-bearing because the UI decision says that if B tries to invite A while A -> B is pending, B should see the existing request and be able to accept it.

### Notification Bell

The bell is not part of the existing menu sheet. It should be a separate React island in the fixed top header, next to `AppMenu`, so logged-in users see it without opening the menu.

## Phase 1: Data Model, RLS, And Shared Types

### Overview

Add the private database foundation for friend requests, event recommendations, and notifications. This phase should be verified before any UI depends on the new tables.

### Changes Required:

#### 1. Supabase Migration

**File**: `supabase/migrations/<timestamp>_friends_recommendations_notifications.sql`

**Intent**: Add the three private data areas needed by S-23: friend relationships, event recommendations, and notifications.

**Contract**: Create `friend_requests`, `event_recommendations`, and `notifications` with RLS enabled. `friend_requests` stores `requester_id`, `addressee_id`, `status` (`pending`, `accepted`, `declined`), timestamps, a self-invite check, and pair uniqueness. `event_recommendations` stores sender, recipient, event, optional short message, sender label snapshot, and read timestamp or notification reference. `notifications` stores recipient, optional actor, actor label snapshot, type, event/friend request references, body, read timestamp, and created timestamp.

#### 2. RLS Policies

**File**: `supabase/migrations/<timestamp>_friends_recommendations_notifications.sql`

**Intent**: Keep friend and notification data private while still allowing the involved users to act.

**Contract**: `friend_requests` can be selected by requester or addressee, inserted by requester, and updated only by the addressee for accept/decline. `event_recommendations` can be inserted by sender only when recipient is an accepted friend and event is published/upcoming; selected by sender or recipient. `notifications` can be selected and updated only by `recipient_id = auth.uid()`. Any server-side notification insert must be supported by a safe database function or tightly scoped policy, not by opening arbitrary notification writes to all authenticated users.

#### 3. Immutable Field Protection

**File**: `supabase/migrations/<timestamp>_friends_recommendations_notifications.sql`

**Intent**: Prevent users from changing protected fields after creation.

**Contract**: Add trigger protection similar to `change_suggestions_restrict_mutable_columns` for rows where only status/read timestamps should change after creation.

#### 4. Shared Types

**File**: `src/types.ts`

**Intent**: Add TypeScript types for new database rows and public API DTOs.

**Contract**: Add row and mapped types for `FriendRequest`, `Friend`, `EventRecommendation`, `Notification`, plus union types for statuses and notification kinds. Keep snake_case row types separate from camelCase app types, following existing `EventAttendanceRow` and `ForumThreadRow` patterns.

### Success Criteria:

#### Automated Verification:

- Migration applies locally with Supabase: `npx supabase migration up`.
- TypeScript still passes generated app types: `npm run check`.
- RLS integration tests for pair privacy and notification privacy pass: `npm test`.

#### Manual Verification:

- Review the migration manually and confirm no policy exposes friend lists or notifications publicly.
- Confirm the schema handles A -> B and B -> A as one relationship pair.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the database model and privacy rules look correct before proceeding.

---

## Phase 2: Friends Services And API

### Overview

Add the backend contract for listing friends, sending requests, accepting/rejecting requests, and removing a friendship.

### Changes Required:

#### 1. Friend Schemas

**File**: `src/lib/fan/friends-schema.ts`

**Intent**: Validate user input before it reaches service logic.

**Contract**: Add schemas for sending a request by `targetLogin`, updating request status to `accepted` or `declined`, and deleting a friend relationship by id or pair id. Use Polish validation messages.

#### 2. Friends Service

**File**: `src/lib/services/friends.ts`

**Intent**: Centralize friend request business logic outside API routes.

**Contract**: Provide functions to list accepted friends, list pending incoming/outgoing requests, create request by target login, resolve reverse pending request, accept/decline request, and remove friendship. Return `{ data } | { error }` like existing services. Map fan profile data so UI can show login and `/u/login` links without exposing private e-mail.

#### 3. Friends API

**Files**:

- `src/pages/api/fan/friends/index.ts`
- `src/pages/api/fan/friends/requests/index.ts`
- `src/pages/api/fan/friends/requests/[id].ts`
- `src/pages/api/fan/friends/[id].ts`

**Intent**: Expose private friend actions to authenticated users.

**Contract**: `GET /api/fan/friends` returns accepted friends and pending requests. `POST /api/fan/friends/requests` accepts `{ targetLogin }`. `PATCH /api/fan/friends/requests/[id]` accepts `{ status: "accepted" | "declined" }`. `DELETE /api/fan/friends/[id]` removes an accepted relationship. All routes export `prerender = false`, use `requireAuth`, use `createClient`, and return `jsonResponse`.

#### 4. Friend API Unit Tests

**File**: `tests/unit/friends-api.test.ts`

**Intent**: Lock the API behavior without requiring a browser.

**Contract**: Cover unauthenticated access, invalid JSON, unknown login, self-invite, duplicate/reverse request, accept/decline, and delete. Mock `APIContext` through `as unknown as APIContext`, following the repository lesson.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test -- tests/unit/friends-api.test.ts`.
- Type checking passes: `npm run check`.
- Linting passes for changed files: `npm run lint`.

#### Manual Verification:

- Use two local users and confirm one can send a request to the other's login.
- Confirm reverse invite shows the existing pending request instead of creating a duplicate.
- Confirm a non-involved user cannot see or modify the request.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the API contract matches the expected friend flow.

---

## Phase 3: Friends UI On Profile And `/team`

### Overview

Add the visible friend actions: invite from a public profile, search by login, and manage friends/requests on `/team`.

### Changes Required:

#### 1. Public Profile Friend Action

**Files**:

- `src/pages/u/[login].astro`
- `src/components/fan/PublicProfileView.tsx`
- `src/components/fan/ProfileView.tsx`
- `src/components/fan/FriendActionButton.tsx`

**Intent**: Let a logged-in user send or respond to a friend request from another fan's public profile.

**Contract**: Pass enough owner/current-user context into the public profile island to hide friend actions for the owner and show them for other profiles. Add `FriendActionButton` as a React component that fetches current relationship state and can send, accept, or show an already-pending state.

#### 2. `/team` Friends Dashboard

**Files**:

- `src/pages/team.astro`
- `src/components/fan/FriendsDashboard.tsx`

**Intent**: Replace the placeholder with a real private friend area while keeping full S-24 crew teams out of scope.

**Contract**: Server-render the page shell and hydrate a React island for friend management. The dashboard shows accepted friends, incoming requests, outgoing requests, and a search/invite form by login. Copy must make clear this is the friends MVP, not full crew/team management.

#### 3. Friend UI Hook

**File**: `src/components/hooks/useFriends.ts`

**Intent**: Keep fetch state, errors, optimistic refreshes, and loading UI out of presentation components.

**Contract**: Fetch from `/api/fan/friends` with `credentials: "include"`, expose actions for send/accept/decline/delete, and refetch after each mutation.

#### 4. Route And Navigation Copy

**Files**:

- `src/lib/routes.ts`
- `src/components/shell/AppMenu.tsx`

**Intent**: Keep `/team` route unchanged for now but make the label understandable for the current MVP.

**Contract**: Either keep label "Moja ekipa" with explanatory copy on the page, or adjust menu copy to "Znajomi i ekipa" if the UI needs less ambiguity. Do not add full S-24 team concepts.

### Success Criteria:

#### Automated Verification:

- Component and hook tests pass if added: `npm test`.
- Type checking passes: `npm run check`.
- Linting passes: `npm run lint`.

#### Manual Verification:

- On `/u/login`, a logged-in user can send a friend request to another fan.
- On `/team`, the recipient can accept or decline the request.
- Accepted friends appear for both users.
- Friend list is not visible to anonymous users or unrelated users.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that the visible friend flow feels right.

---

## Phase 4: Event Recommendations And Notification Creation

### Overview

Let a user recommend an upcoming published event to an accepted friend and create an in-app notification for the recipient.

### Changes Required:

#### 1. Recommendation Schema

**File**: `src/lib/events/recommendation-schema.ts`

**Intent**: Validate recommendation target and optional message.

**Contract**: Accept `{ recipientUserId: string, message?: string }`. Message is optional, trimmed, and short enough to be safe for notifications. Use Polish error messages.

#### 2. Recommendation Service

**File**: `src/lib/services/event-recommendations.ts`

**Intent**: Encapsulate friend eligibility, event eligibility, insert behavior, and notification creation.

**Contract**: Verify that sender and recipient are accepted friends, the event is published and upcoming, and the recipient is not the sender. Insert an `event_recommendations` row and create a matching notification in one ordered operation. Store sender label from fan profile snapshot, similar to author labels in forum/comment code.

#### 3. Notifications Service

**File**: `src/lib/services/notifications.ts`

**Intent**: Provide reusable notification list, unread count, creation, and read marking logic.

**Contract**: Provide functions to list current user's notifications, count unread, mark one notification read, and optionally mark all read. Keep recipient filtering explicit in service queries, not only in RLS.

#### 4. Recommendation API

**Files**:

- `src/pages/api/events/[id]/recommendations.ts`
- `src/pages/api/fan/recommendations/events.ts`

**Intent**: Expose event recommendation creation and optional history/listing.

**Contract**: `POST /api/events/[id]/recommendations` creates a recommendation for a friend. `GET /api/fan/recommendations/events` returns recommendations received by the current user if needed for notification detail/history. Both require auth and should allow admin accounts as fan participants.

#### 5. Event Detail UI

**Files**:

- `src/pages/events/[id].astro`
- `src/components/events/EventRecommendationPanel.tsx`
- `src/components/hooks/useEventRecommendations.ts`

**Intent**: Add a small event recommendation action to the event detail page without crowding RSVP and comments.

**Contract**: Place the panel near the existing RSVP section. It lets the user choose one accepted friend, write an optional short message, and send. If the user is not logged in, show a sign-in prompt. If the user has no friends, link to `/team`.

#### 6. Recommendation API Unit Tests

**File**: `tests/unit/event-recommendations-api.test.ts`

**Intent**: Lock backend behavior for recommendation creation.

**Contract**: Cover unauthenticated user, invalid event id, ended/unpublished event, non-friend recipient, self-recipient, invalid message, success, and service error mapping.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test -- tests/unit/event-recommendations-api.test.ts`.
- RLS tests for recommendation privacy pass: `npm test`.
- Type checking passes: `npm run check`.
- Linting passes: `npm run lint`.

#### Manual Verification:

- User A can recommend an upcoming event to accepted friend B.
- User B receives an in-app notification for the recommendation.
- User A cannot recommend the event to a non-friend.
- Ended or unavailable events cannot be recommended.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation that recommendations behave correctly before adding the bell UI.

---

## Phase 5: Top-Bar Notification Bell, Final Tests, And Roadmap Sync

### Overview

Make notifications visible through a bell in the fixed top navigation and complete the verification gate for a UI-heavy, privacy-sensitive feature.

### Changes Required:

#### 1. Notification API

**Files**:

- `src/pages/api/fan/notifications/index.ts`
- `src/pages/api/fan/notifications/[id]/read.ts`

**Intent**: Provide the bell with private notification data.

**Contract**: `GET /api/fan/notifications` returns recent notifications plus unread count. `PATCH /api/fan/notifications/[id]/read` marks one notification read. Optional `PATCH /api/fan/notifications/read-all` can be added only if needed by the UI.

#### 2. Notification Bell

**Files**:

- `src/components/notifications/NotificationBell.tsx`
- `src/components/hooks/useNotifications.ts`
- `src/components/shell/AppShell.astro`

**Intent**: Show a visible notification bell in the top bar, next to the existing menu.

**Contract**: The bell renders only for logged-in users. It shows an unread badge, opens a small popover/sheet with recent notifications, and links each event recommendation to `/events/<event-id>`. Use `client:only="react"` because this is an interactive Radix-style island.

#### 3. Optional Notifications Page Or History Fallback

**Files**:

- `src/pages/notifications.astro`
- `src/middleware.ts`
- `src/lib/routes.ts`

**Intent**: Add a full notification history page only if the bell needs more space than a small top-bar popover.

**Contract**: If added, define `NOTIFICATIONS_PATH`, protect it in `PROTECTED_ROUTES`, and link to it from the bell. If the bell is sufficient for MVP, omit the page and keep the route out of this slice.

#### 4. Integration And E2E Tests

**Files**:

- `tests/integration/friends-recommendations-rls.test.ts`
- `tests/unit/notifications-api.test.ts`
- `tests/e2e/event-workflows.spec.ts` or a focused new smoke test if suitable

**Intent**: Verify private data rules and catch hydration/UI regressions.

**Contract**: Integration tests must use at least two normal users and one unrelated user. Cover private friend request visibility, accepted friendship visibility, recommendation visibility, notification recipient privacy, read marking, and pair uniqueness.

#### 5. Roadmap And Legal Follow-Up Notes

**Files**:

- `context/foundation/roadmap.md`
- `context/changes/friends-and-recommendations/change.md`

**Intent**: Keep local roadmap status aligned with active planning and record legal obligations for archive time.

**Contract**: Mark S-23 as active/planned locally. Leave legal copy changes for `/10x-archive`, but keep the reminder that S-23 is a UGC/privacy slice requiring updates to `src/pages/privacy-policy.astro`, `src/pages/terms.astro`, and `LEGAL_UPDATED_AT` when archived.

### Success Criteria:

#### Automated Verification:

- Full project gate passes: `npm run verify`.
- Production build passes: `npm run build`.
- UI-heavy smoke passes: `npm run test:e2e` or full gate `npm run verify:full`.

#### Manual Verification:

- The bell is visible in the top bar for logged-in users and hidden for guests.
- Unread count changes after a recommendation is received and after it is opened/marked read.
- A notification links to the correct event detail page.
- The menu and bell both work on desktop and mobile.

**Implementation Note**: After completing this phase and all automated verification passes, pause for final manual QA before archiving the slice.

---

## Testing Strategy

### Unit Tests:

- API auth and validation for friends endpoints.
- API auth and validation for recommendations endpoints.
- API auth and validation for notification endpoints.
- Service behavior for self-invite, duplicate pair, reverse pending request, non-friend recommendation, and read marking.

### Integration Tests:

- RLS: requester and addressee can see a friend request; unrelated user cannot.
- RLS: only addressee can accept or decline a pending request.
- RLS: accepted friends are visible only to the two involved users.
- RLS: only recipient sees notifications.
- RLS: only recipient can mark a notification read.
- RLS: sender can recommend only to accepted friends.
- RLS: reverse pair uniqueness blocks duplicate relationships.

### Manual Testing Steps:

1. Create or use two normal fan accounts with public logins.
2. Log in as user A and send a friend request to user B from `/u/<login>`.
3. Log in as user B and accept the incoming request on `/team`.
4. Confirm both users see each other as accepted friends.
5. Open an upcoming event as user A and recommend it to user B with a short message.
6. Log in as user B and confirm the top-bar bell shows a new unread notification.
7. Open the notification and confirm it links to the correct event.
8. Confirm an unrelated user cannot see the request, friendship, recommendation, or notification.
9. Confirm guest users do not see private friend or notification UI.

## Performance Considerations

MVP volume is small, so simple indexed queries are acceptable. Add indexes for user pair lookups, recipient unread notifications, event recommendations by event/recipient, and created timestamps. Avoid loading all notifications into the bell; fetch a small recent page plus unread count.

## Migration Notes

This slice requires deploying the database migration before deploying code that queries the new tables. Follow the existing deployment lesson from profile and RSVP slices: `db push` or local migration first, then app deploy.

No existing data migration is needed because friends, recommendations, and notifications are new.

## References

- Related research: `context/changes/friends-and-recommendations/research.md`
- Roadmap slice: `context/foundation/roadmap.md`
- Fan profile schema/RLS: `supabase/migrations/20260624100000_fan_profiles.sql:3`
- RSVP schema/RLS: `supabase/migrations/20260623100000_event_attendance.sql:3`
- Private RLS example: `supabase/migrations/20260616140000_duplicate_detection_and_suggestions.sql:55`
- Immutable field trigger example: `supabase/migrations/20260617180300_harden_change_suggestions_rls.sql:22`
- API pattern: `src/pages/api/events/[id]/attendance.ts:11`
- Global shell: `src/components/shell/AppShell.astro:17`
- Menu links: `src/components/shell/AppMenu.tsx:50`
- Public profile route: `src/pages/u/[login].astro:43`
- Profile action area: `src/components/fan/ProfileView.tsx:68`
- Team placeholder: `src/pages/team.astro:10`
- Event detail interaction area: `src/pages/events/[id].astro:95`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Data Model, RLS, And Shared Types

#### Automated

- [x] 1.1 Migration applies locally with Supabase: `npx supabase migration up` — 91658d1
- [x] 1.2 TypeScript still passes generated app types: `npm run check` — 91658d1
- [x] 1.3 RLS integration tests for pair privacy and notification privacy pass: `npm test` — 91658d1

#### Manual

- [x] 1.4 Review the migration manually and confirm no policy exposes friend lists or notifications publicly — 91658d1
- [x] 1.5 Confirm the schema handles A -> B and B -> A as one relationship pair — 91658d1

### Phase 2: Friends Services And API

#### Automated

- [x] 2.1 Unit tests pass: `npm test -- tests/unit/friends-api.test.ts` — 73e2505
- [x] 2.2 Type checking passes: `npm run check` — 73e2505
- [x] 2.3 Linting passes for changed files: `npm run lint` — 73e2505

#### Manual

- [x] 2.4 Use two local users and confirm one can send a request to the other's login — 73e2505
- [x] 2.5 Confirm reverse invite shows the existing pending request instead of creating a duplicate — 73e2505
- [x] 2.6 Confirm a non-involved user cannot see or modify the request — 73e2505

### Phase 3: Friends UI On Profile And `/team`

#### Automated

- [x] 3.1 Component and hook tests pass if added: `npm test`
- [x] 3.2 Type checking passes: `npm run check`
- [x] 3.3 Linting passes: `npm run lint`

#### Manual

- [x] 3.4 On `/u/login`, a logged-in user can send a friend request to another fan
- [x] 3.5 On `/team`, the recipient can accept or decline the request
- [x] 3.6 Accepted friends appear for both users
- [x] 3.7 Friend list is not visible to anonymous users or unrelated users

### Phase 4: Event Recommendations And Notification Creation

#### Automated

- [ ] 4.1 Unit tests pass: `npm test -- tests/unit/event-recommendations-api.test.ts`
- [ ] 4.2 RLS tests for recommendation privacy pass: `npm test`
- [ ] 4.3 Type checking passes: `npm run check`
- [ ] 4.4 Linting passes: `npm run lint`

#### Manual

- [ ] 4.5 User A can recommend an upcoming event to accepted friend B
- [ ] 4.6 User B receives an in-app notification for the recommendation
- [ ] 4.7 User A cannot recommend the event to a non-friend
- [ ] 4.8 Ended or unavailable events cannot be recommended

### Phase 5: Top-Bar Notification Bell, Final Tests, And Roadmap Sync

#### Automated

- [ ] 5.1 Full project gate passes: `npm run verify`
- [ ] 5.2 Production build passes: `npm run build`
- [ ] 5.3 UI-heavy smoke passes: `npm run test:e2e` or full gate `npm run verify:full`

#### Manual

- [ ] 5.4 The bell is visible in the top bar for logged-in users and hidden for guests
- [ ] 5.5 Unread count changes after a recommendation is received and after it is opened/marked read
- [ ] 5.6 A notification links to the correct event detail page
- [ ] 5.7 The menu and bell both work on desktop and mobile

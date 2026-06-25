# Friends and Recommendations — Plan Brief

> Full plan: `context/changes/friends-and-recommendations/plan.md`
> Research: `context/changes/friends-and-recommendations/research.md`

## What & Why

Build S-23: friends between fan accounts, event recommendations sent only to accepted friends, and in-app notifications shown through a visible bell in the top navigation. The goal is to make BassMap more social without exposing private friend lists or adding e-mail complexity too early.

## Starting Point

The app already has fan profiles with public logins, RSVP/event attendance, event detail interactions, a `/team` placeholder, and strong API/RLS patterns. It does not yet have friend requests, recommendations, notifications, or a notification bell.

## Desired End State

A logged-in user can invite another fan from `/u/login` or by searching login on `/team`, accept/decline requests, and see accepted friends privately. From an event page, they can recommend an upcoming event to an accepted friend with an optional short message. The recipient sees the notification from a top-bar bell and can open the event.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| MVP scope | In-app only, no e-mail | Reduces risk while delivering the social loop first | Plan |
| Friend visibility | Private | Protects user privacy and avoids public social graph exposure | Plan |
| Invite entry points | Public profile and login search | Covers both known-profile and direct-search flows | Plan |
| Recommendation audience | Accepted friends only | Prevents spam and keeps recommendations trusted | Plan |
| Data model | One `friend_requests` table with status | Keeps the MVP smaller while preserving pending and accepted states | Plan |
| Reverse invite | Show existing pending request and allow accept | Handles A -> B and B -> A naturally | Plan |
| Recommendation message | Optional short message | Makes recommendations personal without forcing extra text | Plan |
| Admin behavior | Admin can use feature as fan | Matches user decision and supports testing from admin accounts | Plan |
| Notification surface | Bell in top bar | More visible than hiding notifications inside the menu | Plan |

## Scope

**In scope:**

- Private friend requests and accepted friends.
- Invite from public profile and by login search.
- `/team` as friends/request dashboard for this MVP.
- Event recommendations only to accepted friends.
- Optional short recommendation message.
- Private in-app notifications.
- Top-bar notification bell with unread count.
- Unit, RLS integration, and UI smoke verification.

**Out of scope:**

- E-mail notifications.
- Resend setup.
- Public friend lists.
- Recommendations to non-friends.
- Full S-24 crew/team feature.
- Real-time websocket notifications.
- Admin moderation dashboard for private notifications.

## Architecture / Approach

Add three private database areas first: `friend_requests`, `event_recommendations`, and `notifications`, all protected by RLS. Put business logic in `src/lib/services/*`, keep API routes thin under `/api/fan/*` and `/api/events/[id]/recommendations`, add friend UI on `/team` and public profiles, then add recommendation UI on event details and a separate notification bell island in `AppShell`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data Model, RLS, And Shared Types | Private tables, policies, indexes, app types | Accidentally exposing private rows |
| 2. Friends Services And API | Friend list, send, accept, decline, delete | Reverse duplicate pair handling |
| 3. Friends UI On Profile And `/team` | Visible invite and request management flow | Confusing friends MVP with full teams |
| 4. Event Recommendations And Notification Creation | Recommend event to friend and create notification | Creating notifications safely under RLS |
| 5. Top-Bar Notification Bell, Final Tests, And Roadmap Sync | Visible bell, unread state, final verification | Hydration/mobile regressions |

**Prerequisites:** S-20 fan profiles and S-19 RSVP/event attendance are already done. Local Supabase is needed for full RLS testing.

**Estimated effort:** Around 3-5 focused sessions across 5 phases, because this touches database, API, UI, and privacy tests.

## Open Risks & Assumptions

- The notification bell may need a compact popover; if it becomes too crowded, a `/notifications` page can be added as a fallback.
- The migration must land before app code using the new tables.
- Legal copy is not part of implementation planning, but S-23 is a privacy/UGC slice and must update legal documents during archive.

## Success Criteria (Summary)

- A fan can send, accept, decline, and remove private friend relationships.
- A fan can recommend an upcoming event only to an accepted friend.
- The recipient sees a private top-bar notification with a working event link.
- Tests prove unrelated users cannot read or modify private friend, recommendation, or notification data.

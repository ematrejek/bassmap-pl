---
project: BassMap PL
context_type: greenfield
updated: 2026-06-08
checkpoint:
  current_phase: 7
  phases_completed: [1, 2, 3, 4, 5, 6]
  frs_drafted: 8
  quality_check_status: accepted
---

## Vision & Problem Statement

BassMap PL is the first centralized search engine for drum'n'bass events in Poland. The problem: DnB fans in Poland have no single source of truth for upcoming events. They must manually check Facebook, Instagram, friends, and partial ticketing portals (Biletomat, Muno) \u2013 each of which covers a different slice of the scene. Even when events are listed somewhere, fans cannot easily find artists they like. Existing platforms (Resident Advisor, Shotgun, Dice) focus on techno and international events; the Polish DnB scene is niche enough to be ignored by big platforms, yet large enough to sustain a dedicated portal. Facebook events are ephemeral and hard to aggregate. The insight: no one has built this for DnB in Poland specifically \u2013 and that is the gap BassMap fills.

## User & Persona

**Primary persona**: DnB fan in Poland. They want to find upcoming DnB events near them, discover events by subgenre from a fixed DnB catalog (25 values \u2013 see PRD §Business Logic), and see full event details (venue, lineup, ticket link, price) \u2013 all in one place, in Polish, without having to hunt across social media.

## Access Control

- **Anonymous fan**: full read access \u2013 no login required to browse events, filter, or view event details.
- **Fan (optional account)**: creates an account to access future extras (favorites, notifications). Account creation is optional \u2013 all core browsing is public.
- **Organizer**: submits events for admin review. _Note: organizer self-service is post-MVP (v2). In MVP, only admins add events._
- **Admin**: full write access \u2013 adds, edits, and removes events directly.

Auth model: optional login (email + password or OAuth). Browsing is fully public.

## Success Criteria

### Primary

Fan opens BassMap PL, filters by city and/or subgenre, sees a list of upcoming DnB events with map pins, opens an event, and views full details (name, date, venue, lineup, ticket link, price).

### Secondary

1. Fan filters events by subgenre and finds at least one result.
2. Fan clicks a ticket link and lands on the ticket purchase page.

### Guardrails

- Event dates and locations must be accurate \u2013 wrong info is worse than no info.
- Admin approval gate must hold: no unverified event is publicly visible.

## Functional Requirements

### Event discovery

- FR-001: Fan can view a list of upcoming DnB events sorted by date. Priority: must-have

  > Socrates: Counter-argument considered: "a list without curation is noise." Resolution: kept; list is the primary discovery surface. Curation adds value in v2.

- FR-002: Fan can filter events by city. Priority: must-have

  > Socrates: No counter-argument; it stands as written.

- FR-003: Fan can filter events by subgenre from the fixed 25-value catalog (see PRD §Business Logic). Priority: must-have

  > Socrates: No counter-argument; it stands as written.

- FR-004: Fan can view full event details (name, date, venue, lineup, ticket link, price). Priority: must-have

  > Socrates: Counter-argument considered: "lineup may not be available at submission time." Resolution: kept; lineup field is optional \u2013 event can be published without a complete lineup.

- FR-005: Fan can view events on an interactive map of Poland. Priority: must-have

  > Socrates: No counter-argument; it stands as written.

- FR-008: Fan can filter events by date range. Priority: nice-to-have

  > Socrates: Counter-argument considered: "default sort by date already handles most cases." Resolution: demoted to nice-to-have; default ascending date sort is sufficient for MVP.

### Admin management

- FR-006: Admin can add an event directly. Priority: must-have

  > Socrates: Counter-argument considered: "admin bottleneck limits scale." Resolution: kept for MVP; organizer self-service is v2. Admin-only entry keeps data quality high at launch.

- FR-007: Admin can edit or remove an event. Priority: must-have

  > Socrates: No counter-argument; it stands as written.

## User Stories

### US-01: Finding a local DnB event

**Given** I'm on BassMap PL
**When** I filter by my city and subgenre
**Then** I see a list of upcoming DnB events matching my criteria, with map pins, and I can click any event to see full details.

## Business Logic

BassMap surfaces upcoming DnB events near the user, filtered by subgenre, and hides past events automatically.

Supporting rules:

- An event is "upcoming" if its date is today or in the future (local Polish time). Past events are hidden from the public list and map automatically.
- Subgenre tags are set by the admin at entry time. An event can have multiple subgenre tags, each from the fixed 25-value catalog (PRD §Business Logic).
- An event requires: name, date, city, venue. Lineup, ticket link, and price are optional.
- Events are visible publicly only after admin verification (admin-added events are immediately published; any future organizer-submitted events require explicit admin approval).

## Non-Functional Requirements

- **Language**: all user-facing UI text in Polish.
- **Privacy**: no personal data collected from anonymous fans; browsing does not require cookies or tracking.
- **Device**: desktop-first web app (responsive layout, but desktop is the primary design target).

## Non-Goals

- No organizer self-service portal in MVP \u2013 admin is the sole data entry point. Rationale: keeps data quality high at launch; organizer accounts are v2.
- No fan accounts / personalization in MVP \u2013 browsing is fully anonymous. Rationale: reduces auth complexity for v1.
- No music preview / artist audio samples \u2013 v2 feature.
- No carpooling / crew-finding forum \u2013 v3 feature.
- No affiliate or monetization features in MVP \u2013 booking.com links etc. are post-launch.
- No events outside Poland in MVP \u2013 international events (nearby abroad, major European events) are v2+.

## Open Questions

_(none at close of shaping)_

## Forward: tech-stack

_(no stack preferences captured \u2013 deferred to 10x-tech-stack-selector)_

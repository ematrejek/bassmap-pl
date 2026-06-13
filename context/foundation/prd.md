---
project: BassMap PL
version: 1
status: draft
created: 2026-06-09
updated: 2026-06-10
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

BassMap PL is the first centralized search engine for drum'n'bass events in Poland. The problem: DnB fans in Poland have no single source of truth for upcoming events. They must manually check Facebook, Instagram, friends, and partial ticketing portals (Biletomat, Muno) — each of which covers a different slice of the scene. Even when events are listed somewhere, fans cannot easily find artists they like. Existing platforms (Resident Advisor, Shotgun, Dice) focus on techno and international events; the Polish DnB scene is niche enough to be ignored by big platforms, yet large enough to sustain a dedicated portal. Facebook events are ephemeral and hard to aggregate. The insight: no one has built this for DnB in Poland specifically — and that is the gap BassMap fills.

## User & Persona

**Primary persona**: DnB fan in Poland. They want to find upcoming DnB events near them, discover events by subgenre from the fixed DnB catalog (e.g. Neurofunk, Liquid DnB, Jump-up, Halftime — see Business Logic), and see full event details (venue, lineup, ticket link, price) — all in one place, in Polish, without having to hunt across social media.

## Success Criteria

### Primary

Fan opens BassMap PL, filters by city and/or subgenre, sees a list of upcoming DnB events with map pins, opens an event, and views full details (name, date, venue, lineup, ticket link, price).

### Secondary

1. Fan filters events by subgenre and finds at least one result.
2. Fan clicks a ticket link and lands on the ticket purchase page.

### Guardrails

- Event dates and locations must be accurate — wrong info is worse than no info.
- Admin approval gate must hold: no unverified event is publicly visible.

## User Stories

### US-01: Finding a local DnB event

- **Given** I'm on BassMap PL
- **When** I filter by my city and subgenre
- **Then** I see a list of upcoming DnB events matching my criteria, with map pins, and I can click any event to see full details.

## Functional Requirements

### Event discovery

- FR-001: Fan can view a list of upcoming DnB events sorted by date. Priority: must-have

  > Socrates: Counter-argument considered: "a list without curation is noise." Resolution: kept; list is the primary discovery surface. Curation adds value in v2.

- FR-002: Fan can filter events by city. Priority: must-have

  > Socrates: No counter-argument; it stands as written.

- FR-003: Fan can filter events by subgenre from the fixed catalog (25 values — see Business Logic). An event may match multiple subgenre filters when tagged accordingly. Priority: must-have

  > Socrates: Counter-argument considered: "four broad buckets are enough for MVP." Resolution: expanded to 25 scene-accurate subgenres (closed enum); filter UI may group or search, but stored values are only from the catalog.

- FR-004: Fan can view full event details (name, date, venue, lineup, ticket link, price). Priority: must-have

  > Socrates: Counter-argument considered: "lineup may not be available at submission time." Resolution: kept; lineup field is optional — event can be published without a complete lineup.

- FR-005: Fan can view events on an interactive map of Poland. Priority: must-have

  > Socrates: No counter-argument; it stands as written.

- FR-008: Fan can filter events by date range (single day or range) with calendar presets for today, this week, and this month; filters persist in URL; list and map show the same filtered set. Priority: must-have (Partia I)

  > Socrates: Counter-argument considered: "default sort by date already handles most cases." Resolution: originally demoted to nice-to-have for MVP; elevated to must-have (Partia I, 2026-06-13) — date filtering is the lead discovery slice after S-02.

- FR-010: Fan can filter the event list to free-entry events only (`is_free`); filter persists in URL and combines with city, subgenre, and date filters. Priority: must-have (Partia I)

  > Socrates: Counter-argument considered: "fans can scan prices in the list." Resolution: kept — explicit free-only toggle reduces noise for fans seeking no-cover nights; relies on admin `is_free` flag, not price text heuristics.

### Admin management

- FR-006: Admin can add an event directly. Priority: must-have

  > Socrates: Counter-argument considered: "admin bottleneck limits scale." Resolution: kept for MVP; organizer self-service is v2. Admin-only entry keeps data quality high at launch.

- FR-007: Admin can edit or remove an event. Priority: must-have

  > Socrates: No counter-argument; it stands as written.

## Non-Functional Requirements

- **Language**: all user-facing UI text in Polish.
- **Privacy**: no personal data collected from anonymous fans; browsing does not require cookies or tracking.
- **Device**: desktop-first web app (responsive layout, but desktop is the primary design target).
- **Scale path**: MVP serves a single tester; architecture must support growth to national use (thousands of users) without a ground-up rewrite.
- **Operating cost**: MVP incurs no monetary cost for hosting or services; paid infrastructure is deferred until budget is available.

## Business Logic

BassMap surfaces upcoming DnB events near the user, filtered by subgenre, and hides past events automatically.

Supporting rules:

- An event is "upcoming" if its date is today or in the future (local Polish time). Past events are hidden from the public list and map automatically.
- Subgenre tags are set by the admin at entry time. An event can have multiple subgenre tags. Each tag must be one of the **25 closed-catalog values** below (no free text). UI shows display labels; storage uses stable identifiers (e.g. `jump_up`, `hardcore_oldschool`).

  **Subgenre catalog (display label → storage id):**

  | Display label        | Storage id           |
  | -------------------- | -------------------- |
  | Jungle               | `jungle`             |
  | Hardcore (oldschool) | `hardcore_oldschool` |
  | Liquid DnB           | `liquid_dnb`         |
  | Liquid Funk          | `liquid_funk`        |
  | Jump-up              | `jump_up`            |
  | Anthem DnB           | `anthem_dnb`         |
  | Darkstep             | `darkstep`           |
  | Neurofunk            | `neurofunk`          |
  | Techstep             | `techstep`           |
  | Doomcore             | `doomcore`           |
  | Funk DnB             | `funk_dnb`           |
  | Jazz-step            | `jazz_step`          |
  | Soul DnB             | `soul_dnb`           |
  | Drumfunk             | `drumfunk`           |
  | Abstract DnB         | `abstract_dnb`       |
  | Autonomic            | `autonomic`          |
  | Halftime             | `halftime`           |
  | Sambass              | `sambass`            |
  | Clownstep            | `clownstep`          |
  | Trancestep           | `trancestep`         |
  | Drumstep             | `drumstep`           |
  | Crossbreed           | `crossbreed`         |
  | Ragga DnB            | `ragga_dnb`          |
  | Ambient DnB          | `ambient_dnb`        |
  | Intelligent DnB      | `intelligent_dnb`    |

- An event requires: name, date, city, venue. Lineup, ticket link, and price are optional.
- Events are visible publicly only after admin verification (admin-added events are immediately published; any future organizer-submitted events require explicit admin approval).

## Access Control

- **Anonymous fan**: full read access — no login required to browse events, filter, or view event details.
- **Fan (optional account)**: creates an account to access future extras (favorites, notifications). Account creation is optional — all core browsing is public.
- **Organizer**: submits events for admin review. _Note: organizer self-service is post-MVP (v2). In MVP, only admins add events._
- **Admin**: full write access — adds, edits, and removes events directly.

Auth model: optional login (email + password or OAuth). Browsing is fully public.

## Non-Goals

- No organizer self-service portal in MVP — admin is the sole data entry point. Rationale: keeps data quality high at launch; organizer accounts are v2.
- No fan accounts / personalization in MVP — browsing is fully anonymous. Rationale: reduces auth complexity for v1.
- No music preview / artist audio samples — v2 feature.
- No carpooling / crew-finding forum — v3 feature.
- No affiliate or monetization features in MVP — booking.com links etc. are post-launch.
- No events outside Poland in MVP — international events (nearby abroad, major European events) are v2+.

## Open Questions

_(none — resolved 2026-06-09)_

Resolved decisions:

1. **Target scale** — MVP: single tester (`users: small`, `qps: low`, `data_volume: small`). Growth target: national scale, thousands of users (captured in NFR **Scale path**).
2. **Timeline budget** — MVP: 3 weeks, after-hours only, no hard deadline. Monetary budget: zero for MVP; paid services deferred to a future phase (captured in NFR **Operating cost**).

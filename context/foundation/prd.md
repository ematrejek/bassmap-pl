---
project: BassMap PL
version: 2
status: draft
created: 2026-06-09
updated: 2026-06-15
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

BassMap PL is the first centralized search engine for drum'n'bass events in Poland. The problem: DnB fans in Poland have no single source of truth for upcoming events. They must manually check Facebook, Instagram, friends, and partial ticketing portals (Biletomat, Muno) \u2013 each of which covers a different slice of the scene. Even when events are listed somewhere, fans cannot easily find artists they like. Existing platforms (Resident Advisor, Shotgun, Dice) focus on techno and international events; the Polish DnB scene is niche enough to be ignored by big platforms, yet large enough to sustain a dedicated portal. Facebook events are ephemeral and hard to aggregate. The insight: no one has built this for DnB in Poland specifically \u2013 and that is the gap BassMap fills.

## User & Persona

**Primary persona**: DnB fan in Poland. They want to find upcoming DnB events near them, discover events by subgenre from the fixed DnB catalog (e.g. Neurofunk, Liquid DnB, Jump-up, Halftime \u2013 see Business Logic), and see full event details (venue, lineup, ticket link, price) \u2013 all in one place, in Polish, without having to hunt across social media.

## Success Criteria

### Primary

Fan opens BassMap PL, filters by city and/or subgenre, sees a list of upcoming DnB events with map pins, opens an event, and views full details (name, date, venue, lineup, ticket link, price).

### Secondary

1. Fan filters events by subgenre and finds at least one result.
2. Fan clicks a ticket link and lands on the ticket purchase page.

### Guardrails

- Event dates and locations must be accurate \u2013 wrong info is worse than no info.
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

- FR-003: Fan can filter events by subgenre from the fixed catalog (25 values \u2013 see Business Logic). An event may match multiple subgenre filters when tagged accordingly. Priority: must-have

  > Socrates: Counter-argument considered: "four broad buckets are enough for MVP." Resolution: expanded to 25 scene-accurate subgenres (closed enum); filter UI may group or search, but stored values are only from the catalog.

- FR-004: Fan can view full event details (name, date, venue, lineup, ticket link, price). Priority: must-have

  > Socrates: Counter-argument considered: "lineup may not be available at submission time." Resolution: kept; lineup field is optional \u2013 event can be published without a complete lineup.

- FR-005: Fan can view events on an interactive map of Poland. Priority: must-have

  > Socrates: No counter-argument; it stands as written.

- FR-009: Event has an optional description field; fan sees it on the event detail page. Priority: must-have (Partia I)

  > Socrates: Counter-argument considered: "description belongs inside FR-004." Resolution: kept as separate FR \u2013 description is optional content distinct from core detail fields and shipped in its own slice (S-04).

- FR-008: Fan can filter events by date range (single day or range) with calendar presets for today, this week, and this month; filters persist in URL; list and map show the same filtered set. Priority: must-have (Partia I)

  > Socrates: Counter-argument considered: "default sort by date already handles most cases." Resolution: originally demoted to nice-to-have for MVP; elevated to must-have (Partia I, 2026-06-13) \u2013 date filtering is the lead discovery slice after S-02.

- FR-010: Fan can filter the event list to free-entry events only (`is_free`); filter persists in URL and combines with city, subgenre, and date filters. Priority: must-have (Partia I)

  > Socrates: Counter-argument considered: "fans can scan prices in the list." Resolution: kept \u2013 explicit free-only toggle reduces noise for fans seeking no-cover nights; relies on admin `is_free` flag, not price text heuristics.

- FR-011: On mobile viewports, the subgenre filter uses a compact multi-select dropdown instead of a long scrolling checkbox list; desktop may keep the checkbox grid. Priority: must-have (Partia I)

  > Socrates: Counter-argument considered: "one responsive checkbox list is enough." Resolution: kept \u2013 26 subgenres on a narrow screen dominate the filter panel; collapsed multichoice preserves discovery filters above the fold.

- FR-012: Event price is a numeric amount or range with currency PLN, EUR, or CZK (modes: exact, from X, X–Y); not a free-text string. Priority: must-have (Partia I)

  > Socrates: Counter-argument considered: "free-text price is flexible for promoters." Resolution: kept \u2013 structured price improves list readability and data quality; optional price when paid remains allowed ("price TBD" for fans).

### Site, legal & guest navigation

- FR-013: Homepage presents the product (logo, tagline, informational sections, CTA to the event list). Priority: must-have (Partia II)

- FR-014: Guest uses the app navigation menu (event list, sign-in, sign-up, report problem, archive). Priority: must-have (Partia II)

- FR-015: Fan browses an archive of past published events (list only, no map). Priority: must-have (Partia II)

- FR-016: Site provides Privacy Policy and Terms of Service; registration shows acceptance text with links to both documents. Priority: must-have (Partia I)

- FR-024: Guest can report a problem via a contact form; the message is sent by email to the site contact address and is not stored in the application database. Priority: must-have (Partia II)

### Fan account & user contributions

- FR-017: Logged-in fan (non-admin) has dedicated navigation and a profile page. Priority: must-have (Partia II)

- FR-018: Fan can submit an event for admin moderation (`pending` status \u2013 not publicly visible until approved). Priority: must-have (Partia II)

- FR-019: System warns when a similar event may already exist (name, address, date). Priority: must-have (Partia II)

- FR-020: Fan submits change suggestions for an existing event; admin reviews them in a dedicated panel section. Priority: must-have (Partia II)

- FR-021: Logged-in fan can comment on an event; comments are publicly readable; admin can delete any comment. Priority: must-have (Partia II)

- FR-022: User can permanently delete their account (with confirmation). Personal account data is removed; existing public comments remain visible with author shown as "Deleted user" (anonymized \u2013 no link to the deleted identity). Priority: must-have (Partia II)

- FR-025: When submitting an event with a cover image, fan selects cover source (Facebook / Instagram / Organizer website / Own) and must accept the matching copyright declaration checkbox; API rejects submit without a valid declaration when a cover is present. Priority: must-have (Partia II \u2013 compliance, immediately after S-12)

### Admin management

- FR-006: Admin can add an event directly. Priority: must-have

  > Socrates: Counter-argument considered: "admin bottleneck limits scale." Resolution: kept for MVP; full organizer self-service portal remains v2+. Admin direct entry keeps data quality high at launch.

- FR-007: Admin can edit or remove an event. Priority: must-have

  > Socrates: No counter-argument; it stands as written.

- FR-023: Admin can publish or reject fan-submitted events in `pending` status. Priority: must-have (Partia II)

## Non-Functional Requirements

- **Language**: all user-facing UI text in Polish.
- **Privacy**: anonymous browsing requires no account; only essential auth-session cookies when logged in \u2013 no marketing or tracking cookies. Registered users provide email and password (hashed by auth provider); fan-submitted content (events, comments, suggestions) is linked to the account per the Privacy Policy. Legal pages at `/privacy-policy` and `/terms`.
- **Device**: desktop-first web app (responsive layout, but desktop is the primary design target).
- **Scale path**: MVP serves a single tester; architecture must support growth to national use (thousands of users) without a ground-up rewrite.
- **Operating cost**: MVP incurs no monetary cost for hosting or services; paid infrastructure is deferred until budget is available.

## Business Logic

BassMap surfaces upcoming DnB events near the user, filtered by subgenre, and hides past events automatically.

Supporting rules:

- An event is "upcoming" if its date is today or in the future (local Polish time). Past events are hidden from the public list and map automatically.
- Subgenre tags are set at entry time (admin or fan submitter). An event can have multiple subgenre tags. Each tag must be one of the **25 closed-catalog values** below (no free text). UI shows display labels; storage uses stable identifiers (e.g. `jump_up`, `hardcore_oldschool`).

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

- An event requires: name, date, city, venue. Description, lineup, ticket link, and price are optional.
- Events are visible publicly only after admin verification (admin-added events are immediately `published`; fan-submitted events start as `pending` until admin publishes or rejects).
- On account deletion, the user's personal data is removed from auth; published comments they authored remain visible with author label "Deleted user" (Polish UI: „Usunięty użytkownik”) \u2013 content preserved, identity unlinked.
- Fan-submitted cover images require a declared source (Facebook, Instagram, organizer site, or own work) and an explicit copyright declaration at submit time; declarations are stored for audit.
- Event descriptions may include excerpts from public sources only where permitted by quotation rules (Polish Copyright Act art. 29) \u2013 justified scope, informational purpose, source attribution where known; full copying of promotional text is not permitted as a default rule.

## Access Control

- **Anonymous guest**: full read access to published upcoming events, event archive, and legal pages \u2013 no login required to browse, filter, or view event details; can submit a problem report via contact form.
- **Fan (registered, non-admin)**: optional account for profile, own event submissions (`pending` until moderated), and (Partia II) comments and change suggestions; placeholders for crew-finding and forum. Core discovery remains public without login.
- **Organizer (full portal)**: _post-MVP (v2)_ \u2013 branded self-service beyond fan submit + moderate. Partia II fan submit is not a full organizer portal.
- **Admin**: full write access \u2013 adds, edits, and removes events directly; publishes or rejects fan submissions; deletes comments; reviews change suggestions.

Auth model: optional login (email + password). Browsing is fully public.

## Non-Goals

- No full organizer self-service portal (branding, stats, bulk tools) \u2013 Partia II adds fan event submit with admin moderation; full organizer portal is v2+.
- No music preview / artist audio samples \u2013 v2 feature.
- No full crew-finding or forum \u2013 Partia II shows navigation placeholders only; full features remain v3+.
- No affiliate or monetization features \u2013 booking.com links etc. are post-launch.
- No events outside Poland \u2013 international events (nearby abroad, major European events) are v2+.

## Open Questions

_(none blocking \u2013 see Resolved decisions.)_

Resolved decisions:

1. **Target scale** \u2013 MVP: single tester (`users: small`, `qps: low`, `data_volume: small`). Growth target: national scale, thousands of users (captured in NFR **Scale path**).
2. **Timeline budget** \u2013 MVP: 3 weeks, after-hours only, no hard deadline. Monetary budget: zero for MVP; paid services deferred to a future phase (captured in NFR **Operating cost**).
3. **PRD sync with Partia I/II roadmap** \u2013 FR-009, FR-016, FR-013–FR-024 added; Non-Goals and Access Control updated for fan accounts and UGC. Resolved 2026-06-15.
4. **Comments after account deletion** \u2013 keep comment text; show author as „Usunięty użytkownik” (anonymize, do not delete). Resolved 2026-06-15 (Option B).

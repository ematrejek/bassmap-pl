<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Kafelki wydarzeń (S-18)

- **Plan**: context/changes/event-card-redesign/plan.md
- **Scope**: Phase 1–3 of 3
- **Date**: 2026-06-22
- **Verdict**: NEEDS ATTENTION → triaged
- **Findings**: 0 critical, 3 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL → addendum (layout accepted) |
| Scope Discipline | WARNING → addendum documented |
| Safety & Quality | PASS |
| Architecture | WARNING → addendum documented |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 – Układ desktop DiscoveryShell niezgodny z planem

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH
- **Dimension**: Plan Adherence
- **Location**: src/components/discovery/DiscoveryShell.tsx:122–151
- **Detail**: Plan wymagał mapy nad siatką; implementacja ma md:grid-cols-2.
- **Fix B**: Zaktualizować plan jako addendum.
- **Decision**: FIXED via Fix B – addendum w plan.md

### F2 – Zmiany poza scope S-18 w tym samym diffie

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH
- **Dimension**: Scope Discipline
- **Location**: auth, comments, profile, cover, [id].astro
- **Detail**: Wiele plików poza kontraktem S-18.
- **Fix B**: Udokumentować w planie jako addendum.
- **Decision**: FIXED via Fix B – addendum w plan.md

### F3 – Regresja dostępności w EventCommentsSection

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM
- **Dimension**: Safety & Quality
- **Location**: src/components/events/EventCommentsSection.tsx
- **Detail**: Radix AlertDialog → inline alertdialog bez focus trap.
- **Decision**: ACCEPTED – inline dialog wymagany aby działało (bundling Radix)

### F4 – change.md status

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Location**: context/changes/event-card-redesign/change.md
- **Detail**: Manual checks wykonane przez użytkownika.
- **Decision**: FIXED – status impl_reviewed, manual [x] w Progress

### F5 – hoveredEventId nieużywany w EventList

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Pattern Consistency
- **Location**: src/components/discovery/EventList.tsx
- **Decision**: FIXED – isHighlighted na EventDiscoveryCard, handlery na karcie

### F6 – EventsMap rozszerzenia poza planem

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Scope Discipline
- **Location**: EventsMap.tsx, global.css
- **Decision**: FIXED – udokumentowane w addendum plan.md

### F7 – Kruchy selektor w teście

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Success Criteria
- **Location**: tests/unit/event-discovery-card.test.tsx
- **Decision**: FIXED – asercja przez kontekst „Idzie”

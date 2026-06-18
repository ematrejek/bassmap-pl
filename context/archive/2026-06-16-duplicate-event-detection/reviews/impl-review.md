<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Wykrywanie duplikatów wydarzeń (S-13)

- **Plan**: context/changes/duplicate-event-detection/plan.md
- **Scope**: Fazy 1–4 z 5 (faza 5 celowo poza zakresem – niezaimplementowana)
- **Date**: 2026-06-17
- **Verdict**: NEEDS ATTENTION → po triage: gotowe do fazy 5 / manual QA
- **Findings**: 1 critical, 4 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | FAIL |
| Architecture | WARNING |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 – Zepsuta ścieżka „Zasugeruj zmiany” dla cudzego pending

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/change-suggestions.ts:75–88
- **Detail**: RPC `find_similar_event_candidates` zwraca cudze wydarzenia `pending`, ale `createFanChangeSuggestion` weryfikuje event przez `SELECT` na `events` z klientem fana. RLS (`events_select_own`) pozwala fanowi czytać tylko własne wiersze + opublikowane. Dialog pokazuje trafienie, lecz POST sugestii kończy się „Nie znaleziono wydarzenia”.
- **Fix**: Dodać `SECURITY DEFINER` RPC `event_eligible_for_suggestion(id)` zwracające boolean (published lub pending), albo filtrować `matches` w fan check-similar do `published` gdy fan nie jest autorem pending.
- **Decision**: FIXED – RPC `event_eligible_for_suggestion` (migracja `20260617180000`)

### F2 – Link publiczny do cudzego pending prowadzi do 404

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/admin/EventForm.tsx:570–575, 1235–1239
- **Detail**: Dla fana link „Zobacz istniejące wydarzenie” prowadzi do `/events/{id}`. `getPublishedEventById` zwraca tylko `published`. Przy trafieniu na cudze `pending` użytkownik dostaje pustą stronę mimo dialogu.
- **Fix**: Ukryć link dla `pending` niewidocznych publicznie; pokazać komunikat „To zgłoszenie jest w moderacji”.
- **Decision**: FIXED – status w RPC + ukryty link / komunikat moderacji w EventForm

### F3 – RPC ujawnia metadane cudzych pending fanom

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260616150000_find_similar_events_rpc.sql:24–46
- **Detail**: `SECURITY DEFINER` omija RLS. Fan przez `check-similar` może poznać `id`, `name`, `startsAt`, `city` cudzych zgłoszeń `pending`. Plan celowo uwzględniał `pending` w kandydatach, ale nie opisuje implikacji prywatności. Faza 5 (legal) jeszcze nie wdrożona.
- **Fix A ⭐ Recommended**: Udokumentować w polityce prywatności (faza 5) + naprawić F1/F2; zostawić RPC dla wykrywania duplikatów.
  - Strength: Zgodne z intencją planu (wykrywanie duplikatów pending).
  - Tradeoff: Fan nadal widzi metadane w dialogu.
  - Confidence: HIGH – plan explicite wymaga pending w kandydatach.
  - Blind spot: Właściciel musi zaakceptować brzmienie prawne.
- **Fix B**: Dla fanów RPC zwraca tylko `published`; pending tylko dla admina.
  - Strength: Mniejsza ekspozycja danych.
  - Tradeoff: Fan nie zobaczy duplikatu cudzego pending w moderacji.
  - Confidence: MED – zmienia zachowanie z planu.
  - Blind spot: Scenariusz „dwa fani zgłaszają to samo pending” bez ostrzeżenia.
- **Decision**: FIXED via Fix B – fan check-similar z `includePending: false`

### F4 – Luki RLS na change_suggestions

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260616140000_duplicate_detection_and_suggestions.sql:75–91
- **Detail**: INSERT nie wymusza `source = 'duplicate_flow'` ani statusu eventu; UPDATE admina pozwala zmienić dowolne kolumny. Walidacja tylko w serwisie – obejście przez raw Supabase client.
- **Fix**: Rozszerzyć `WITH CHECK` na INSERT (`source`, subquery status eventu); trigger lub polityka ograniczająca UPDATE do `status`.
- **Decision**: FIXED – migracja `20260617180300_harden_change_suggestions_rls`

### F5 – Rozszerzenia poza planem (fan lista sugestii, ReportIssueForm)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH – architectural stakes; think carefully before deciding
- **Dimension**: Scope Discipline
- **Location**: src/components/fan/FanChangeSuggestionsTable.tsx, src/components/fan/FanEventsTable.tsx, src/components/contact/ReportIssueForm.tsx
- **Detail**: Plan fazy 4 przewidywał tylko banner `?suggestionSubmitted=1`. Zaimplementowano pełną tabelę sugestii fana na `/my-events` + licznik w „Dodaję”. `ReportIssueForm.tsx` (min. 10 znaków wiadomości) nie jest częścią S-13.
- **Fix A ⭐ Recommended**: Dopisać addendum do planu opisujące rozszerzenie fan UX; wydzielić `ReportIssueForm` do osobnego commita/PR lub revert jeśli przypadkowy.
  - Strength: Zachowuje wartościową pracę; aktualizuje źródło prawdy.
  - Tradeoff: Plan się rozrasta.
  - Confidence: HIGH – rozszerzenie jest spójne produktowo.
  - Blind spot: Reviewerzy oryginalnego scope nie byli informowani.
- **Fix B**: Usunąć tabelę fana; zostawić tylko banner z planu.
  - Strength: Ścisła zgodność z planem.
  - Tradeoff: Utrata UX listy sugestii.
  - Confidence: MED.
  - Blind spot: Commit 6314d5b już na branchu.
- **Decision**: FIXED via Fix A – addendum w plan.md

### F6 – Próg 0.45 zahardkodowany w SQL

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: supabase/migrations/20260616150000_find_similar_events_rpc.sql:42
- **Detail**: `NAME_SIMILARITY_THRESHOLD` w TS nie jest używany w RPC; ryzyko rozjazdu przy zmianie progu.
- **Fix**: Parametr `p_threshold` w RPC lub komentarz synchronizacji + test kontraktu.
- **Decision**: FIXED – parametr `p_name_threshold` + stała TS

### F7 – Faza 5 niezaimplementowana (oczekiwane)

- **Severity**: OBSERVATION
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: N/A
- **Detail**: Brak `tests/integration/change-suggestions-rls.test.ts`, aktualizacji `privacy-policy.astro` / `terms.astro`, `LEGAL_UPDATED_AT`. Plan ma te pozycje jako `[ ]` – nie jest to drift, lecz praca przed archive.
- **Fix**: Dokończyć fazę 5 przed `/10x-archive`.
- **Decision**: SKIPPED – oczekiwane; faza 5 przed archive

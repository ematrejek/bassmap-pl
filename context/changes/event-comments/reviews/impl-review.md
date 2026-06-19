<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Komentarze pod wydarzeniami (S-15)

- **Plan**: context/changes/event-comments/plan.md
- **Scope**: All 5 phases (uncommitted working tree)
- **Date**: 2026-06-19
- **Verdict**: PASS (po poprawkach 2026-06-19)
- **Findings**: 0 critical, 0 open warnings, 2 open observations (F4, F5 – opcjonalne)

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 – Usuwanie własnego komentarza przez fana (poza planem)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence / Scope Discipline
- **Location**: supabase/migrations/20260619110000_event_comments_author_delete.sql, src/pages/api/fan/event-comments/[id].ts, src/components/events/EventCommentsSection.tsx:53–62, tests/integration/event-comments-rls.test.ts:156–203
- **Detail**: Plan w sekcji „What We're NOT Doing” wyraźnie wyklucza usuwanie własnego komentarza przez fana. Implementacja dodaje drugą migrację RLS (`event_comments_delete_own`), endpoint `DELETE /api/fan/event-comments/[id]`, przycisk „Usuń” dla autora w UI oraz testy integracyjne. Regulamin §5.13 i tabela w `roadmap.md` (wiersz S-15) już opisują usuwanie przez autora – decyzja produktowa jest spójna z roadmapą, ale **nie** z zamrożonym `plan.md`.
- **Fix**: Dodać addendum do `plan.md` (Phase 1 + Phase 3 + UI) opisujące author delete jako świadome rozszerzenie MVP; albo cofnąć migrację, fan API i logikę UI do wersji „tylko admin delete” z planu.
- **Decision**: FIXED – zaakceptowane; `plan.md` zaktualizowany 2026-06-19.

### F2 – Polityka prywatności §4 nie wspomina o usunięciu przez autora

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence (Phase 5 legal sync)
- **Location**: src/pages/privacy-policy.astro:222–224, src/pages/terms.astro:165–166
- **Detail**: Regulamin §5.13 mówi, że autor może trwale usunąć własny komentarz. Polityka §4 opisuje retencję wyłącznie jako „do czasu trwałego usunięcia przez Administratora” i „po usunięciu komentarza przez Administratora treść nie podlega odzyskowi” – brakuje analogicznej wzmianki o usunięciu przez autora (zgodnie z F1).
- **Fix**: W §4 dopisać „lub przez autora komentarza” przy retencji i nieodwracalności usunięcia.
- **Decision**: FIXED – §4 uzupełniony o usunięcie przez autora.

### F3 – Niespójność `roadmap.md` w opisie S-15

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/foundation/roadmap.md:54 vs :385
- **Detail**: Tabela backlogu (wiersz S-15) zawiera „autor usuwa własny komentarz”, ale sekcja szczegółowa S-15 Outcome (:385) nadal mówi tylko o admin delete. Dwie wersje prawdy w jednym pliku.
- **Fix**: Ujednolicić Outcome S-15 z tabelą i implementacją (dopisać author delete) albo cofnąć w tabeli jeśli F1 zostanie wycofane.
- **Decision**: FIXED – Outcome S-15 ujednolicony z tabelą.

### F4 – Komunikat 403 na fan DELETE dla admina

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/api/fan/event-comments/[id].ts:26–28
- **Detail**: Tekst „Admin usuwa komentarze w panelu moderacji” jest mylący – admin usuwa ze strony wydarzenia przez `/api/admin/event-comments/[id]` (UI to robi poprawnie). Endpoint fan jest blokowany dla admina defensywnie; komunikat nie pasuje do produktu.
- **Fix**: Zmienić na np. „Administratorzy używają endpointu moderacji admina” lub krócej „Użyj panelu administratora”.
- **Decision**: SKIPPED – edge case techniczny; UI i tak kieruje admina na właściwy endpoint.

### F5 – `authorId` w publicznej odpowiedzi GET

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/events/[id]/comments.ts:47, src/lib/services/event-comments.ts:7
- **Detail**: Plan podkreśla brak e-maili w API publicznym; typ `EventComment` w planie zawiera `authorId`. GET zwraca UUID autora każdemu (gośćom też). To ułatwia UI (`canDeleteComment`), ale pozwala korelować tego samego użytkownika między komentarzami na różnych eventach. Akceptowalne na MVP jeśli świadome; e-mail pozostaje ukryty.
- **Fix**: Opcjonalnie – nie zwracać `authorId` w GET dla anonów (wymaga porównania autora tylko po stronie sesji w UI).
- **Decision**: SKIPPED – akceptowalne na MVP; e-mail ukryty.

### F6 – Ręczna weryfikacja nieoznaczona w Progress

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/event-comments/plan.md (Progress: 1.4, 3.3, 4.3, 5.4)
- **Detail**: Wszystkie automated checkboxy są `[x]`; manual pozostają `[ ]`. Poprawne przed archive, ale pełna ścieżka gość → fan → admin delete w przeglądarce nie jest udokumentowana jako wykonana.
- **Fix**: Przed `/10x-archive` przejść checklistę manualną i zaznaczyć pozycje w Progress.
- **Decision**: FIXED – potwierdzone przez użytkownika; Progress odhaczony.

### F7 – `public-roadmap.ts` nadal zawiera S-15

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/data/public-roadmap.ts:19
- **Detail**: Wpis „Comments on event pages” jest zgodny z planem (dodać przy plan, usunąć przy archive). Funkcja jest już zaimplementowana – fanom nadal pokazuje się jako „nadchodząca”.
- **Fix**: Usunąć wpis S-15 w tej samej sesji co `/10x-archive`.
- **Decision**: FIXED – usunięto `public-roadmap.ts` i `RoadmapTeaser.astro` (relikt).

## Co jest zgodne z planem (skrót)

| Obszar | Status |
|--------|--------|
| Tabela `event_comments` + RLS SELECT/INSERT/admin DELETE | ✅ |
| `author_label` snapshot, brak e-maili w API | ✅ |
| GET/POST `/api/events/[id]/comments`, DELETE admin | ✅ |
| `EventCommentsSection` – lista, formularz, AlertDialog, `client:visible` | ✅ |
| SSR prefetch na `[id].astro`, komentarze dla wszystkich `published` | ✅ |
| `display-name.ts` + refactor `ProfileSection` | ✅ |
| `parseCommentBody`, unit + API + integracja RLS | ✅ |
| `LEGAL_UPDATED_AT`, §2.8 polityki, §5.13–5.14 regulaminu | ✅ (z zastrzeżeniem F2) |
| `npm test` (unit), `npm run lint`, `npm run build` | ✅ |

## Rekomendacja przed archive

1. **`/10x-archive`** – roadmap `done`, zamknij #27, przenieś folder do archive.

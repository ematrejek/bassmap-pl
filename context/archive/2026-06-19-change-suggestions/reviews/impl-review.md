<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Sugestie zmian wydarzeń (S-14)

- **Plan**: context/changes/change-suggestions/plan.md
- **Scope**: All 6 phases (commits `01f2f34`–`df0afbd` + uncommitted working tree)
- **Date**: 2026-06-18
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 5 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 – Formularz sugestii na przeszłych wydarzeniach

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/pages/events/[id].astro:110, src/lib/services/events.ts:246
- **Detail**: Plan wymaga formularza tylko na **published + upcoming**. `getPublishedEventById` filtruje wyłącznie `status = published` (bez `is_upcoming`). Sekcja „Sugeruj zmiany” renderuje się też na stronach przeszłych eventów. RLS odrzuci submit, ale UX jest mylący.
- **Fix**: W `[id].astro` ukryć sekcję gdy `!isUpcoming(event.startsAt)` (helper jak w DB) albo dodać filtr nadchodzących w `getPublishedEventById` tylko dla tej strony.
- **Decision**: FIXED (ukryto sekcję gdy `!isUpcomingEvent(startsAt)` w `[id].astro`)

### F2 – Apply nie jest atomowy (event zmieniony, status może zostać pending)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/change-suggestions.ts:262–276
- **Detail**: `applyChangeSuggestionToEvent` najpierw woła `updateEvent`, potem osobno PATCH statusu na `accepted`. Gdy drugi krok padnie, wydarzenie jest już zmienione, a sugestia zostaje `pending` – admin może kliknąć „Przyjmij” ponownie.
- **Fix A ⭐ Recommended**: RPC Postgres w jednej transakcji (update event + status) albo optymistyczny update statusu **przed** merge z rollbackiem przy błędzie `updateEvent`.
  - Strength: Eliminuje niespójny stan po częściowym sukcesie.
  - Tradeoff: Wymaga migracji SQL lub bardziej złożonej logiki w serwisie.
  - Confidence: HIGH – klasyczny wzorzec przy operacjach wieloetapowych.
  - Blind spot: Zachowanie `updateEvent` przy geokodowaniu w transakcji DB.
- **Fix B**: Zostawić jak jest; przy błędzie statusu logować i pokazać adminowi komunikat „wydarzenie zaktualizowane, odśwież listę”.
  - Strength: Brak nowej migracji.
  - Tradeoff: Ryzyko duplikatu apply i mylącego stanu pozostaje.
  - Confidence: LOW – nie rozwiązuje root cause.
- **Decision**: FIXED via Fix A (claim `pending` → `accepted` z rollbackiem przy błędzie `updateEvent`)

### F3 – Wyścig przy równoległym apply dwóch adminów

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/change-suggestions.ts:267–272
- **Detail**: Status `pending` jest sprawdzany tylko w kodzie aplikacji. Update statusu nie ma `.eq("status", "pending")`. Dwa równoległe apply mogą oba przejść walidację i oba zaktualizować wydarzenie.
- **Fix**: Dodać `.update({ status: "accepted" }).eq("id", id).eq("status", "pending")` i sprawdzić, czy zwrócono wiersz; przy 0 wierszach zwrócić błąd „już rozpatrzona”.
- **Decision**: FIXED (razem z F2 – optymistyczny claim w `applyChangeSuggestionToEvent`)

### F4 – Apply nie wymaga ≥1 pola (pusty payload w DB)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/change-suggestions.ts:257–260
- **Detail**: Przy tworzeniu używane jest `parseSuggestionPayload` (reguła ≥1 pole). Przy apply tylko `parseEventUpdate` – pusty `{}` przechodzi walidację, `updateEvent` nie zmienia eventu, status i tak przechodzi na `accepted`. Normalny flow API jest bezpieczny; luka przy bezpośrednim INSERT do DB lub uszkodzonych danych.
- **Fix**: Przed apply wywołać `parseSuggestionPayload(existing.payload)` zamiast samego `parseEventUpdate`.
- **Decision**: FIXED (razem z F2 – `parseSuggestionPayload` w apply)

### F5 – Zmiany similarity poza zakresem S-14 w working tree

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/lib/events/similarity.ts, supabase/migrations/20260618120000_*, 20260618130000_*, tests/unit/event-similarity.test.ts
- **Detail**: Niezacommitowane pliki dotyczą wykrywania duplikatów (S-13), nie sugestii zmian. Mieszanie w jednym PR utrudnia review i deploy migracji.
- **Fix**: Wydzielić similarity do osobnego brancha/PR albo cofnąć z working tree przed merge S-14.
- **Decision**: SKIPPED (użytkownik: nieważne)

### F6 – Zwijany panel formularza (nie w planie)

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/fan/EventSuggestChangesForm.tsx:78–99
- **Detail**: Plan zakładał od razu widoczną sekcję z formularzem / linkiem logowania. Implementacja wymaga kliknięcia „Sugeruj zmiany” (stan `panelOpen`). Zmiana jest w niezacommitowanym diffie.
- **Fix**: Albo commitnąć i zaktualizować plan (addendum UX), albo usunąć `panelOpen` i pokazać formularz od razu jak w planie.
- **Decision**: FIXED via plan addendum (zwijany panel `panelOpen` zaakceptowany w Phase 4)

### F7 – `getChangeSuggestionById` nieużywany

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/services/change-suggestions.ts:113–141
- **Detail**: Plan przewidywał użycie przy admin review. Zamiast tego snapshot budowany jest w SSR (`admin/index.astro`). Funkcja jest martwym kodem.
- **Fix**: Usunąć funkcję albo użyć jej w dialogu przy lazy fetch.
- **Decision**: SKIPPED – nie wpływa na działanie strony; snapshot z SSR (`admin/index.astro`) wystarcza na MVP. Funkcja mogłaby się przydać przy odświeżaniu „Obecnie” w dialogu, ale to osobna, opcjonalna poprawka.

### F8 – Ręczna weryfikacja nieoznaczona w Progress

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/change-suggestions/plan.md (Progress, manual items 1.4, 3.4, 4.3, 5.3, 6.4)
- **Detail**: Wszystkie automated checkboxy są `[x]`, manual pozostają `[ ]`. To poprawne przed archive, ale pełna ścieżka fan → admin apply w przeglądarce nie jest udokumentowana jako wykonana.
- **Fix**: Przed `/10x-archive` przejść checklistę manualną i zaznaczyć pozycje w Progress.
- **Decision**: SKIPPED – do wykonania przed archive (checklista manualna w planie)

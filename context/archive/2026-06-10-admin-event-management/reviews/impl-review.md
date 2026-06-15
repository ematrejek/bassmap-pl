<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Admin Event Management (S-01)

- **Plan**: context/changes/admin-event-management/plan.md
- **Scope**: Full plan — Phase 1–3 (wszystkie fazy z kodem; Faza 3 manual pending)
- **Date**: 2026-06-11
- **Verdict**: NEEDS ATTENTION (po triage: 7/8 naprawione, 1 wymaga ręcznego E2E)
- **Findings**: 1 critical, 5 warnings, 2 observations

## Verdicts

| Dimension           | Verdict                         |
| ------------------- | ------------------------------- |
| Plan Adherence      | WARNING ⚠️                      |
| Scope Discipline    | WARNING ⚠️                      |
| Safety & Quality    | PASS ✅ (po fix F1, F4, F5, F8) |
| Architecture        | PASS ✅                         |
| Pattern Consistency | WARNING ⚠️                      |
| Success Criteria    | WARNING ⚠️                      |

## Findings

### F1 — Zapis daty bez strefy Europe/Warsaw

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/events.ts:110,168
- **Detail**: Plan wymaga interpretacji `datetime-local` jako czas warszawski. Odczyt używa `toDatetimeLocalValue()` z `Europe/Warsaw`, ale zapis robi `new Date(parsed.startsAt).toISOString()` — na Cloudflare Workers strefa „lokalna” to UTC. Admin wpisuje np. 22:00 (myśląc o Warszawie), w bazie ląduje 22:00 UTC, na liście wyświetli się jako 00:00/01:00 następnego dnia latem.
- **Fix**: Dodać `parseDatetimeLocalWarsaw(value: string): string` w `format.ts` (odwrotność `toDatetimeLocalValue`) i użyć w `parsedCreateToInsert` / `updateEvent` zamiast `new Date(...).toISOString()`.
  - Strength: Symetria odczyt↔zapis; zgodność z planem i seed events.
  - Tradeoff: Wymaga helpera strefy czasowej (Intl lub Temporal).
  - Confidence: HIGH — asymetria jest widoczna w kodzie.
  - Blind spot: Nie zweryfikowano ręcznie na produkcyjnym Workerze.
- **Decision**: FIXED — parseDatetimeLocalWarsaw() w format.ts + toStoredStartsAt() w events.ts

### F2 — Nieplanowana migracja podgatunku `dancefloor`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: supabase/migrations/20260611120000_add_dancefloor_subgenre.sql:3
- **Detail**: Plan S-01 nie wymienia nowego enum `dancefloor`. Migracja + zmiany w `src/types.ts` rozszerzają katalog podgatunków poza zakresem slice'a.
- **Fix A ⭐ Recommended**: Dopisać addendum do planu (cel biznesowy) i zostawić migrację.
  - Strength: Zachowuje już zaimplementowaną wartość; aktualizuje źródło prawdy.
  - Tradeoff: Plan się rozszerza w trakcie implementacji.
  - Confidence: HIGH — migracja jest bezpieczna (`IF NOT EXISTS`).
  - Blind spot: Nie wiadomo, czy `dancefloor` był wymagany przez PRD.
- **Fix B**: Wycofać migrację i typy; przenieść do osobnego change.
  - Strength: Ścisła dyscyplina zakresu S-01.
  - Tradeoff: Utrata pracy; osobny PR później.
  - Confidence: MEDIUM — zależy od tego, czy formularz już pokazuje dancefloor.
  - Blind spot: Seed / istniejące dane mogą już używać wartości.
- **Decision**: FIXED via Fix A — addendum w plan.md, migracja zostaje

### F3 — Sortowanie listy ASC vs kontrakt DESC w planie

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/services/events.ts:83
- **Detail**: Kontrakt §6 planu: `ORDER BY starts_at DESC`. Kod: `ascending: true` (ASC). UI mówi „od najbliższej daty” — spójne z ASC i progress 2.5, niespójne z §6 Desired End State („posortowaną tabelę” bez precyzji) i kontraktem serwisu.
- **Fix**: Ustalić produktowo ASC (najbliższe) vs DESC (najnowsze w kalendarzu) i zsynchronizować serwis + plan §6.
- **Decision**: FIXED — ASC w kodzie; plan §6 i kontrakt serwisu zaktualizowane na ASC

### F4 — Nominatim: do 3 żądań bez opóźnienia

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/geocoding/nominatim.ts
- **Detail**: Plan wymaga ~1 req/s. Implementacja robi wieloetapowe wyszukiwanie (structured + venue + free-text) bez `sleep` między callami — ryzyko 429 i błędu „Geokodowanie tymczasowo niedostępne”.
- **Fix**: Dodać `await sleep(1100)` między kolejnymi zapytaniami lub ograniczyć do jednego zapytania zgodnie z minimalnym kontraktem planu.
- **Decision**: FIXED — sleep(1100ms) między kolejnymi zapytaniami w geocodeAddress()

### F5 — `listEventsForAdmin` ukrywa błędy DB

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/events.ts:85-86
- **Detail**: Przy błędzie Supabase zwraca `[]` — admin widzi „Brak wydarzeń” zamiast komunikatu o awarii.
- **Fix**: Zwracać `ServiceResult<Event[]>` z `{ error }` i pokazać błąd na `/admin`.
- **Decision**: FIXED — ServiceResult<Event[]> + ServerError na liście admina

### F6 — `"use client"` w komponencie shadcn checkbox

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/ui/checkbox.tsx:1
- **Detail**: AGENTS.md zabrania dyrektyw Next.js. Reszta komponentów React w repo ich nie używa. shadcn dodał `"use client"` przy instalacji.
- **Fix**: Usunąć linię `"use client";` — w Astro/React 19 nie jest potrzebna.
- **Decision**: FIXED — usunięto "use client" z checkbox.tsx

### F7 — Ręczna weryfikacja Fazy 3 niepotwierdzona

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/admin-event-management/plan.md (Progress 3.3–3.8)
- **Detail**: Automated 3.1–3.2 przechodzą (`lint` + `build`). Manual 3.3–3.8 nadal `[ ]`. Kod Fazy 3 istnieje (EventForm, Delete, strony new/edit) ale nie jest w commicie — brak dowodu E2E.
- **Fix**: Uruchomić checklistę manualną 3.3–3.8, oznaczyć progress, zacommitować Fazę 3.
- **Decision**: DEFERRED — wymaga ręcznego E2E przez użytkownika (checklista poniżej w triage summary)

### F8 — Brak walidacji zakresu współrzędnych w Zod

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/events/schema.ts
- **Detail**: `latitude`/`longitude` bez `.min()/.max()` — można zapisać np. 999, 999. Constraint DB `events_coordinates_both_or_neither` nie waliduje zakresu.
- **Fix**: Dodać `z.number().min(-90).max(90)` i `z.number().min(-180).max(180)` w schemacie coordinates.
- **Decision**: FIXED — latitudeSchema / longitudeSchema z min/max w schema.ts

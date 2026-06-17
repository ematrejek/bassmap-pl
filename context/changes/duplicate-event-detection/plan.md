# Wykrywanie duplikatów wydarzeń (S-13) – Implementation Plan

## Overview

Slice roadmapy **S-13** (`change-id`: **`duplicate-event-detection`**). Przed utworzeniem wydarzenia system wykrywa podobne wpisy po **nazwie** (fuzzy match przez `pg_trgm`), **dacie** (ten sam dzień w `Europe/Warsaw`) i **lokalizacji** (znormalizowany adres lub współrzędne w promieniu ~100 m). Użytkownik dostaje **dialog ostrzegawczy** (nie twardą blokadę). Fan może wysłać **minimalną sugestię zmian** do admina; admin dostaje link do edycji istniejącego eventu. Wprowadzana jest tabela `change_suggestions` i sekcja panelu admina – fundament pod **S-14**.

**PRD:** FR-019 (duplikaty), częściowo most do FR-020 (sugestie – pełny przycisk na stronie eventu w S-14).

**GitHub:** issue [#25](https://github.com/ematrejek/bassmap-pl/issues/25); project board **In Progress** na starcie `/10x-implement`.

## Miejsce w roadmapie (Stream D)

```
S-12 → S-17 → S-13 (ten slice) → S-14 / S-15 → S-16
```

**North star** Partii II po zamknięciu S-17 (2026-06-16).

## Current State Analysis

- **`EventForm.tsx`** – `performSubmit()` (L307–421) od razu woła `POST` create; `AlertDialog` używany już dla „kontynuować bez grafiki?” (S-17, L1076–1099).
- **`POST /api/fan/events`** – walidacja Zod + `createFanSubmittedEvent()` – **brak** sprawdzenia podobieństwa (`src/pages/api/fan/events/index.ts`).
- **`POST /api/admin/events`** – analogicznie (`src/pages/api/admin/events/index.ts`).
- **Tabela `events`** – indeks `events_starts_at_idx`; **brak** indeksu trigram na `name`; **brak** extension `pg_trgm`.
- **Panel admina** – sekcje moderacji nowych zgłoszeń i katalogu (`src/pages/admin/index.astro`); **brak** kolejki sugestii.
- **Baseline roadmapy** – „brak API/tabel dla duplikatów i sugestii” (`context/foundation/roadmap.md` L74–75).

### Key Discoveries

- Wspólny `parseEventCreate` / `buildBody()` – payload check-similar może reużywać ten sam kształt JSON co create (minus pola consent fana).
- Publiczne funkcje read filtrują `published` + nadchodzące w serwisie (`lessons.md`) – **kandydaci duplikatów** celowo szersi: `published` + `pending`.
- `is_upcoming()` i archiwum używają `(starts_at AT TIME ZONE 'Europe/Warsaw')::date` – ten sam wzorzec dla porównania dnia.
- S-17 ustalił wzorzec: dialog przed finalnym submitem + osobne endpointy dla rozszerzonego flow.

## Desired End State

1. **Fan i admin** – po walidacji pól, przed `performSubmit` create: wywołanie check-similar; przy `matches.length > 0` – dialog z nazwą i linkiem do istniejącego eventu.
2. **Fan** – trzy ścieżki: Anuluj; Wyślij mimo to (create jak dziś); Zasugeruj zmiany (textarea → `change_suggestions`, **bez** create nowego eventu).
3. **Admin** – Anuluj; Dodaj mimo to; link „Wprowadź zmiany” → `/admin/events/[id]/edit`.
4. **Admin panel** – nowa sekcja „Sugestie zmian” z listą `pending` / historia; akcje przyjąć / odrzucić.
5. **Dokumenty prawne** – opis przetwarzania treści sugestii i retencji.
6. **S-14** – przycisk na stronie szczegółów eventu dodaje wpisy z `source = 'event_page'` do tej samej tabeli (poza tym slice).

### Weryfikacja ręczna (skrót)

- Dwa eventy: ta sama nazwa z literówką, ten sam dzień, ten sam adres → dialog.
- Ten sam dzień i miasto, inna ulica → brak dialogu (przy progu 0.45 na nazwie + adres).
- Fan: sugestia zapisuje się; admin widzi w panelu; create **nie** powstaje.
- Admin: link edycji otwiera właściwy event.

## What We're NOT Doing

- Przycisk „Zasugeruj zmiany” na `/events/[id]` (S-14).
- Formularz sugestii ze wszystkimi polami eventu (diff) – tylko pole tekstowe.
- Automatyczne scalanie / usuwanie duplikatów.
- Porównywanie ze statusami `draft` / `rejected`.
- Twarda blokada HTTP 409 bez możliwości kontynuacji.
- Rate limiting sugestii (opcjonalnie później; MVP: Zod max length).

## Implementation Approach

Pięć faz zgodnych z S-12/S-17: schema → serwis → API → UI → testy + legal. Check-similar jest **read-only** względem `events`; create API **bez zmian** (ostrzeżenie wyłącznie w UI). Stałe dopasowania w `src/lib/events/similarity-constants.ts` (próg `0.45`, promień `100` m).

## Critical Implementation Details

Check-similar musi wołać **ten sam parser** co create (`parseEventCreate`), inaczej fan zobaczy inne błędy niż przy zapisie. Dla fana wyklucz z kandydatów wiersze `pending` gdzie `created_by = auth.uid()` – inaczej własne wcześniejsze zgłoszenie blokuje ponowną próbę. Dialog duplikatu otwiera się **po** `validateBeforeSubmit()` i **przed** `setSubmitting(true)` – inaczej spinner zasłania dialog.

---

## Phase 1: Schema, typy i RLS sugestii

### Overview

Włączenie `pg_trgm`, indeks pod fuzzy nazwę, nowa tabela sugestii, typy TypeScript i mapper.

### Changes Required:

#### 1. Migracja Supabase

**File**: `supabase/migrations/YYYYMMDDHHmmss_duplicate_detection_and_suggestions.sql`

**Intent**: Umożliwić szybkie `similarity()` na nazwie i przechowywać sugestie zmian z RLS.

**Contract**:

- `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- `CREATE INDEX events_name_trgm_idx ON public.events USING gin (name gin_trgm_ops);`
- Enum `change_suggestion_status`: `pending`, `accepted`, `rejected`
- Enum `change_suggestion_source`: `duplicate_flow`, `event_page` (na S-14)
- Tabela `change_suggestions`: `id`, `event_id` → `events`, `submitted_by` → `auth.users`, `body` (text, CHECK length 10–2000), `status`, `source`, `created_at`, `updated_at`
- Trigger `updated_at` (wzorzec z innych migracji, jeśli istnieje)
- RLS włączone; polityki:
  - SELECT: admin (`is_admin()`) wszystkie; fan tylko `submitted_by = auth.uid()`
  - INSERT: zalogowany nie-admin, `submitted_by = auth.uid()`, `status = pending`
  - UPDATE status: tylko admin
- **Brak** DELETE dla fanów (retencja do decyzji admina)

#### 2. Typy i mapper

**File**: `src/types.ts`, `src/lib/events/suggestion-mapper.ts` (nowy)

**Intent**: Typy `ChangeSuggestion`, `ChangeSuggestionStatus`, `ChangeSuggestionSource`; mapowanie wiersza DB ↔ DTO.

**Contract**: Eksport typów używanych przez serwis i API; `mapChangeSuggestionRow(row)`.

### Success Criteria:

#### Automated Verification:

- Migracja stosuje się lokalnie: `npx supabase db reset` (lub `migration up`) bez błędów
- `npm run lint` przechodzi po dodaniu typów
- `npm run build` przechodzi

#### Manual Verification:

- W Supabase Studio widać tabelę `change_suggestions` i extension `pg_trgm`
- RLS: anon nie może INSERT; fan może INSERT własny; admin widzi wszystkie

**Implementation Note**: Po tej fazie – potwierdzenie manualne przed fazą 2.

---

## Phase 2: Serwis podobieństwa

### Overview

Logika `findSimilarEvents()` – zapytanie SQL + filtr adresu/współrzędnych w TypeScript.

### Changes Required:

#### 1. Stałe i normalizacja

**File**: `src/lib/events/similarity-constants.ts`, `src/lib/events/address-normalize.ts` (nowe)

**Intent**: Jedno miejsce na próg `NAME_SIMILARITY_THRESHOLD = 0.45`, `COORD_PROXIMITY_METERS = 100`; normalizacja adresu do porównania (lowercase, trim, collapse whitespace, opcjonalnie usunięcie znaków diakrytycznych dla PL).

**Contract**:

- `normalizeAddressParts(street, number): string`
- `haversineMeters(lat1, lon1, lat2, lon2): number`

#### 2. Moduł similarity

**File**: `src/lib/events/similarity.ts` (nowy)

**Intent**: Orchestracja dopasowania; wejście: `ParsedEventCreate` + opcje (`excludeEventId?`, `excludeCreatedBy?`).

**Contract**:

- `findSimilarEvents(supabase, input, options): Promise<ServiceResult<SimilarEventMatch[]>>`
- `SimilarEventMatch`: `{ id, name, startsAt, city, similarityScore }`
- SQL (RPC lub query builder): filtr `status IN ('published','pending')`, `lower(city) = lower($city)`, ten sam dzień Warsaw co `startsAt`, `similarity(name, $name) >= 0.45`, `ORDER BY similarity DESC`, `LIMIT 5`
- Post-filter TS: para musi przejść **location match**:
  - oba tryby `address`: `normalizeAddressParts` równe
  - oba `coordinates`: haversine ≤ 100 m
  - mieszane tryby: wymagane `similarity(venue_name)` w SQL już częściowo łapie nazwę miejsca; dodatkowo `lower(venue_name)` równe po normalizacji – jeśli brak, odrzuć kandydata (unika fałszywych trafień przy różnych trybach)

#### 3. Testy jednostkowe matchingu

**File**: `tests/unit/event-similarity.test.ts` (nowy)

**Intent**: Pokryć normalizację adresu, haversine, logikę location match (bez live DB w unit – mock lub czyste funkcje).

**Contract**: Przypadki: identyczny adres; współrzędne 50 m vs 200 m; różne ulice – brak match.

### Success Criteria:

#### Automated Verification:

- `npm run test` – nowe testy unit similarity przechodzą
- `npm run lint` i `npm run build` przechodzą

#### Manual Verification:

- W REPL / tymczasowym skrypcie (opcjonalnie): dwa eventy w seed – `findSimilarEvents` zwraca oczekiwany match

**Implementation Note**: Po fazie 2 – potwierdzenie manualne przed API.

---

## Phase 3: API

### Overview

Endpointy check-similar (fan + admin), tworzenie sugestii, admin zmiana statusu; serwis listy sugestii.

### Changes Required:

#### 1. Check similar – fan

**File**: `src/pages/api/fan/events/check-similar.ts` (nowy)

**Intent**: Zalogowany fan (nie admin) sprawdza podobieństwo przed create.

**Contract**:

- `export const prerender = false`; `export const POST`
- `requireAuth`; admin → 403 z komunikatem PL (jak create)
- Body: JSON bez `acceptContentRights` – `parseEventCreate(payload)` → 400 przy błędzie
- `findSimilarEvents(supabase, parsed.data, { excludeCreatedBy: user.id })`
- 200: `{ matches: SimilarEventMatch[] }` (pusta tablica = OK)

#### 2. Check similar – admin

**File**: `src/pages/api/admin/events/check-similar.ts` (nowy)

**Intent**: Admin sprawdza przed create w panelu.

**Contract**: `requireAdmin`; ten sam payload i odpowiedź; **bez** `excludeCreatedBy`.

#### 3. Sugestie – fan create

**File**: `src/pages/api/fan/change-suggestions/index.ts` (nowy)

**Intent**: Fan wysyła tekst sugestii powiązany z istniejącym `event_id`.

**Contract**:

- Zod: `{ eventId: uuid, body: string min 10 max 2000 }`
- Weryfikacja: event istnieje i ma status `published` lub `pending`
- INSERT `change_suggestions` ze `source = 'duplicate_flow'`, `status = pending`
- 201: `{ suggestion: ChangeSuggestion }`

#### 4. Sugestie – admin

**File**: `src/lib/services/change-suggestions.ts` (nowy), `src/pages/api/admin/change-suggestions/[id]/status.ts` (nowy)

**Intent**: Lista dla panelu (funkcja serwisu); admin zmienia status.

**Contract**:

- `listChangeSuggestionsForAdmin(supabase)` – join z `events.name`, sort `created_at DESC`
- PATCH: `{ status: 'accepted' | 'rejected' }` tylko z `pending`; 400 przy nielegalnej transycji

#### 5. Testy API

**Files**: `tests/unit/fan-check-similar-api.test.ts`, `tests/unit/fan-change-suggestions-api.test.ts` (nowe)

**Intent**: Mock auth i serwisu; statusy 401/403/400/200/201.

**Contract**: Wzorzec `tests/unit/fan-events-api.test.ts`.

### Success Criteria:

#### Automated Verification:

- `npm run test` – testy API przechodzą
- `npm run lint` i `npm run build` przechodzą

#### Manual Verification:

- `curl`/DevTools: check-similar zwraca matches dla zduplikowanego payloadu
- POST sugestii tworzy wiersz widoczny dla admina w DB

**Implementation Note**: Po fazie 3 – potwierdzenie manualne przed UI.

---

## Phase 4: UI – dialog duplikatu i panel admina

### Overview

Integracja check-similar w `EventForm`; dialog ostrzegawczy; mini-formularz sugestii; sekcja admina.

### Changes Required:

#### 1. EventForm – flow check-similar

**File**: `src/components/admin/EventForm.tsx`

**Intent**: Przed create wywołać check-similar; przy matches pokazać dialog; rozgałęzić ścieżki fan vs admin.

**Contract**:

- Nowe props opcjonalne: `checkSimilarUrl` (domyślnie derivowane z `submitUrl`: zamiana ścieżki na `.../check-similar`)
- `handleSubmit` → po `validateBeforeSubmit()` → `fetch(checkSimilarUrl)` → jeśli matches → `setDuplicateDialogOpen(true)` i zapis matches w stanie
- **AlertDialog duplikatu** (osobny od cover dialog):
  - Tytuł: „Podobne wydarzenie już istnieje”
  - Opis: nazwa + data + miasto; link `<a href={fan: `/events/${id}`, admin: `/admin/events/${id}/edit`}>`
  - Fan: Anuluj | Wyślij mimo to (`performSubmit`) | Zasugeruj zmiany → drugi dialog/ekran z `<Textarea>` + POST `/api/fan/change-suggestions` → redirect np. `/my-events?suggestionSubmitted=1`
  - Admin: Anuluj | Dodaj mimo to | przycisk-link edycji
- Przy „Wyślij mimo to” / „Dodaj mimo to” – **nie** wołać check-similar ponownie (flaga `skipSimilarCheck`)

#### 2. FanEventForm

**File**: `src/components/fan/FanEventForm.tsx`

**Intent**: Przekazać `checkSimilarUrl="/api/fan/events/check-similar"` jeśli nie derivuje się automatycznie.

**Contract**: Bez zmian wizualnych poza props.

#### 3. Panel admina – sekcja Sugestie zmian

**Files**: `src/pages/admin/index.astro`, `src/components/admin/ChangeSuggestionsTable.tsx` (nowy), `src/components/admin/ChangeSuggestionActions.tsx` (nowy)

**Intent**: Admin widzi kolejkę sugestii niezależnie od „Do moderacji”.

**Contract**:

- Sekcja między moderacją a katalogiem (lub nad moderacją – sugestie ważniejsze dla korekt)
- Kolumny: data, event (link), fragment `body`, autor (email z `resolveSubmitterProfiles`), status, akcje accept/reject
- Pusta lista: komunikat PL

#### 4. Komunikat sukcesu fana

**File**: `src/components/fan/MyEventsPage.tsx` lub `index.astro`

**Intent**: Po `?suggestionSubmitted=1` – krótki banner „Sugestia wysłana do moderacji”.

**Contract**: Query param + hash opcjonalnie; bez nowej strony.

### Success Criteria:

#### Automated Verification:

- `npm run lint` i `npm run build` przechodzą

#### Manual Verification:

- Fan: dialog → sugestia → brak nowego eventu w „Dodaję”
- Fan: dialog → Wyślij mimo to → pending create jak dziś
- Admin: dialog → link edycji działa
- Admin: sekcja sugestii – accept/reject zmienia status

**Implementation Note**: Po fazie 4 – pełny manual QA przed testami prawnymi.

---

## Phase 5: Testy integracyjne, legal sync, roadmap

### Overview

RLS sugestii, integracja z CI, aktualizacja dokumentów prawnych i `public-roadmap` po wdrożeniu (usuń linię duplikatów przy archive).

### Changes Required:

#### 1. Test integracyjny RLS

**File**: `tests/integration/change-suggestions-rls.test.ts` (nowy)

**Intent**: Fan INSERT own; fan nie widzi cudzych; admin widzi wszystkie.

**Contract**: Wzorzec `tests/integration/fan-event-submit.test.ts`; service role seed.

#### 2. Dokumenty prawne

**Files**: `src/pages/privacy-policy.astro`, `src/pages/terms.astro`, `src/lib/legal/paths.ts`

**Intent**: Opisać przetwarzanie treści sugestii zmian (cel: moderacja katalogu; podstawa: uzasadniony interes / wykonanie usługi UGC; retencja do rozpatrzenia + okres archiwum zgodnie z polityką).

**Contract**: `LEGAL_UPDATED_AT` = data wdrożenia; sekcja w regulaminie o zasadach sugestii (bez pełnego diff formularza S-14).

#### 3. Roadmap / issue (przy implementacji)

**Files**: `context/foundation/roadmap.md` (status → in progress podczas implementacji; `done` przy archive)

**Intent**: Zgodność z AGENTS.md – issue #25 na boardzie In Progress na `/10x-implement`; zamknięcie przy archive.

**Contract**: Nie zmieniać `public-roadmap.ts` do momentu archive (wtedy usunąć wpis duplicate-event-detection).

### Success Criteria:

#### Automated Verification:

- `npm run test` – integracja RLS przechodzi
- `npm run lint` i `npm run build` przechodzą

#### Manual Verification:

- Polityka i regulamin – czytelne sekcje o sugestiach
- Właściciel akceptuje brzmienie prawne przed deployem produkcyjnym

**Implementation Note**: Ostatnia faza – gotowość do `/10x-archive` po merge i QA.

---

## Testing Strategy

### Unit Tests

- `address-normalize`, `haversineMeters`
- `locationMatch` edge cases (mixed modes)
- API handlers: auth, validation, empty matches
- Zod schema sugestii

### Integration Tests

- RLS `change_suggestions` (fan vs admin vs anon)
- Opcjonalnie: `findSimilarEvents` z service role seed (jeśli środowisko testowe ma migrację pg_trgm)

### Manual Testing Steps

1. Utwórz opublikowany event „Bass Night @ Proxima”, Warszawa, konkretny adres i data.
2. Jako fan zacznij create z nazwą „Bass Nigt @ Proxima” (literówka), ten sam dzień i adres → dialog.
3. Wyślij sugestię → sprawdź panel admina → brak nowego pending.
4. Powtórz create → Wyślij mimo to → pending powstaje.
5. Jako admin create duplikatu → link edycji → popraw istniejący event.
6. Event innego dnia / inne miasto → brak dialogu przy tej samej nazwie.

## Performance Considerations

- Indeks GIN `pg_trgm` na `name` + filtr miasto/dzień/status ogranicza zbiór przed `similarity()`.
- Limit 5 kandydatów w SQL; post-filter adresu na małym zbiorze.
- Check-similar to jeden dodatkowy round-trip przed create – akceptowalne dla MVP.

## Migration Notes

- Wdrożyć migrację na remote Supabase przed deployem (`npx supabase db push`).
- Extension `pg_trgm` jest dostępne w Supabase PostgreSQL – jeśli hosting blokuje, fallback plan: przenieść fuzzy do serwisu TS (poza scope – ryzyko zanotowane w brief).
- Istniejące eventy bez zmian; brak backfill.

## References

- Roadmap S-13/S-14: `context/foundation/roadmap.md`
- Wzorzec faz S-17: `context/archive/2026-06-15-event-content-copyright/plan.md`
- Fan submit S-12: `context/archive/2026-06-15-fan-account-zone/plan.md`
- `EventForm` submit: `src/components/admin/EventForm.tsx` L307–421
- `createFanSubmittedEvent`: `src/lib/services/events.ts` L349–360

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` \u2013 <commit sha>` when a step lands.

### Phase 1: Schema, typy i RLS sugestii

#### Automated

- [x] 1.1 Migracja stosuje się lokalnie: `npx supabase db reset` (lub `migration up`) bez błędów – 838dcfa
- [x] 1.2 `npm run lint` przechodzi po dodaniu typów – 838dcfa
- [x] 1.3 `npm run build` przechodzi – 838dcfa

#### Manual

- [x] 1.4 W Supabase Studio widać tabelę `change_suggestions` i extension `pg_trgm` – 838dcfa
- [ ] 1.5 RLS: anon nie może INSERT; fan może INSERT własny; admin widzi wszystkie

### Phase 2: Serwis podobieństwa

#### Automated

- [x] 2.1 `npm run test` – nowe testy unit similarity przechodzą — 523e916
- [x] 2.2 `npm run lint` i `npm run build` przechodzą — 523e916

#### Manual

- [ ] 2.3 Seed: `findSimilarEvents` zwraca oczekiwany match dla zduplikowanego payloadu

### Phase 3: API

#### Automated

- [x] 3.1 `npm run test` – testy API przechodzą
- [x] 3.2 `npm run lint` i `npm run build` przechodzą

#### Manual

- [ ] 3.3 check-similar zwraca matches dla zduplikowanego payloadu
- [ ] 3.4 POST sugestii tworzy wiersz widoczny dla admina w DB

### Phase 4: UI – dialog duplikatu i panel admina

#### Automated

- [ ] 4.1 `npm run lint` i `npm run build` przechodzą

#### Manual

- [ ] 4.2 Fan: dialog → sugestia → brak nowego eventu w „Dodaję”
- [ ] 4.3 Fan: dialog → Wyślij mimo to → pending create jak dziś
- [ ] 4.4 Admin: dialog → link edycji działa
- [ ] 4.5 Admin: sekcja sugestii – accept/reject zmienia status

### Phase 5: Testy integracyjne, legal sync, roadmap

#### Automated

- [ ] 5.1 `npm run test` – integracja RLS przechodzi
- [ ] 5.2 `npm run lint` i `npm run build` przechodzą

#### Manual

- [ ] 5.3 Polityka i regulamin – sekcje o sugestiach zaakceptowane przez właściciela
- [ ] 5.4 Pełny manual QA z sekcji Testing Strategy wykonany w przeglądarce

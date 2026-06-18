# Sugestie zmian wydarzeń (S-14) Implementation Plan

## Overview

Slice roadmapy **S-14** (`change-id`: **`change-suggestions`**). Fan na stronie opublikowanego **nadchodzącego** wydarzenia wypełnia **formularz strukturalny** z proponowanymi wartościami pól (data, lokalizacja, cena, opis, lineup, link biletowy). Admin otwiera sugestię, widzi zaproponowane pola i po **Przyjmij** zapisuje je w eventcie przez merge `payload` → `updateEvent`. Flow tekstowy z S-13 (`duplicate_flow`) pozostaje bez zmian.

**PRD:** FR-020. **Issue:** [#26](https://github.com/ematrejek/bassmap-pl/issues/26).

## Current State Analysis

S-13 zbudował fundament:

- Tabela `change_suggestions` (`body` NOT NULL, CHECK 10–2000 znaków, `source` enum, RLS).
- `createFanChangeSuggestion` hardcoduje `source: "duplicate_flow"` (`src/lib/services/change-suggestions.ts:94`).
- RLS INSERT fan: tylko `duplicate_flow` (`20260617180300_harden_change_suggestions_rls.sql`).
- RPC `event_eligible_for_suggestion`: `published` **lub** `pending` (bez rozróżnienia source).
- Panel admina: `ChangeSuggestionsTable` + `ChangeSuggestionActions` – **Przyjmij** = PATCH status only, bez merge pól.
- Strona `/events/[id].astro` – brak UI sugestii.

### Key Discoveries:

- Enum `event_page` istnieje w DB i TS – gotowy pod S-14, ale zablokowany RLS.
- `parseEventUpdate` w `src/lib/events/schema.ts` – wzorzec partial update z walidacją ceny i lokalizacji; do reużycia dla payload.
- `updateEvent` w `src/lib/services/events.ts` – geokodowanie przy zmianie adresu; apply powinien iść tą samą ścieżką.
- Test integracyjny `change-suggestions-rls.test.ts` celowo odrzuca INSERT z `source = event_page` – trzeba rozszerzyć, nie usuwać.

## Desired End State

1. Fan (nie-admin) na `/events/[id]` (published + upcoming) widzi formularz sugestii; wypełnia ≥1 pole core + opcjonalny komentarz.
2. Gość widzi: „Zaloguj się, aby zasugerować zmiany” z linkiem do `/auth/signin?redirect=…`.
3. Submit → `POST /api/fan/change-suggestions` z `source: "event_page"` + `payload` → redirect `/my-events?suggestionSubmitted=1`.
4. Admin: kolumna **Źródło**, **Otwórz sugestię** → podgląd pól → **Przyjmij** (event_page) merge’uje payload; duplicate_flow – accept = status only (S-13).
5. Polityka prywatności / regulamin opisują strukturalne sugestie ze strony eventu.

### Weryfikacja ręczna

- Fan: wypełnij samo pole „Opis” na stronie eventu → sugestia w „Moje eventy” ze statusem Oczekuje.
- Admin: Otwórz sugestię event_page → Przyjmij → opis eventu się zmienia na stronie publicznej.
- duplicate_flow z dialogu duplikatu nadal działa (tekst, accept bez auto-merge).

## What We're NOT Doing

- Zmiana **nazwy** lub **podgatunków** przez sugestię
- Okładka w sugestii
- Sugestie do eventów archiwalnych lub `pending`
- Admin jako autor sugestii
- Auto-merge bez kliknięcia admina
- Rate limit / blokada wielu pending na event
- Refactor całego `EventForm.tsx` (tylko wycinek pól)

## Implementation Approach

Rozszerzamy istniejącą tabelę i serwis zamiast nowej tabeli. `payload jsonb` przechowuje partial update (camelCase jak API eventów). Dwa tryby **Przyjmij**:

| source | Przyjmij |
| ------ | -------- |
| `duplicate_flow` | Status → `accepted` (bez zmiany eventu) |
| `event_page` | Merge `payload` → `updateEvent` + status → `accepted` |

## Critical Implementation Details

**Constraint migracji:** Istniejące wiersze mają `body` + `payload null`. Nowy CHECK: `(source = 'duplicate_flow' AND char_length(body) BETWEEN 10 AND 2000 AND payload IS NULL) OR (source = 'event_page' AND payload IS NOT NULL AND jsonb_typeof(payload) = 'object')`. Dla `event_page` `body` opcjonalny (komentarz 0–2000 znaków).

**Eligibility RPC:** Rozszerz `event_eligible_for_suggestion(p_event_id uuid, p_source change_suggestion_source)` – dla `event_page` wymagaj `status = 'published' AND is_upcoming(starts_at)`; dla `duplicate_flow` zostaw `published OR pending`.

**Apply a pending-only:** Endpoint apply odrzuca sugestie nie-pending. Po apply event musi nadal spełniać reguły biznesowe (np. nadchodzący po zmianie daty – jeśli fan zaproponuje datę w przeszłości, `updateEvent` / walidacja powinna zwrócić błąd).

## Phase 1: Schema – payload + RLS event_page

### Overview

Dodać kolumnę `payload`, zaktualizować constrainty, RLS INSERT i RPC eligibility per source.

### Changes Required:

#### 1. Migracja SQL

**File**: `supabase/migrations/YYYYMMDDHHmmss_change_suggestions_event_page_payload.sql`

**Intent**: Umożliwić strukturalne sugestie ze strony eventu przy zachowaniu wstecznej zgodności duplicate_flow.

**Contract**:

- `ALTER TABLE change_suggestions ADD COLUMN payload jsonb;`
- `ALTER TABLE change_suggestions ALTER COLUMN body DROP NOT NULL;`
- Usuń stary `change_suggestions_body_length`; dodaj CHECK opisany w Critical Implementation Details.
- `DROP/CREATE POLICY change_suggestions_insert_fan` – INSERT dozwolony gdy:
  - `duplicate_flow`: dotychczasowe warunki + `payload IS NULL`
  - `event_page`: `payload IS NOT NULL` + event eligible via subquery (`published` + `is_upcoming`)
- `CREATE OR REPLACE FUNCTION event_eligible_for_suggestion(p_event_id uuid, p_source change_suggestion_source)` – logika per source; zachowaj overload lub zamień sygnaturę (zaktualizuj GRANT + wywołania w serwisie).

#### 2. Typy i mapper

**File**: `src/types.ts`, `src/lib/events/suggestion-mapper.ts`

**Intent**: `ChangeSuggestion` z opcjonalnym `payload: Record<string, unknown> | null` i opcjonalnym `body`.

**Contract**: Eksport typu `ChangeSuggestionPayload` (partial pól update); `mapChangeSuggestionRow` mapuje `payload`.

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` (lokalnie) stosuje migrację bez błędu
- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- W Supabase Studio: istniejące wiersze duplicate_flow bez regresji; możliwy INSERT testowy event_page z payload (Studio/service role)

**Implementation Note**: Po fazie 1 – potwierdzenie manualne przed fazą 2.

---

## Phase 2: Serwis + walidacja payload

### Overview

Zod schema dla partial payload, create z source, apply merge do eventu.

### Changes Required:

#### 1. Schema sugestii

**File**: `src/lib/events/suggestion-schema.ts` (nowy)

**Intent**: Walidacja payload sugestii – wszystkie pola opcjonalne, ale ≥1 klucz obecny; reguły ceny/lokalizacji jak w `eventUpdatePartialSchema`.

**Contract**: Eksport `parseSuggestionPayload(input)` → `{ success, data }` z dozwolonymi kluczami: `startsAt`, `city`, `venueName`, `locationMode`, `addressStreet`, `addressNumber`, `latitude`, `longitude`, `description`, `lineup`, `ticketUrl`, `isFree`, `priceMode`, `priceMin`, `priceMax`, `currency`. Refine: co najmniej jedno pole nie-null/defined.

#### 2. Serwis change-suggestions

**File**: `src/lib/services/change-suggestions.ts`

**Intent**: Rozdzielić create per source; dodać apply dla admina.

**Contract**:

- `createFanChangeSuggestion(supabase, userId, { eventId, source, body?, payload? })` – wywołuje RPC z `p_source`; INSERT z właściwymi polami.
- `getChangeSuggestionById(supabase, id)` – dla admin review (join event name + opcjonalnie snapshot pól eventu do porównania).
- `applyChangeSuggestionToEvent(supabase, suggestionId)` – tylko `pending` + `event_page` + payload; `parseEventUpdate(payload)` → `updateEvent`; potem status `accepted`. Zwraca zaktualizowany event lub błąd walidacji/geokodowania.

#### 3. Lista admin/fan

**File**: `src/lib/services/change-suggestions.ts`

**Intent**: SELECT uwzględnia `payload` i `source` w mapowaniu list.

**Contract**: `AdminChangeSuggestionListItem` / `FanChangeSuggestionListItem` rozszerzone o `source`, `payload`, opcjonalnie `body`.

### Success Criteria:

#### Automated Verification:

- Unit testy `suggestion-schema.test.ts` – min one field, price rules, empty payload rejected
- `npm run lint` i `npm run build`

#### Manual Verification:

- (Opcjonalnie) wywołanie serwisu w test integracyjny w fazie 6

---

## Phase 3: API – fan submit + admin apply

### Overview

Rozszerzyć fan POST; dodać admin apply; duplicate_flow bez zmian w kontrakcie.

### Changes Required:

#### 1. Fan API

**File**: `src/pages/api/fan/change-suggestions/index.ts`

**Intent**: Przyjmować sugestie event_page ze structured payload.

**Contract**: Zod discriminated union lub refine:

- `{ eventId, source: "duplicate_flow", body }` – jak dziś
- `{ eventId, source: "event_page", payload, body?: string }` – `parseSuggestionPayload(payload)`; body opcjonalny max 2000

Wywołanie `createFanChangeSuggestion` z `source`. 403 dla admina bez zmian.

#### 2. Admin apply API

**File**: `src/pages/api/admin/change-suggestions/[id]/apply.ts` (nowy)

**Intent**: Merge payload do eventu i oznacz accepted.

**Contract**: `POST`, `requireAdmin`, `{ id }` z params. Woła `applyChangeSuggestionToEvent`. 400 gdy brak payload / wrong source / not pending. 200 `{ event, suggestion }`.

#### 3. Admin status API

**File**: `src/pages/api/admin/change-suggestions/[id]/status.ts`

**Intent**: Dla `duplicate_flow` accept bez apply; dla `event_page` – **odmów** accept bez apply (400 z komunikatem „Użyj Otwórz sugestię → Przyjmij”) **albo** przekieruj accept na apply – wybór implementera: **preferowane** – status accept dla duplicate_flow only; event_page wymaga `/apply`.

**Contract**: Przed PATCH status `accepted` sprawdź `source`; jeśli `event_page` → 400 z hintem.

### Success Criteria:

#### Automated Verification:

- Rozszerzyć `tests/unit/fan-change-suggestions-api.test.ts` – event_page payload happy path + validation errors
- Nowy `tests/unit/admin-change-suggestions-apply-api.test.ts`
- `npm run lint` i `npm run build`

#### Manual Verification:

- curl/Postman: fan POST event_page → 201; admin apply → 200

---

## Phase 4: UI fan – formularz na stronie wydarzenia

### Overview

React island na stronie szczegółów z formularzem pól core i obsługą gościa.

### Changes Required:

#### 1. Komponent formularza

**File**: `src/components/fan/EventSuggestChangesForm.tsx` (nowy)

**Intent**: Formularz sugestii z polami core; pokazuje bieżące wartości eventu jako podpowiedzi (read-only labels pod polami).

**Contract**: Props: `event: Event` (published), `isLoggedIn: boolean`, `isAdmin: boolean`. Gdy `!isLoggedIn` – render sekcji z tekstem + link `SIGN_IN_PATH` z `redirect` na bieżący URL. Gdy `isAdmin` – nie renderuj formularza (admin edytuje w panelu). Submit: POST z `source: "event_page"`. Sukces: `window.location.href = "/my-events?suggestionSubmitted=1"`. Reuse stylów pól z `EventForm` / shadcn (Input, Textarea, select ceny) – bez copyright/okładki.

#### 2. Strona eventu

**File**: `src/pages/events/[id].astro`

**Intent**: Osadzić formularz pod sekcją lineup / przed biletem.

**Contract**: SSR: `locals.user`, `locals.isAdmin`; przekaż do island. `client:load` lub `client:visible`. Sekcja `<h2>Sugeruj zmiany</h2>`.

#### 3. Fan lista sugestii

**File**: `src/components/fan/FanChangeSuggestionsTable.tsx`, `src/pages/my-events/index.astro`

**Intent**: Wyświetlać skrót sugestii event_page (np. „3 pola: data, opis, cena”) zamiast samego body gdy payload present.

**Contract**: Helper `formatSuggestionSummary(suggestion)` w `src/lib/events/suggestion-format.ts` (nowy).

### Success Criteria:

#### Automated Verification:

- `npm run lint` i `npm run build`

#### Manual Verification:

- Gość: widzi link logowania, brak submit
- Fan: wypełnia pole opisu → redirect → banner + wiersz w tabeli
- Admin na stronie eventu: brak formularza sugestii

---

## Phase 5: UI admin – podgląd + apply

### Overview

Kolumna źródła, dialog review, Przyjmij merge dla event_page.

### Changes Required:

#### 1. Tabela admina

**File**: `src/components/admin/ChangeSuggestionsTable.tsx`, `src/pages/admin/index.astro`

**Intent**: Kolumna **Źródło** z etykietami PL: „Duplikat” / „Strona wydarzenia”; kolumna Sugestia używa `formatSuggestionSummary`.

**Contract**: `ChangeSuggestionTableRow` + `source`; mapowanie w `admin/index.astro`.

#### 2. Dialog review

**File**: `src/components/admin/ChangeSuggestionReviewDialog.tsx` (nowy)

**Intent**: Admin klika **Otwórz sugestię** → dialog z listą par: pole | wartość bieżąca | proponowana (dla payload); opcjonalny komentarz z body.

**Contract**: Props: suggestion + current event fields (SSR fetch event w admin index lub lazy fetch w dialogu). Przyciski: Zamknij | **Przyjmij** (POST apply) | **Odrzuć** (status rejected). Loading/error states.

#### 3. Akcje w tabeli

**File**: `src/components/admin/ChangeSuggestionActions.tsx`

**Intent**: Zastąpić bezpośrednie „Przyjmij” dla event_page przyciskiem **Otwórz sugestię**; duplicate_flow zostawia obecne Przyjmij/Odrzuć.

**Contract**: Prop `source`; warunkowy render.

### Success Criteria:

#### Automated Verification:

- `npm run lint` i `npm run build`

#### Manual Verification:

- Admin: event_page suggestion → Otwórz → widoczne pola → Przyjmij → event zaktualizowany na `/events/[id]`
- duplicate_flow: Przyjmij bez apply – tylko status

---

## Phase 6: Testy integracyjne, legal, public roadmap

### Overview

RLS event_page, dokumenty prawne, homepage roadmap.

### Changes Required:

#### 1. Testy integracyjne

**File**: `tests/integration/change-suggestions-rls.test.ts`

**Intent**: Fan INSERT event_page z payload na published upcoming; odmowa na archived/past; duplicate_flow bez regresji.

**Contract**: Scenariusze: eligible event + apply przez admin client (service role setup jak istniejące testy).

#### 2. Legal sync

**Files**: `src/pages/privacy-policy.astro`, `src/pages/terms.astro`, `src/lib/legal/paths.ts`

**Intent**: Opisać strukturalne sugestie ze strony eventu (jakie pola, cel moderacji, retencja).

**Contract**: `LEGAL_UPDATED_AT` = data implementacji; sekcja 2.7 rozszerzona o event_page + payload.

#### 3. Public roadmap

**File**: `src/data/public-roadmap.ts`

**Intent**: Dodać wpis na czas implementacji; usunąć po archive.

**Contract**: `{ id: "S-14", label: "Suggest changes on event pages" }` (krótko, EN).

#### 4. Roadmap sync

**File**: `context/foundation/roadmap.md`

**Intent**: Przy implementacji: status → in progress; przy archive → done.

### Success Criteria:

#### Automated Verification:

- `npm run test:ci` (lub `npm test` gdy Supabase lokalny)
- `npm run lint:all`
- `npm run build`

#### Manual Verification:

- Przeczytaj zaktualizowane sekcje polityki/regulaminu
- Pełna ścieżka fan → admin apply w przeglądarce

---

## Testing Strategy

### Unit Tests:

- `parseSuggestionPayload` – puste, jedno pole, cena, lokalizacja
- Fan API – duplicate_flow + event_page branches
- Admin apply API – 403 non-admin, 400 wrong source, happy path mock

### Integration Tests:

- RLS INSERT event_page / duplicate_flow
- Odmowa event_page dla past/archived event

### Manual Testing Steps:

1. Zaloguj jako fan → `/events/[id]` → zmień opis → wyślij → sprawdź Moje eventy
2. Admin → Otwórz sugestię → Przyjmij → odśwież stronę eventu
3. Dodaj event z duplikatem → Zasugeruj zmiany (tekst) → admin Przyjmij (status only)
4. Wyloguj → strona eventu → widoczny link logowania

## Performance Considerations

- Payload JSON mały (kilka pól) – brak indeksu GIN potrzebny na MVP.
- Apply wywołuje geokodowanie tylko gdy payload zmienia adres – jak zwykła edycja.

## Migration Notes

- Deploy migracji przed kodem aplikacji (backward compatible: stary kod ignoruje payload).
- Po deploy kodu: fan event_page wymaga nowego API/UI.

## References

- S-13 plan: `context/archive/2026-06-16-duplicate-event-detection/plan.md`
- Event schema: `src/lib/events/schema.ts`
- Serwis sugestii: `src/lib/services/change-suggestions.ts`
- RLS hardening: `supabase/migrations/20260617180300_harden_change_suggestions_rls.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Schema – payload + RLS event_page

#### Automated

- [x] 1.1 `npx supabase db reset` stosuje migrację bez błędu
- [x] 1.2 `npm run lint` przechodzi
- [x] 1.3 `npm run build` przechodzi

#### Manual

- [ ] 1.4 Istniejące wiersze duplicate_flow bez regresji w Studio

### Phase 2: Serwis + walidacja payload

#### Automated

- [x] 2.1 Unit testy `suggestion-schema.test.ts` przechodzą
- [x] 2.2 `npm run lint` przechodzi
- [x] 2.3 `npm run build` przechodzi

### Phase 3: API – fan submit + admin apply

#### Automated

- [x] 3.1 `tests/unit/fan-change-suggestions-api.test.ts` przechodzi
- [x] 3.2 `tests/unit/admin-change-suggestions-apply-api.test.ts` przechodzi
- [x] 3.3 `npm run lint` i `npm run build`

#### Manual

- [ ] 3.4 Fan POST event_page → 201; admin apply → 200

### Phase 4: UI fan – formularz na stronie wydarzenia

#### Automated

- [x] 4.1 `npm run lint` przechodzi
- [x] 4.2 `npm run build` przechodzi

#### Manual

- [ ] 4.3 Gość: link logowania; fan: submit + redirect; admin: brak formularza

### Phase 5: UI admin – podgląd + apply

#### Automated

- [x] 5.1 `npm run lint` przechodzi
- [x] 5.2 `npm run build` przechodzi

#### Manual

- [ ] 5.3 Admin apply aktualizuje event; duplicate_flow accept bez merge

### Phase 6: Testy integracyjne, legal, public roadmap

#### Automated

- [ ] 6.1 `npm run test:ci` przechodzi
- [ ] 6.2 `npm run lint:all` przechodzi
- [ ] 6.3 `npm run build` przechodzi

#### Manual

- [ ] 6.4 Legal copy + pełna ścieżka w przeglądarce

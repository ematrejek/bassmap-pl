# Admin Event Management Implementation Plan

## Overview

Implementacja panelu admina do zarządzania wydarzeniami DnB (S-01): lista wydarzeń, formularze dodawania i edycji, usuwanie z potwierdzeniem, API mutacji chronione `requireAdmin()` i walidacją zod oraz **automatyczne geokodowanie adresu** (Nominatim/OSM) przy zapisie. Slice buduje na schemacie F-01 i guardzie F-02; jedna mała migracja umożliwia tryb „lokalizacja tajna” bez adresu ulicy.

## Current State Analysis

- **Schemat `events`** — pełna tabela z enumami, RLS, constrainty (`subgenres` min 1, współrzędne obie lub żadna). Plik: `supabase/migrations/20260610100000_create_events.sql`.
- **Typy domenowe** — `Event`, `EventInsert`, `EventUpdate`, `Subgenre`, `SUBGENRE_LABELS` w `src/types.ts`.
- **Guard admina** — middleware na `/admin/*`, `locals.isAdmin` via RPC, `requireAdmin()` w `src/lib/auth/guards.ts` (niewykorzystany w API).
- **Placeholder UI** — `src/pages/admin/index.astro` informuje o S-01; brak listy i formularzy.
- **Brak warstwy aplikacyjnej eventów** — zero `supabase.from('events')`, zero mappera DB↔TS, zero zod w `package.json`.
- **Wzorce do naśladowania** — `FormField`/`SubmitButton`/`ServerError` z auth; shadcn `button` już zainstalowany.

### Key Discoveries:

- Publiczny SELECT widzi tylko `published` + nadchodzące; admin SELECT (RLS) widzi **wszystkie** wiersze — lista admina może pokazywać przeszłe i draft bez osobnej polityki.
- Middleware **nie** chroni `/api/*` — każdy endpoint mutacji musi wywołać `requireAdmin()` (impl-review F-02).
- PRD wymaga pól: nazwa, data, miasto, venue; schemat F-01 ma `address_street`, `address_number` (obecnie NOT NULL) — w trybie adresowym formularz je zbiera; w trybie współrzędnych (impreza tajna) migracja S-01 ustawia je na nullable.
- PRD: wydarzenia dodane przez admina = od razu `published`; domyślny status w DB to `draft` — aplikacja musi jawnie ustawiać `published` przy INSERT.
- Roadmap S-02 blokowała się na strategii współrzędnych — rozstrzygnięte: geokodowanie venue przy zapisie w S-01; S-02 tylko wyświetla zapisane `latitude`/`longitude`.

## Desired End State

1. Admin na `/admin` widzi posortowaną tabelę wydarzeń (nazwa, data, miasto, status, akcje).
2. Admin tworzy wydarzenie na `/admin/events/new` — **domyślnie** podaje adres; system geokoduje i zapisuje współrzędne.
3. Admin może zaznaczyć „Brak adresu — podaję współrzędne” (impreza tajna) i wpisać lat/lng ręcznie — bez pól ulicy/numeru.
4. Admin edytuje na `/admin/events/[id]/edit`; zmiana adresu w trybie adresowym ponownie geokoduje współrzędne.
5. Admin usuwa wydarzenie po potwierdzeniu w dialogu.
6. API mutacji zwraca JSON z błędami walidacji/geokodowania (400) lub auth (401/403).
7. `npm run lint` i `npm run build` przechodzą.

### Weryfikacja ręczna:

- Utworzenie eventu z adresem w Warszawie → w Studio `latitude`/`longitude` wypełnione (bez ręcznego wpisywania).
- Tryb współrzędnych: event z ręcznymi coords, `address_street`/`address_number` NULL — zapis OK.
- PUT/DELETE jako nie-admin → 403 JSON.
- Niepoprawny adres (geokodowanie bez wyniku) → 400 z komunikatem po polsku.
- Formularz z 0 podgatunków lub tylko lat bez lng → błąd walidacji, brak zapisu.

## What We're NOT Doing

- Mapa, filtry, strony odkrywania fana (S-02) — tylko konsumuje zapisane współrzędne.
- Płatne API geokodowania (Google Maps, Mapbox) — Nominatim wystarczy na MVP zero-cost.
- Geokodowanie po stronie klienta (przeglądarka) — tylko server-side w API/serwisie.
- Cache geokodowania w KV/D1 — opcjonalnie post-MVP; na start prosty fetch per zapis.
- Picker statusu `draft`/`pending`/`rejected` w UI — enum zostaje w DB na v2.
- UI zarządzania `admin_allowlist`.
- Test runner / testy automatyczne.
- `supabase gen types` — ręczny mapper wystarczy na MVP.
- Refaktor auth API (brak `prerender = false`, brak zod) — opcjonalnie przy okazji, nie blokuje S-01.

## Implementation Approach

Cztery warstwy w trzech fazach: (1) backend + geokodowanie — migracja adresu, Nominatim, zod, mapper, serwis, API; (2) lista admina SSR; (3) formularze React z przełącznikiem trybu lokalizacji + delete. Odczyt listy/edycji w Astro frontmatter. Mutacje: `requireAdmin()` → zod → `resolveCoordinates()` → Supabase; RLS jako druga bariera.

## Critical Implementation Details

- **Status przy INSERT:** zawsze ustaw `status: 'published'` w serwisie/API — nie polegaj na domyślnym `'draft'` z kolumny DB.
- **Tryb lokalizacji (`locationMode`):** pole tylko w API/formularzu (nie kolumna DB). `'address'` (domyślny): wymagaj `addressStreet`, `addressNumber`, `city`, `venueName`; ignoruj `latitude`/`longitude` z body — ustal je przez geokodowanie. `'coordinates'`: wymagaj `latitude`, `longitude`, `city`, `venueName`; `addressStreet`/`addressNumber` = NULL w DB.
- **Geokodowanie:** wywołanie **wyłącznie server-side** (`src/lib/geocoding/nominatim.ts`). Query: `{address_number} {address_street}, {city}, Polska` (+ opcjonalnie `venueName` w query string dla lepszej trafności). Przy PUT w trybie `address`: re-geokoduj tylko gdy zmienił się którykolwiek z pól adresowych.
- **Nominatim policy:** nagłówek `User-Agent` z nazwą aplikacji i kontaktem (np. `BassMapPL/1.0 (admin panel)`); max ~1 request/s; `countrycodes=pl`; przy 429/timeout → 400 „Geokodowanie tymczasowo niedostępne, spróbuj ponownie”.
- **Błąd geokodowania:** brak wyników → 400 „Nie udało się znaleźć lokalizacji dla podanego adresu” — nie zapisuj eventu bez współrzędnych w trybie adresowym.
- **Lineup:** textarea → split po `\n`, trim, odfiltruj puste linie → `text[]` lub `null` gdy pusto.
- **Datetime:** formularz używa `datetime-local`; konwersja na ISO `timestamptz` przed zapisem (interpretacja jako lokalna Europe/Warsaw — spójna z `is_upcoming()`).

## Phase 1: Backend — geokodowanie, walidacja, mapper, serwis, API

### Overview

Dodać migrację nullable adresu, serwis Nominatim, zod z `locationMode`, mapper, serwis CRUD z `resolveCoordinates()` i trasy API mutacji. Po tej fazie mutacje z geokodowaniem są testowalne przez curl/Postman bez UI.

### Changes Required:

#### 1. Migracja — nullable adres dla trybu współrzędnych

**File**: `supabase/migrations/YYYYMMDDHHmmss_nullable_event_address.sql`

**Intent**: Umożliwić imprezy „tajne” bez ulicy/numeru — tylko venue, miasto i ręczne współrzędne.

**Contract**:

- `ALTER TABLE public.events ALTER COLUMN address_street DROP NOT NULL;`
- `ALTER TABLE public.events ALTER COLUMN address_number DROP NOT NULL;`
- Zachować constraint `events_coordinates_both_or_neither` — w trybie adresowym coords z geokodowania; w trybie coords — obowiązkowe.

#### 2. Zależność zod

**File**: `package.json`

**Intent**: Dodać `zod` jako bezpośrednią zależność — pierwszy endpoint z walidacją zgodnie z AGENTS.md.

**Contract**: `"zod": "^3.x"` w `dependencies`; uruchomić `npm install`.

#### 3. Serwis geokodowania (Nominatim)

**File**: `src/lib/geocoding/nominatim.ts`

**Intent**: Server-only geokodowanie adresu na współrzędne przez darmowe API OpenStreetMap.

**Contract**:

- `geocodeAddress(input: { addressStreet: string; addressNumber: string; city: string; venueName?: string }): Promise<{ latitude: number; longitude: number } | { error: string }>`
- HTTP GET `https://nominatim.openstreetmap.org/search` z `format=json`, `limit=1`, `countrycodes=pl`, zbudowanym `q`.
- Wymagany nagłówek `User-Agent` (identyfikacja aplikacji).
- Parsuj pierwszy wynik `lat`/`lon` na number; brak wyników → `{ error: '...' }` po polsku.
- Nie eksportować do komponentów React — tylko serwis/API.

#### 4. Schematy walidacji

**File**: `src/lib/events/schema.ts`

**Intent**: Centralne schematy zod dla create i update eventu, z rozgałęzieniem na tryb lokalizacji.

**Contract**:

- `locationModeSchema` — `z.enum(['address', 'coordinates'])`, domyślnie `'address'`.
- `eventCreateSchema` — wspólne wymagane: `name`, `startsAt`, `city`, `venueName`, `subgenres` (min 1); opcjonalne: `lineup`, `ticketUrl`, `isFree`, `price`, `locationMode`.
- **Discriminated union** na `locationMode`:
  - `address`: wymagane `addressStreet`, `addressNumber`; `latitude`/`longitude` z body ignorowane.
  - `coordinates`: wymagane `latitude`, `longitude` (number); `addressStreet`/`addressNumber` opcjonalne/absent → NULL w DB.
- `eventUpdateSchema` — partial z zachowaniem reguł trybu gdy `locationMode` lub pola adresu/coords są podane.
- Eksport `parseEventCreate` / `parseEventUpdate`.

#### 5. Mapper DB ↔ TS

**File**: `src/lib/events/mapper.ts`

**Intent**: Konwersja między snake_case wierszy Supabase a camelCase typów `Event`.

**Contract**:

- Typ `EventRow` — kształt wiersza z `.select()` (snake_case).
- `mapEventRow(row: EventRow): Event`
- `toEventInsertRow(input: EventInsert): Record<string, unknown>` — mapowanie pól do INSERT (w tym wymuszenie `status: 'published'` dla create).

#### 6. Serwis eventów

**File**: `src/lib/services/events.ts`

**Intent**: Enkapsulacja zapytań Supabase i rozstrzyganie współrzędnych przed zapisem.

**Contract**:

- `resolveCoordinates(parsed: ParsedEventInput): Promise<{ latitude: number; longitude: number } | { error: string }>` — jeśli `locationMode === 'address'` → `geocodeAddress()`; jeśli `coordinates` → zwróć lat/lng z inputu.
- `listEventsForAdmin(supabase)` → `Event[]` — SELECT wszystkich, ORDER BY `starts_at` DESC.
- `getEventById(supabase, id)` → `Event | null`
- `createEvent(supabase, input)` — wywołaj `resolveCoordinates` → INSERT z coords + `status: 'published'`
- `updateEvent(supabase, id, input)` — przy zmianie adresu w trybie `address` ponownie geokoduj
- `deleteEvent(supabase, id)` → `{ success: true } | { error: string }`
- Błędy Supabase mapowane na komunikaty po polsku.

#### 7. Aktualizacja typów (opcjonalna)

**File**: `src/types.ts`

**Intent**: Odzwierciedlić nullable adres w `Event` / `EventInsert`.

**Contract**: `addressStreet` i `addressNumber` jako `string | null` w `Event`; w `EventInsert` opcjonalne/nullable gdy `locationMode === 'coordinates'`.

#### 8. API — tworzenie

**File**: `src/pages/api/admin/events/index.ts`

**Intent**: Endpoint POST tworzący wydarzenie; wzorcowy pierwszy admin API.

**Contract**:

- `export const prerender = false`
- `POST`: `requireAdmin(locals)` → parse JSON → `eventCreateSchema` → `createEvent` (wewnętrznie geokodowanie) → 201 `{ event }` lub 400 `{ error }` / 403.

#### 9. API — aktualizacja i usuwanie

**File**: `src/pages/api/admin/events/[id].ts`

**Intent**: PUT i DELETE dla pojedynczego wydarzenia.

**Contract**:

- `export const prerender = false`
- `PUT`: `requireAdmin` → walidacja UUID w param → `eventUpdateSchema` → `updateEvent` → 200 lub 404/400.
- `DELETE`: `requireAdmin` → `deleteEvent` → 204 lub 404.

#### 10. Helper odpowiedzi JSON

**File**: `src/lib/api/json.ts` (opcjonalny, jeśli powtarzalne)

**Intent**: Spójne nagłówki i kształt `{ error: string }` / `{ event: Event }`.

**Contract**: `jsonResponse(data, status)` — Content-Type application/json.

### Success Criteria:

#### Automated Verification:

- `npm install` kończy się bez błędów
- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- `npx supabase db reset` stosuje nową migrację nullable adresu
- POST z `locationMode: 'address'` i poprawnym adresem w PL → wiersz w Studio **z** `latitude`/`longitude`
- POST z `locationMode: 'coordinates'` i lat/lng → wiersz **bez** `address_street`/`address_number`
- POST z nieistniejącym adresem → 400 (geokodowanie)
- POST bez sesji → 401; sesja nie-admin → 403
- POST z pustym `subgenres` → 400
- PUT zmienia adres i aktualizuje współrzędne; DELETE usuwa

**Implementation Note**: Po tej fazie i przejściu automated verification — potwierdzenie manualne przed fazą 2.

---

## Phase 2: Lista wydarzeń admina

### Overview

Zastąpić placeholder `/admin` tabelą wszystkich wydarzeń z linkami do edycji i przyciskiem „Dodaj wydarzenie”.

### Changes Required:

#### 1. Strona listy

**File**: `src/pages/admin/index.astro`

**Intent**: SSR lista wydarzeń dla zalogowanego admina (middleware już weryfikuje rolę).

**Contract**:

- `export const prerender = false`
- Frontmatter: `createClient` → `listEventsForAdmin` → przekaż `events` do szablonu.
- Tabela: nazwa, data (sformatowana PL), miasto, status, akcje (Edytuj → `/admin/events/{id}/edit`, Usuń — placeholder lub disabled do fazy 3).
- Przycisk/link „Dodaj wydarzenie” → `/admin/events/new`.
- Teksty UI po polsku; layout spójny z obecnym kosmicznym motywem + Topbar.
- Użyć shadcn `table` (zainstalować via `npx shadcn@latest add table`).

#### 2. Komponenty shadcn (lista)

**Files**: `src/components/ui/table.tsx` (+ ewentualnie `badge` dla statusu)

**Intent**: Spójny wygląd tabeli admina.

**Contract**: Instalacja shadcn table; opcjonalnie badge dla `published`/`draft`.

#### 3. Formatowanie daty

**File**: `src/lib/events/format.ts`

**Intent**: Jednolita prezentacja dat w UI admina (Europe/Warsaw).

**Contract**: `formatEventDate(iso: string): string` — np. `10 cze 2026, 22:00`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- `/admin` jako admin pokazuje seed events (5 wierszy)
- `/admin` jako nie-admin → redirect 403 (middleware)
- Sortowanie od najnowszej daty wydarzenia
- Link „Dodaj wydarzenie” prowadzi do `/admin/events/new` (404 OK do fazy 3)

**Implementation Note**: Po automated + manual — potwierdzenie przed fazą 3.

---

## Phase 3: Formularze create/edit i usuwanie

### Overview

Formularz React wspólny dla tworzenia i edycji; strony Astro; usuwanie z dialogiem potwierdzenia na liście.

### Changes Required:

#### 1. Komponenty shadcn formularza

**Files**: `src/components/ui/input.tsx`, `label.tsx`, `checkbox.tsx`, `alert-dialog.tsx`, `textarea` (lub natywny textarea ze stylami)

**Intent**: Pola formularza zgodne z design systemem.

**Contract**: Instalacja via shadcn CLI.

#### 2. Formularz wydarzenia (React island)

**File**: `src/components/admin/EventForm.tsx`

**Intent**: Interaktywny formularz z walidacją client-side (mirror zod rules) i submit via fetch JSON.

**Contract**:

- Props: `mode: 'create' | 'edit'`, opcjonalnie `initialEvent?: Event`, `serverError?: string`.
- **Przełącznik trybu lokalizacji** (checkbox lub radio): „Brak adresu — podaję współrzędne” (`locationMode`).
  - Tryb **adres** (domyślny): pola ulica + numer widoczne; lat/lng **ukryte** (system uzupełni przy zapisie).
  - Tryb **współrzędne**: ulica + numer ukryte; pola latitude + longitude widoczne i wymagane; venue + miasto nadal wymagane (np. „Pod mostem Łazienkowskim”, „Warszawa”).
- Pozostałe pola: nazwa, data/godzina (`datetime-local`), multi-checkbox podgatunków (`SUBGENRE_LABELS`), textarea lineup, URL biletów, checkbox „Wstęp wolny”, cena (ukryta/disabled gdy isFree).
- Submit: body JSON z `locationMode`; POST/PUT jak wcześniej; błąd geokodowania z API wyświetlony w `ServerError`.
- W trybie edit: wywnioskuj początkowy `locationMode` — jeśli `addressStreet`/`addressNumber` są NULL → `coordinates`, inaczej `address`.
- Walidacja PL po stronie klienta przed fetch.
- `client:load` w stronach Astro.

#### 3. Strona tworzenia

**File**: `src/pages/admin/events/new.astro`

**Intent**: Shell Astro z Topbar + EventForm w trybie create.

**Contract**: `prerender = false`; middleware chroni trasę.

#### 4. Strona edycji

**File**: `src/pages/admin/events/[id]/edit.astro`

**Intent**: Załaduj event po ID; 404 gdy brak; EventForm w trybie edit z `initialEvent`.

**Contract**: Frontmatter `getEventById`; redirect lub strona błędu gdy null.

#### 5. Usuwanie z listy

**File**: `src/components/admin/DeleteEventButton.tsx` (React island)

**Intent**: Przycisk „Usuń” z alert-dialog; fetch DELETE; reload lub redirect po sukcesie.

**Contract**: Props: `eventId`, `eventName`; dialog po polsku („Czy na pewno usunąć …?”); DELETE `/api/admin/events/{id}`.

#### 6. Integracja delete w liście

**File**: `src/pages/admin/index.astro`

**Intent**: Podpiąć DeleteEventButton w kolumnie akcji (zastąpić placeholder z fazy 2).

**Contract**: `client:load` na przycisku delete per wiersz (lub jeden island z listą — preferowane per-row dla prostoty).

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- Utworzenie w trybie adresowym → redirect `/admin`, wiersz z współrzędnymi w Studio
- Utworzenie w trybie współrzędnych (tajna impreza) → zapis bez ulicy
- Edycja adresu zmienia współrzędne; przełączenie trybu działa poprawnie
- Usunięcie po potwierdzeniu usuwa wiersz
- Walidacja: brak podgatunku; w trybie coords tylko jedna współrzędna — formularz blokuje submit
- Nieznaleziony adres — komunikat PL, brak zapisu
- Nowe wydarzenie `published` + widoczne w anon SELECT (published + przyszła data)

**Implementation Note**: Po automated + manual — slice S-01 gotowy do `/10x-archive`.

---

## Testing Strategy

### Unit Tests:

- Brak test runnera w projekcie — pominięte w MVP.

### Integration Tests:

- Manualne przez API (curl z cookie sesji) w fazie 1.
- Manualne E2E przez UI w fazach 2–3.

### Manual Testing Steps:

1. Zaloguj się jako admin (e-mail z allowlisty).
2. Wejdź na `/admin` — zobacz listę seed.
3. Dodaj wydarzenie z adresem w znanym mieście — współrzędne uzupełnione automatycznie.
4. Dodaj imprezę tajną z ręcznymi współrzędnymi — sukces bez ulicy.
5. Edytuj adres — współrzędne się zmieniają.
6. Usuń wydarzenie — znika z listy.
7. Wyloguj, zaloguj jako zwykły user — `/admin` → 403; POST API → 403.
8. W Studio: anon SELECT — nowe wydarzenie widoczne (published + data w przyszłości).

## Performance Considerations

- Lista admina: jeden SELECT bez paginacji — wystarczy na MVP (setki eventów).
- Geokodowanie: jeden request Nominatim na create/update ze zmianą adresu — akceptowalne przy jednym adminie; unikaj równoległych burstów.
- Brak N+1; jeden fetch geokodowania na zapis w trybie adresowym.

## Migration Notes

- Nowa migracja: `address_street` i `address_number` nullable — wymagana przed testem trybu współrzędnych.
- Istniejący seed zachowuje adresy i coords — bez zmian.
- Eventy seed bez współrzędnych: opcjonalnie uzupełnić ręcznie lub ponownie zapisać przez panel po S-01.
- Jeśli lokalny seed ma daty w przeszłości, admin nadal je widzi; fan nie (RLS `is_upcoming`).

## References

- PRD FR-006, FR-007: `context/foundation/prd.md`
- Roadmap S-01: `context/foundation/roadmap.md`
- F-01 archive: `context/archive/2026-06-10-event-data-foundation/plan.md`
- F-02 archive: `context/archive/2026-06-10-admin-role-guard/plan.md`
- Impl-review F-02 checklist: `context/archive/2026-06-10-admin-role-guard/reviews/impl-review.md`
- Typy: `src/types.ts`
- Guard: `src/lib/auth/guards.ts`
- Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Backend — geokodowanie, walidacja, mapper, serwis, API

#### Automated

- [x] 1.1 `npm install` kończy się bez błędów — f53b76a
- [x] 1.2 `npm run lint` przechodzi — f53b76a
- [x] 1.3 `npm run build` przechodzi — f53b76a

#### Manual

- [x] 1.4 `npx supabase db reset` stosuje migrację nullable adresu — f53b76a
- [x] 1.5 POST tryb `address` — wiersz w Studio z auto współrzędnymi — f53b76a
- [x] 1.6 POST tryb `coordinates` — wiersz bez ulicy/numeru — f53b76a
- [x] 1.7 POST z nieistniejącym adresem → 400 geokodowania — f53b76a
- [x] 1.8 POST bez sesji → 401; nie-admin → 403; pusty `subgenres` → 400 — f53b76a
- [x] 1.9 PUT zmienia adres i współrzędne; DELETE usuwa — f53b76a

### Phase 2: Lista wydarzeń admina

#### Automated

- [x] 2.1 `npm run lint` przechodzi
- [x] 2.2 `npm run build` przechodzi

#### Manual

- [x] 2.3 `/admin` jako admin pokazuje seed events
- [x] 2.4 `/admin` jako nie-admin → redirect 403
- [x] 2.5 Sortowanie od najbliższej daty; link „Dodaj wydarzenie” działa

### Phase 3: Formularze create/edit i usuwanie

#### Automated

- [ ] 3.1 `npm run lint` przechodzi
- [ ] 3.2 `npm run build` przechodzi

#### Manual

- [ ] 3.3 Utworzenie tryb adres → redirect `/admin`, coords w Studio
- [ ] 3.4 Utworzenie tryb współrzędne (tajna impreza) działa
- [ ] 3.5 Edycja adresu re-geokoduje; usuwanie end-to-end
- [ ] 3.6 Walidacja podgatunków i trybu lokalizacji blokuje błędne dane
- [ ] 3.7 Błąd geokodowania widoczny w UI po polsku
- [ ] 3.8 Nowe wydarzenie `published` + widoczne w anon SELECT

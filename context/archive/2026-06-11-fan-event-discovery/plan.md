# Fan Event Discovery Implementation Plan

## Overview

Implementacja publicznego odkrywania wydarzeń DnB (S-02, north star): strona główna `/` z filtrami miasta i podgatunków (multi-select OR), listą nadchodzących eventów, interaktywną mapą Leaflet/OSM z podglądem po kliknięciu oraz stroną szczegółów `/events/[id]`. Slice buduje na schemacie F-01, RLS i geokodowaniu S-01 — **bez nowych migracji DB** na MVP (brak pola na zdjęcie plakatu).

## Current State Analysis

- **Schemat i RLS** — `events_select_public` zwraca tylko `status = 'published'` + `is_upcoming(starts_at)` dla `anon` i `authenticated`. Indeksy: `events_city_idx`, `events_subgenres_gin_idx`, `events_starts_at_idx`. Plik: `supabase/migrations/20260610100000_create_events.sql`.
- **Typy i etykiety** — `Event`, `Subgenre`, `SUBGENRES`, `SUBGENRE_LABELS` (26 wartości) w `src/types.ts`.
- **Mapper i format** — `mapEventRow()` w `src/lib/events/mapper.ts`; `formatEventDate()` w `src/lib/events/format.ts`.
- **Serwis admina** — `listEventsForAdmin`, `getEventById`, mutacje w `src/lib/services/events.ts` — **brak** funkcji publicznego odczytu z filtrami.
- **Strony** — `src/pages/index.astro` renderuje starter `Welcome.astro`; brak `/events/[id]`.
- **Mapa** — brak biblioteki map w `package.json`.
- **Auth** — przeglądanie publiczne (PRD); middleware chroni tylko `/dashboard` i `/admin/*`.

### Key Discoveries:

- Anonimowy klient Supabase (`createClient` bez sesji) respektuje RLS — S-02 nie wymaga osobnej polityki ani logowania fana.
- Seed ma 2 eventy bez współrzędnych (Wrocław, Gdańsk) — plan zakłada fallback centrum miasta na mapie; lista pokazuje je normalnie.
- Admin używa SSR w Astro frontmatter dla odczytu — ten sam wzorzec dla fana (bez publicznego API GET na MVP).
- `Layout.astro` ma `lang="en"` i domyślny tytuł startera — wymaga aktualizacji w tej zmianie.

## Desired End State

1. Fan na `/` widzi filtry: dropdown miast (z bazy) + multi-select podgatunków (checkboxy lub podobny UI) + opcja „Wszystkie”.
2. Zmiana filtra wysyła formularz GET → nowy URL z query params → SSR zwraca przefiltrowaną listę posortowaną po `starts_at` ASC.
3. Desktop: lista po lewej, mapa po prawej. Mobile: zakładki „Lista” / „Mapa”.
4. Klik wiersza listy lub pinezki → podgląd (popup): placeholder graficzny, nazwa, data, venue/miasto, info o biletach (darmowe/cena/link), badge podgatunków, przycisk „Przejdź do wydarzenia”.
5. Mapa Leaflet: kafelki OSM, pinezki z coords z DB lub fallback centrum miasta; klik podświetla odpowiedni wiersz listy (współdzielony stan w React).
6. `/events/[id]` — pełne szczegóły: nazwa, data, venue, adres (lub informacja o lokalizacji bez ulicy), lineup, podgatunki, przycisk/link biletowy (`target=_blank`).
7. Nieistniejący / niedostępny event (RLS) → strona 404 po polsku.
8. `npm run lint` i `npm run build` przechodzą.

### Weryfikacja ręczna:

- `/` bez filtrów → wszystkie nadchodzące published eventy.
- `?city=Warszawa` → tylko warszawskie.
- `?subgenre=neurofunk&subgenre=jump_up` → eventy z Neurofunk **lub** Jump-up.
- Klik podglądu → `/events/[id]` z lineupem i linkiem biletowym.
- Event bez lat/lng → pinezka w centrum miasta (jeśli miasto znane w lookup).
- Przeszły event po UUID → 404.

## What We're NOT Doing

- Pole `image_url` / upload plakatów — placeholder graficzny na MVP; prawdziwe zdjęcia w osobnym slice.
- Odsłuch samplek artystów, komentarze, konta fanów — PRD Non-Goals / user future vision.
- Publiczne API `GET /api/events` — pełny SSR wystarczy na MVP.
- Filtr zakresu dat (FR-008) — parked w roadmapie.
- Geokodowanie w runtime (Nominatim po stronie fana) — coords z S-01 + statyczny fallback miasta.
- Test runner / testy automatyczne.
- Refaktor auth API lub dashboardu.
- Usunięcie komponentu `Welcome.astro` z repo (tylko przestajemy go używać na `/`).

## Implementation Approach

Cztery fazy sekwencyjne: (1) serwis odczytu + helpery; (2) strona `/` z filtrami i listą; (3) mapa Leaflet + podgląd + synchronizacja; (4) strona szczegółów + polski shell. Odczyt wyłącznie przez Supabase w Astro frontmatter. Interaktywna mapa i podgląd jako React islands (`client:only` dla mapy). Filtry przez nawigację URL (form GET).

## Critical Implementation Details

- **Leaflet + Astro SSR:** komponent mapy **musi** użyć `client:only="react"` (lub równoważnego) — `window`/`document` nie istnieją na serwerze Cloudflare. Import `leaflet/dist/leaflet.css` w komponencie mapy lub w island wrapperze.
- **Query params podgatunków:** powtarzany param `subgenre` — np. `?city=Kraków&subgenre=neurofunk&subgenre=liquid_dnb`. Parser zbiera wszystkie wartości `subgenre` z URL; walidacja względem `SUBGENRES` (nieznane → ignoruj).
- **PostgREST OR dla podgatunków:** gdy wybrano wiele tagów, zapytanie `.or(subgenres.cs.{tag1},subgenres.cs.{tag2},...)` — każdy tag jako osobny warunek `contains`. Pusta lista tagów = brak filtra podgatunku.
- **Współrzędne mapy:** `resolveMapCoordinates(event)` — jeśli `latitude` i `longitude` nie null → użyj ich; inaczej `getCityCenter(event.city)` ze statycznej mapy; ostateczny fallback: środek Polski (~52.0, 19.0).
- **Podgląd vs szczegóły:** podgląd nie pokazuje pełnego lineupu (tylko skrót: venue, data, bilety, tagi); pełny lineup tylko na `/events/[id]`.

## Phase 1: Serwis odczytu, schema filtrów, helpery

### Overview

Warstwa danych dla fana: parsowanie URL, zapytania Supabase z filtrami, helpery współrzędnych i formatowania tekstów UI. Po tej fazie można testować zapytania z dev servera (tymczasowy log w Astro) bez UI.

### Changes Required:

#### 1. Schema filtrów fana (URL → typy)

**File**: `src/lib/events/fan-schema.ts`

**Intent**: Walidacja i parsowanie query params z adresu URL na typowane filtry.

**Contract**:

- `FanEventFilters` — `{ city: string | null; subgenres: Subgenre[] }`
- `parseFanFilters(searchParams: URLSearchParams): FanEventFilters` — `city` z pojedynczego `?city=` (trim, pusty → null); `subgenre` — wszystkie powtórzenia, filtrowane do `SUBGENRES`
- `buildFanFilterSearchParams(filters: FanEventFilters): URLSearchParams` — do linków „wyczyść filtry” / testów

#### 2. Statyczne centra miast (fallback mapy)

**File**: `src/lib/geocoding/city-centers.ts`

**Intent**: Współrzędne przybliżone dla miast z seeda i typowych polskich miast — gdy event nie ma lat/lng.

**Contract**:

- `getCityCenter(city: string): { latitude: number; longitude: number } | null` — lookup case-insensitive po znormalizowanej nazwie
- Mapa minimum: Warszawa, Kraków, Poznań, Wrocław, Gdańsk, Łódź, Katowice, Lublin, Białystok, Szczecin + `DEFAULT_POLAND_CENTER` jako fallback ostatniej instancji
- `resolveMapCoordinates(event: Pick<Event, 'latitude' | 'longitude' | 'city'>): { latitude: number; longitude: number }`

#### 3. Helpery formatowania dla UI fana

**File**: `src/lib/events/format.ts` (rozszerzenie)

**Intent**: Spójne polskie teksty na liście, w podglądzie i na stronie szczegółów.

**Contract**:

- `formatEventPrice(event: Pick<Event, 'isFree' | 'price'>): string` — np. „Wstęp wolny” / `price` / „Cena do ustalenia”
- `formatEventVenueLine(event: Pick<Event, 'venueName' | 'city'>): string` — `"${venueName}, ${city}"`
- `formatEventAddress(event: Pick<Event, 'addressStreet' | 'addressNumber' | 'venueName'>): string | null` — pełny adres lub `null` gdy tryb współrzędnych (oba adresy null) → UI pokaże „Dokładny adres podany na miejscu” lub podobny komunikat PL

#### 4. Serwis odczytu publicznego

**File**: `src/lib/services/events.ts` (rozszerzenie)

**Intent**: Zapytania read-only dla anon/authenticated fanów; RLS jako pierwsza bariera.

**Contract**:

- `listPublishedEvents(supabase, filters?: FanEventFilters): Promise<ServiceResult<Event[]>>` — `.select('*').order('starts_at', { ascending: true })`; opcjonalnie `.eq('city', filters.city)`; dla `filters.subgenres.length > 0` → `.or(...)` z `subgenres.cs.{id}`; map przez `mapEventRow`
- `listDistinctCities(supabase): Promise<ServiceResult<string[]>>` — unikalne `city` z opublikowanych nadchodzących (RLS ogranicza wiersze); sort alfabetyczny PL
- `getPublishedEventById(supabase, id: string): Promise<Event | null>` — `.eq('id', id).maybeSingle()`; RLS ukrywa niepublished/przeszłe → `null`

#### 5. Zależności map (przygotowanie pod Fazę 3)

**File**: `package.json`

**Intent**: Dodać Leaflet przed implementacją mapy — instalacja może nastąpić w Fazie 1 lub na początku Fazy 3; rekomendacja: **koniec Fazy 1** żeby `npm run build` wykrył problemy wcześniej.

**Contract**: `leaflet`, `react-leaflet@^5` (React 19), `@types/leaflet` w devDependencies; `npm install`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi
- Nowe pliki eksportują funkcje zgodnie z kontraktem (brak błędów TypeScript)

#### Manual Verification:

- Tymczasowo w dowolnej stronie Astro: wywołanie `listPublishedEvents` z `{ city: 'Warszawa' }` zwraca oczekiwane wiersze
- `parseFanFilters` poprawnie parsuje multi `subgenre`
- `resolveMapCoordinates` zwraca coords DB lub centrum miasta

**Implementation Note**: Po fazie 1 — potwierdzenie manualne przed Fazą 2.

---

## Phase 2: Strona odkrywania — filtry, lista, URL

### Overview

Zastąpienie placeholdera na `/` prawdziwym UI odkrywania: filtry GET, lista eventów, layout split (desktop) / zakładki (mobile) — **bez mapy** (slot na mapę w Fazie 3).

### Changes Required:

#### 1. Strona główna

**File**: `src/pages/index.astro`

**Intent**: SSR hub odkrywania — odczyt filtrów z URL, zapytania serwisu, przekazanie danych do islandów React.

**Contract**:

- `export const prerender = false`
- `parseFanFilters(Astro.url.searchParams)` → `listPublishedEvents` + `listDistinctCities`
- `Layout title="BassMap PL — Wydarzenia DnB"`
- Render: `Topbar`, nagłówek PL, `DiscoveryShell` (lub równoważny) z `EventFilters`, `EventList`, pustym slotem mapy / placeholder „Mapa wkrótce” do czasu Fazy 3
- Obsługa błędu serwisu — komunikat PL (wzorzec `listError` z admina)

#### 2. Filtry

**File**: `src/components/discovery/EventFilters.tsx`

**Intent**: Formularz GET bez JavaScript (progressive enhancement) + opcjonalna synchronizacja wizualna multi-select.

**Contract**:

- Props: `cities: string[]`, `currentFilters: FanEventFilters`, `subgenreOptions` z `SUBGENRES` + `SUBGENRE_LABELS`
- `<form method="GET" action="/">` — select `city` z opcją pustą „Wszystkie miasta”; checkboxy `name="subgenre"` `value={id}` z `defaultChecked` wg URL
- Przycisk „Filtruj” + link „Wyczyść filtry” → `/`
- Teksty po polsku; klasy przez `cn()`

#### 3. Lista wydarzeń

**File**: `src/components/discovery/EventList.tsx`

**Intent**: Lista nadchodzących eventów z możliwością wyboru wiersza (pod Fazę 3 — podgląd).

**Contract**:

- Props: `events: Event[]`, `selectedEventId: string | null`, `onSelectEvent: (id: string) => void`
- Wiersz: nazwa, `formatEventDate`, `formatEventVenueLine`, badge podgatunków (skrót), `formatEventPrice`
- `onClick` wiersza → `onSelectEvent(event.id)`; klasa podświetlenia gdy `selectedEventId === event.id`
- Stan pusty: „Brak wydarzeń spełniających kryteria” / „Brak nadchodzących wydarzeń”

#### 4. Layout odkrywania

**File**: `src/components/discovery/DiscoveryShell.tsx`

**Intent**: Split desktop / zakładki mobile; wspólny stan `selectedEventId` dla listy i (później) mapy.

**Contract**:

- Props: `events`, `cities`, `currentFilters`, `listError`
- Desktop (`md:`): grid 2 kolumny — lewa: filtry + lista; prawa: children (mapa)
- Mobile: tabs „Lista” | „Mapa” (mapa placeholder w Fazie 2)
- `useState` dla `selectedEventId` i przekazanie do `EventList`

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- `/` pokazuje listę seedowych eventów
- Wybór miasta + submit → URL się zmienia, lista się filtruje
- Multi podgatunek OR działa
- Mobile: zakładki przełączają widok
- Brak regresji: `/admin` nadal działa dla admina

**Implementation Note**: Po fazie 2 — potwierdzenie manualne przed Fazą 3.

---

## Phase 3: Mapa Leaflet, podgląd, synchronizacja

### Overview

Interaktywna mapa Polski z pinezkami, popup podglądu po kliknięciu, synchronizacja wyboru lista ↔ mapa.

### Changes Required:

#### 1. Komponent mapy

**File**: `src/components/discovery/EventsMap.tsx`

**Intent**: Mapa OSM z markerami dla każdego eventu z listy.

**Contract**:

- `client:only="react"` w `index.astro`
- Props: `events: Event[]`, `selectedEventId`, `onSelectEvent(id)`
- `MapContainer` centrum Polski (~52.0, 19.0), zoom ~6; `TileLayer` URL `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution OSM
- Dla każdego eventu: `resolveMapCoordinates` → `Marker`; klik → `onSelectEvent`; selected marker — inna ikona lub klasa CSS
- `useEffect`: gdy `selectedEventId` zmienia się z listy → `panTo` marker
- Import CSS Leaflet

#### 2. Podgląd wydarzenia (popup)

**File**: `src/components/discovery/EventPreviewCard.tsx`

**Intent**: Małe okno po kliknięciu listy/mapy — skrót informacji przed przejściem na pełną stronę.

**Contract**:

- Props: `event: Event | null`, `onClose`, opcjonalnie `anchor` (modal/portal nad mapą lub panel pod listą na mobile)
- Gdy `event` null — nie renderuj
- Zawartość: placeholder graficzny (gradient + ikona/nazwa), `formatEventDate`, `formatEventVenueLine`, `formatEventPrice`, link „Kup bilet” jeśli `ticketUrl` (preview tylko — pełny CTA na szczegółach), badge `SUBGENRE_LABELS`
- Przycisk „Przejdź do wydarzenia” → `<a href={/events/${id}}>`
- Przycisk zamknięcia (X); `onClose` czyści `selectedEventId`

#### 3. Integracja w DiscoveryShell

**File**: `src/components/discovery/DiscoveryShell.tsx` (aktualizacja)

**Intent**: Połączyć listę, mapę i podgląd w jednym stanie.

**Contract**:

- Render `EventsMap` w prawej kolumnie / zakładce Mapa
- Render `EventPreviewCard` gdy `selectedEventId` ustawiony — `event` z tablicy `events.find`
- Klik mapy i listy ustawia ten sam `selectedEventId`

#### 4. Strona główna — island mapy

**File**: `src/pages/index.astro` (aktualizacja)

**Intent**: Podłączyć `EventsMap` z `client:only="react"`.

**Contract**: Usunąć placeholder mapy; przekazać `events` do `DiscoveryShell`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi (Leaflet nie łamie bundla SSR)

#### Manual Verification:

- Pinezki widoczne dla eventów z coords i fallback miasta
- Klik pinezki → podgląd; klik listy → mapa centruje i podgląd
- Zoom/pan mapy działa (FR-005)
- Mobile: mapa w zakładce, podgląd czytelny
- Event bez ticketUrl — brak linku „Kup bilet” w podglądzie, ale przycisk „Przejdź do wydarzenia” jest

**Implementation Note**: Po fazie 3 — potwierdzenie manualne przed Fazą 4.

---

## Phase 4: Strona szczegółów i polski shell

### Overview

Pełna strona wydarzenia, obsługa 404, polski layout i sensowny Topbar dla produktu fanowskiego.

### Changes Required:

#### 1. Strona szczegółów

**File**: `src/pages/events/[id].astro`

**Intent**: SSR pełnych szczegółów pojedynczego wydarzenia.

**Contract**:

- `export const prerender = false`
- `getPublishedEventById(supabase, Astro.params.id)` — jeśli `null` → `Astro.response.status = 404` + komunikat PL
- Sekcje: nazwa, data (`formatEventDate`), venue + miasto, adres (`formatEventAddress` lub komunikat), lineup (lista lub „Brak potwierdzonego lineupa”), podgatunki jako badge, cena (`formatEventPrice`), przycisk „Kup bilet” gdy `ticketUrl` (`target="_blank"` `rel="noopener noreferrer"`)
- Link powrotu: „← Wróć do listy” → `/` (opcjonalnie z zachowaniem query string z `Referer` — nie wymagane na MVP)
- `Layout title={`${event.name} — BassMap PL`}`

#### 2. Layout — język i meta

**File**: `src/layouts/Layout.astro`

**Intent**: Polski dokument HTML i domyślny tytuł produktu.

**Contract**:

- `<html lang="pl">`
- Domyślny `title` → `"BassMap PL"`

#### 3. Topbar — nawigacja fana

**File**: `src/components/Topbar.astro`

**Intent**: Link do strony głównej wydarzeń; zachować auth/admin dla zalogowanych.

**Contract**:

- Link „Wydarzenia” → `/` (widoczny zawsze lub jako pierwszy element)
- Zachować istniejące linki auth/admin/dashboard

#### 4. Usunięcie startera z trasy głównej

**File**: `src/pages/index.astro`

**Intent**: Potwierdzić brak importu `Welcome.astro` (już w Fazie 2).

**Contract**: `Welcome.astro` pozostaje w repo, nieużywany.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- `/events/{valid-id}` pokazuje pełne szczegóły z lineupem
- `/events/{invalid-uuid}` → 404 PL
- UUID przeszłego eventu (jeśli znany z admina) → 404 dla fana
- Link biletowy otwiera nową kartę
- `lang="pl"` w źródle HTML
- Topbar „Wydarzenia” wraca na `/`

**Implementation Note**: Po fazie 4 — pełna akceptacja S-02.

---

## Testing Strategy

### Unit Tests:

- Brak test runnera w projekcie — pominięte na MVP.

### Integration Tests:

- Brak — weryfikacja przez `npm run build` + manual QA.

### Manual Testing Steps:

1. Uruchom `npm run dev`; wejdź na `/` bez logowania.
2. Sprawdź listę wszystkich nadchodzących eventów z seeda.
3. Filtruj `Warszawa` — tylko warszawskie; URL zawiera `city=Warszawa`.
4. Zaznacz 2 podgatunki — wyniki OR; URL ma 2× `subgenre=`.
5. Kliknij wiersz — podgląd; „Przejdź do wydarzenia” → szczegóły.
6. Na mapie kliknij pinezkę — ten sam podgląd; mapa centruje marker.
7. Otwórz link biletowy — nowa karta.
8. Wejdź na `/events/nieistniejący` — 404.
9. `npm run lint` + `npm run build`.

## Performance Considerations

- Jedno zapytanie `listPublishedEvents` na request `/` — wystarczy na setki eventów w MVP.
- `listDistinctCities` — osobne lekkie zapytanie; można scalić w jednym round-trip później jeśli potrzeba.
- Leaflet bundle — akceptowalny dla desktop-first; mapa ładuje się tylko z `client:only`.
- Brak cache KV — dane świeże z Supabase; OK przy niskim QPS MVP.

## Migration Notes

- **Brak migracji DB** w tej zmianie.
- Opcjonalnie po wdrożeniu: uzupełnić współrzędne seedowych eventów bez coords w panelu admina (Wrocław, Gdańsk).

## Addendum (impl-review 2026-06-11): powiązane poprawki admina (QA)

Podczas testów S-02 w tej samej sesji: (1) `EventForm.tsx` + `schema.ts` — pole venue jako „Miejsce / opis lokalizacji” (nie tylko nazwa klubu); (2) `checkbox.tsx` — naprawa klikalności checkboxów Radix w panelu admina. Poza scope S-02, nie blokuje archiwizacji slice'a fana.

## Addendum (impl-review 2026-06-11): hydratacja mapy Leaflet

Plan przewidywał `client:only="react"` na `EventsMap` w `index.astro`. W implementacji mapa ładuje się przez `lazy()` + `useSyncExternalStore` (`useIsClient`) wewnątrz `DiscoveryShell` z `client:load` — ten sam cel (brak `window` podczas SSR), potwierdzony w manual QA. Nie wymaga zmiany kodu.

## References

- PRD: `context/foundation/prd.md` — US-01, FR-001–FR-005
- Roadmap: `context/foundation/roadmap.md` — S-02
- S-01 plan: `context/archive/2026-06-10-admin-event-management/plan.md`
- F-01 schema: `supabase/migrations/20260610100000_create_events.sql`
- Admin SSR wzorzec: `src/pages/admin/index.astro`
- RLS public read: `events_select_public` w migracji F-01

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Serwis odczytu, schema filtrów, helpery

#### Automated

- [x] 1.1 `npm run lint` przechodzi
- [x] 1.2 `npm run build` przechodzi
- [x] 1.3 Nowe pliki eksportują funkcje zgodnie z kontraktem (brak błędów TypeScript)

#### Manual

- [x] 1.4 `listPublishedEvents` z filtrem miasta zwraca oczekiwane wiersze
- [x] 1.5 `parseFanFilters` poprawnie parsuje multi `subgenre`
- [x] 1.6 `resolveMapCoordinates` zwraca coords DB lub centrum miasta

### Phase 2: Strona odkrywania — filtry, lista, URL

#### Automated

- [x] 2.1 `npm run lint` przechodzi
- [x] 2.2 `npm run build` przechodzi

#### Manual

- [x] 2.3 `/` pokazuje listę seedowych eventów
- [x] 2.4 Wybór miasta + submit filtruje listę i URL
- [x] 2.5 Multi podgatunek OR działa
- [x] 2.6 Mobile: zakładki Lista/Mapa przełączają widok
- [x] 2.7 `/admin` bez regresji

### Phase 3: Mapa Leaflet, podgląd, synchronizacja

#### Automated

- [x] 3.1 `npm run lint` przechodzi
- [x] 3.2 `npm run build` przechodzi

#### Manual

- [x] 3.3 Pinezki na mapie (coords + fallback miasta)
- [x] 3.4 Klik listy/mapy otwiera podgląd i synchronizuje wybór
- [x] 3.5 Zoom/pan mapy działa
- [x] 3.6 Mobile: mapa i podgląd czytelne

### Phase 4: Strona szczegółów i polski shell

#### Automated

- [x] 4.1 `npm run lint` przechodzi
- [x] 4.2 `npm run build` przechodzi

#### Manual

- [x] 4.3 `/events/{valid-id}` — pełne szczegóły
- [x] 4.4 Nieistniejący/przeszły event → 404 PL
- [x] 4.5 Link biletowy w nowej karcie
- [x] 4.6 `lang="pl"` i Topbar „Wydarzenia”

# Kafelki wydarzeń (S-18) Implementation Plan

## Overview

Przebudowa UI listy odkrywania na `/events`: poziome wiersze z miniaturką zastępujemy siatką kwadratowych kafelków wzorowanych na `bassmap-pl-ui/components/event-card.tsx`. Układ strony zmienia się na mapę nad siatką (jak `event-explorer.tsx`). Kafelek jest linkiem do `/events/[id]`; dolny podgląd `EventPreviewCard` znika. Licznik „Idę” pokazuje **0** jako placeholder do S-19. **Bez migracji DB i bez zmian API.**

## Current State Analysis

- **Lista discovery** – `EventList.tsx` renderuje `<ul className="space-y-2">` z przyciskami (`<button>`), miniaturą `EventCoverImage` variant `thumb`, badge'ami shadcn `Badge`, ceną w nagłówku wiersza.
- **Orkiestracja** – `DiscoveryShell.tsx`: desktop 2 kolumny (lista + mapa), mobile zakładki Lista/Mapa, stan `selectedEventId` + `EventPreviewCard` na dole.
- **Mapa** – `EventsMap.tsx`: `selectedEventId` podświetla pin i centruje mapę; klik pina wywołuje `onSelectEvent`.
- **Wzorzec wizualny w repo** – `ProfileEventCard.tsx` jest już portem mockupu (GenreBadge, Equalizer opcjonalny, uppercase tytuł, ikony MapPin/Calendar) – ale ma pasek statusu publikacji i brak ceny/biletu.
- **Mockup bassmap-pl-ui** – `event-card.tsx`: karta bez okładki, grid w `event-explorer.tsx` jako `mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3`, mapa **nad** siatką, hover `onMouseEnter`/`onMouseLeave` na wrapperze kafelka.
- **Dane** – `Event` / `EventWithCoverUrl` w `src/types.ts`; formatowanie w `src/lib/events/format.ts`; fetch SSR w `events.astro` bez zmian w tym slice.
- **Testy** – brak testów dla komponentów discovery; wzorzec testów React: Vitest + Testing Library (inne slice'y w `tests/unit/`).

### Key Discoveries:

- `bassmap-pl-ui/` jest w `.gitignore` – narzędzia IDE mogą go nie indeksować; folder istnieje lokalnie z `components/event-card.tsx` i `event-explorer.tsx`.
- Mockup **nie ma ceny** na kafelku – roadmapa S-18 wymaga ceny; stopka będzie bogatsza niż mockup (cena + Idzie + bilet).
- `GenreBadge` w produkcji (`src/components/fan/GenreBadge.tsx`) jest już zsynchronizowany z mockupem – użyć go zamiast shadcn `Badge` na kafelku discovery.
- Usunięcie `EventPreviewCard` upraszcza stan – `hoveredEventId` zastępuje `selectedEventId` dla interakcji z mapą.

## Desired End State

1. `/events` – nagłówek i filtry bez zmian funkcjonalnych (URL query params).
2. Mapa na pełnej szerokości (nad siatką); na mobile zakładka „Mapa” pokazuje tylko mapę, „Lista” – filtry + siatkę.
3. Siatka kafelków: 1 kolumna mobile, 2 na `sm`, 3 na `lg`; odstęp `gap-5` jak mockup.
4. Każdy kafelek (`<a href="/events/{id}">`) zawiera: wszystkie podgatunki (`GenreBadge` + cykl kolorów), nazwę (uppercase, `font-heading`), miejsce (`formatEventVenueLine`), datę/czas (`formatEventDate`), stopkę: cena (`formatEventPrice`), „0 Idzie” z ikoną Users, przycisk „Kup bilet” (gdy `ticketUrl`) lub „Zobacz” (gdy brak URL).
5. Hover na kafelku ustawia `hoveredEventId` → pin na mapie większy / kolor accent.
6. Klik pina na mapie → nawigacja do `/events/{id}` (spójnie z kafelkiem).
7. Brak `EventPreviewCard` i stanu podglądu.
8. `npm run verify` przechodzi.

### Weryfikacja ręczna:

- `/events` – siatka kafelków, brak poziomych wierszy z miniaturką.
- Filtry `?city=`, `?subgenre=`, daty, `free` – nadal działają; pusta siatka pokazuje komunikat jak dziś.
- Kafelek z `ticketUrl` – „Kup bilet” otwiera link w nowej karcie.
- Kafelek bez `ticketUrl` – „Zobacz” prowadzi do szczegółów.
- Hover kafelka – pin podświetlony; klik pina – strona szczegółów.
- Mobile – przełączanie Lista/Mapa bez nakładania się sekcji.
- `/archive`, `/profile`, `/my-events` – bez zmian wizualnych (poza S-18).

## What We're NOT Doing

- Prawdziwy licznik RSVP / tabela attendance (S-19).
- Pasek statusu (Live now / Selling fast) lub status publikacji na kafelku discovery.
- Okładka na kafelku listy.
- Redesign `ProfileEventCard`, `ArchiveEventList`, strony `/events/[id]`.
- Zmiana filtrów, serwisu `listPublishedEvents`, migracji, API.
- Paginacja listy (poza scope całego produktu).

## Implementation Approach

Trzy fazy: (1) nowy komponent kafelka + siatka w `EventList` – można zweryfikować wizualnie nawet przed zmianą układu shell; (2) przebudowa `DiscoveryShell` + `EventsMap` (układ pionowy, hover, usunięcie podglądu); (3) testy jednostkowe i cleanup martwego kodu. Wizualnie portujemy klasy z mockupu; semantykę linków i copy dostosowujemy do polskiego produktu i roadmapy.

## Critical Implementation Details

- **Stopka kafelka na mobile:** trzy elementy (cena, licznik, przycisk) mogą się zawijać – użyj `flex flex-wrap items-center justify-between gap-2` jak mockup (`justify-between` na desktop); przycisk `size="sm"` z shadcn `Button`.
- **`ticketUrl` zewnętrzny:** przycisk „Kup bilet” jako `<a href={ticketUrl} target="_blank" rel="noopener noreferrer">` – nie nawiguj do `/events/[id]` przy kliku biletu (zatrzymaj propagację jeśli kafelek jest owinięty linkiem – **albo** struktura: cały kafelek `<article>` z wewnętrznym linkiem tytułu + osobny link biletu; preferowane: kafelek jako `<a>` z przyciskiem biletu jako zagnieżdżony link jest niepoprawne HTML – **kafelek nie może być jednym `<a>` owijającym przycisk biletu**). **Contract:** kafelek = `<article>`; tytuł i obszar treści owinięte `<a href="/events/id">`; przycisk biletu osobno poza głównym linkiem lub cały kafelek klikalny do szczegółów, a „Kup bilet” to `onClick` + `stopPropagation` na `<a>` – najprościej: główny link na tytule + „Zobacz”/obszar, a „Kup bilet” jako sibling `<Button asChild><a target=_blank>`. Alternatywa zgodna z a11y: cały card to link, bilety tylko na stronie szczegółów – **decyzja planu:** przycisk biletu **poza** głównym linkiem kafelka (mockup ma button w stopce); klik w padding karty → szczegóły przez link na tytule lub osobny overlay link – implementer: struktura `<article>` + link na tytule + opcjonalny `Button asChild` dla biletu.

## Phase 1: Komponent kafelka i siatka w EventList

### Overview

Wydzielenie `EventDiscoveryCard` i zamiana listy pionowej na siatkę kafelków. Na końcu fazy 1 `DiscoveryShell` może nadal mieć stary układ 2-kolumnowy – ważne, że kafelki i grid działają.

### Changes Required:

#### 1. Stała placeholder RSVP

**File**: `src/lib/events/rsvp-placeholder.ts` (nowy)

**Intent**: Jedno miejsce na wartość licznika „Idę” do czasu S-19.

**Contract**: `export const GOING_COUNT_PLACEHOLDER = 0` + krótki komentarz `// S-19: replace with real attendance count`.

#### 2. Komponent kafelka discovery

**File**: `src/components/discovery/EventDiscoveryCard.tsx` (nowy)

**Intent**: Wizualny port `bassmap-pl-ui/components/event-card.tsx` z polskim copy i polami z `Event` / `EventWithCoverUrl` (bez użycia `coverUrl`).

**Contract**:

- Props: `{ event: EventWithCoverUrl; className?: string; onMouseEnter?: () => void; onMouseLeave?: () => void }`
- Brak paska statusu u góry (w przeciwieństwie do mockupu i `ProfileEventCard`).
- Podgatunki: `GenreBadge` + `NEON_CYCLE` jak w `ProfileEventCard` (`violet`, `green`, `cyan`, `orange`).
- Tytuł: `font-heading text-xl font-bold uppercase` + link `<a href={/events/${event.id}}>`.
- Meta: `MapPin`, `Calendar`, `Clock` (ikony jak mockup); `formatEventVenueLine`, `formatEventDate`.
- Stopka `border-t`: lewa – `formatEventPrice` (klasa `text-accent` lub `text-foreground font-semibold`); środek/lewa – `Users` + `{GOING_COUNT_PLACEHOLDER}` + „Idzie”; prawa – jeśli `event.ticketUrl` → `Button asChild` „Kup bilet” (`target="_blank"`); else → `Button asChild` „Zobacz” → `/events/{id}`.
- Klasy karty: `group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow-violet` (z mockupu).
- `onMouseEnter` / `onMouseLeave` na root `<article>` dla fazy 2.

#### 3. Siatka w EventList

**File**: `src/components/discovery/EventList.tsx`

**Intent**: Zamiana `<ul className="space-y-2">` + przycisków na siatkę kafelków.

**Contract**:

- Props rozszerzyć o opcjonalne: `hoveredEventId?: string | null; onHoverEvent?: (id: string | null) => void` (używane w fazie 2; w fazie 1 mogą być no-op).
- Kontener: `div` z `grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3` (jak `event-explorer.tsx`).
- Mapowanie: każdy event → wrapper `div` z `onMouseEnter={() => onHoverEvent?.(event.id)}` / `onMouseLeave={() => onHoverEvent?.(null)}` + `<EventDiscoveryCard event={event} />`.
- Usunąć: `EventCoverImage`, shadcn `Badge`, props `selectedEventId`, `onSelectEvent`.
- Empty state bez zmian copy (ten sam komunikat w `shellPanelFlat`).

### Success Criteria:

#### Automated Verification:

- `npm run check` przechodzi
- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- Na `/events` widać siatkę kafelków (nie poziome wiersze)
- Kafelek pokazuje nazwę, podgatunki, miejsce, datę, cenę, „0 Idzie”
- „Kup bilet” widoczny tylko gdy jest `ticketUrl`; inaczej „Zobacz”
- Klik tytułu / „Zobacz” otwiera `/events/[id]`

**Implementation Note**: Po fazie 1 – potwierdzenie ręczne przed fazą 2.

---

## Phase 2: DiscoveryShell – układ pionowy, mapa, usunięcie podglądu

### Overview

Przebudowa układu strony discovery: mapa nad siatką, synchronizacja hover lista↔mapa, nawigacja z pina, usunięcie `EventPreviewCard`.

### Changes Required:

#### 1. DiscoveryShell – layout i stan

**File**: `src/components/discovery/DiscoveryShell.tsx`

**Intent**: Układ jak `event-explorer.tsx`: mapa, potem filtry + siatka (filtry pozostają nad siatką – mockup ma filtry gatunków między mapą a gridem; u nas `EventFilters` zostaje nad `EventList`).

**Contract**:

- Usunąć: `selectedEventId`, `handleSelectEvent`, `handleClosePreview`, import i render `EventPreviewCard`.
- Dodać: `hoveredEventId` + `setHoveredEventId`.
- Struktura DOM (desktop i mobile po merge):
  1. Nagłówek (bez zmian)
  2. Mobile tabs (bez zmian)
  3. Sekcja mapy – pełna szerokość; widoczna gdy `mobileTab === "map"` lub zawsze na `md+` **nad** listą – **decyzja:** na desktop mapa zawsze nad siatką; na mobile tab „Mapa” pokazuje tylko mapę, tab „Lista” pokazuje filtry + siatkę (mapa ukryta).
  4. Sekcja listy: `EventFilters` + `EventList` z `onHoverEvent` / `hoveredEventId`.
- Usunąć grid `md:grid-cols-2` obok siebie.
- Mapa: przekazać `hoveredEventId` i `onPinClick` (nawigacja).

#### 2. EventsMap – hover i nawigacja

**File**: `src/components/discovery/EventsMap.tsx`

**Intent**: Podświetlenie pina na hover z kafelka; klik pina → strona wydarzenia.

**Contract**:

- Zamienić props `selectedEventId` / `onSelectEvent` na: `highlightedEventId: string | null` (hover), `onEventNavigate: (id: string) => void`.
- `createNeonMarkerIcon`: `active` gdy `highlightedEventId === event.id`.
- `MapController`: opcjonalnie pan na hover (delikatny) – **domyślnie tylko podświetlenie bez pan** (mniej agresywne UX); pan tylko jeśli implementer uzna za potrzebne – plan: **bez auto-pan na hover**.
- Klik markera: `onEventNavigate(event.id)` → w shell `window.location.href = `/events/${id}`` lub `useNavigate` jeśli dostępny – w Astro island prościej `window.location.assign`.

#### 3. Usunięcie EventPreviewCard

**File**: `src/components/discovery/EventPreviewCard.tsx`

**Intent**: Martwy kod po usunięciu podglądu.

**Contract**: Usunąć plik jeśli brak innych importów (grep przed usunięciem).

### Success Criteria:

#### Automated Verification:

- `npm run check` przechodzi
- `npm run lint` przechodzi
- `npm run build` przechodzi
- `rg EventPreviewCard` – brak wyników w `src/` (poza ewentualnym archiwum)

#### Manual Verification:

- Desktop: mapa nad filtrami i siatką
- Mobile: zakładki Lista/Mapa działają poprawnie
- Hover kafelka podświetla pin na mapie
- Klik pina otwiera stronę wydarzenia
- Brak dolnego podglądu po kliknięciu
- Filtry URL nadal działają

**Implementation Note**: Po fazie 2 – potwierdzenie ręczne przed fazą 3.

---

## Phase 3: Testy i weryfikacja końcowa

### Overview

Testy jednostkowe kafelka, pełny gate `npm run verify`, dokumentacja w change.

### Changes Required:

#### 1. Testy EventDiscoveryCard

**File**: `tests/unit/event-discovery-card.test.tsx` (nowy)

**Intent**: Regresja pól wymaganych przez S-18 i warunkowego przycisku biletu.

**Contract**:

- Render z przykładowym `Event` / `EventWithCoverUrl` (fixture minimalne pole)
- Asercje: nazwa widoczna; `formatEventPrice` output; tekst „0 Idzie”; gdy `ticketUrl` ustawiony – link „Kup bilet” z `href` i `target="_blank"`; gdy brak – „Zobacz” z `href` do `/events/{id}`
- Subgenres: co najmniej jeden `GenreBadge` label z `SUBGENRE_LABELS`

#### 2. Aktualizacja change.md

**File**: `context/changes/event-card-redesign/change.md`

**Intent**: Po zakończeniu implementacji – `status: implemented` (przy /10x-archive → `archived`).

**Contract**: `updated` na datę zakończenia fazy 3.

### Success Criteria:

#### Automated Verification:

- `npm run verify` przechodzi (check + lint:all + test)
- `npm test -- tests/unit/event-discovery-card.test.tsx` przechodzi

#### Manual Verification:

- Pełny smoke test `/events` na desktop i mobile (DevTools)
- Brak regresji na `/events/[id]` (lineup, komentarze nadal widoczne)
- Issue GitHub #38 gotowe do PR z `Refs #38`

---

## Testing Strategy

### Unit Tests:

- `EventDiscoveryCard` – render pól, warunek biletu, placeholder Idzie
- Opcjonalnie: test `EventList` empty state (jeśli prosty)

### Integration Tests:

- Brak nowych testów integracji Supabase (brak zmian DB/API)

### Manual Testing Steps:

1. Otwórz `/events` – siatka 1/2/3 kolumny przy resize
2. Ustaw filtr miasta – siatka się zawęża, komunikat pusty przy braku wyników
3. Hover kafelka – pin na mapie jaśniejszy
4. Klik kafelka – strona szczegółów
5. Event z biletem – „Kup bilet” w nowej karcie
6. Mobile – przełącz Lista/Mapa
7. Sprawdź `/archive` – stary layout (poza scope – nie powinien się zmienić)

## Performance Considerations

- Brak dodatkowych zapytań sieciowych; ta sama tablica eventów z SSR.
- Siatka 3-kolumnowa przy setkach eventów bez paginacji może być długa – **poza scope S-18** (istniejący problem listy); nie wprowadzać virtualizacji w tym slice.

## Migration Notes

- Nie dotyczy – zero zmian schematu.
- Deploy: standardowy `npm run build` + `wrangler deploy`; brak flag env.

## References

- Roadmap S-18: `context/foundation/roadmap.md`
- Shaping: `context/foundation/partia-iii-shaping.md`
- Mockup: `bassmap-pl-ui/components/event-card.tsx`, `event-explorer.tsx`
- Wzorzec profilu: `src/components/fan/ProfileEventCard.tsx`
- Poprzedni discovery plan: `context/archive/2026-06-11-fan-event-discovery/plan.md`
- GitHub issue: [#38](https://github.com/ematrejek/bassmap-pl/issues/38)

## Implementation Addendum (impl-review 2026-06-22)

Decyzje z triage `/10x-impl-review` – odchylenia od oryginalnego planu, zaakceptowane przed merge.

### Układ desktop DiscoveryShell

**Oryginalny plan:** mapa full-width nad `EventFilters` + siatką (jak `event-explorer.tsx`).

**Implementacja:** filtry i mapa obok siebie (`md:grid-cols-2`), siatka poniżej. **Zaakceptowane** – mniej miejsca na mapę w pionie, ale filtry zawsze widoczne obok mapy na desktopie.

### Scope rozszerzony w tym samym PR

Poza S-18 discovery w diffie znalazły się zmiany infrastrukturalne i UX – **udokumentowane, nie revertowane:**

| Plik | Zmiana | Uzasadnienie |
|------|--------|--------------|
| `signin.astro`, `signup.astro` | React form → HTML `<form>` | Uproszczenie auth islands |
| `EventCommentsSection.tsx` | Radix `AlertDialog` → inline `role="alertdialog"` | Bundling Radix; **zaakceptowana regresja a11y** (focus trap) |
| `EventCoverImage.tsx` | Layout placeholdera hero/preview | Poprawka po usunięciu `EventPreviewCard` |
| `events/[id].astro` | Opis zawsze widoczny; `client:load` komentarzy | Smoke-test detail page |
| `ProfileSection.tsx`, `MyEventsPage.tsx` | `EventDiscoveryGrid` z `EventDiscoveryCard` | Reuse kafelka S-18 na profilu |
| `astro.config.mjs` | `optimizeDeps.exclude` alert-dialog | Efekt uboczny komentarzy |
| `package.json`, `vitest.config.ts`, `tests/setup/` | Testing Library + happy-dom | Faza 3 testów |

### EventsMap – rozszerzenia UX

- `onHighlightEvent` – hover pin → podświetlenie kafelka na liście (F5 impl-review fix).
- `EventMapTooltip` + style `.discovery-map-tooltip` w `global.css`.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` – <commit sha>` when a step lands.

### Phase 1: Komponent kafelka i siatka w EventList

#### Automated

- [x] 1.1 `npm run check` przechodzi
- [x] 1.2 `npm run lint` przechodzi
- [x] 1.3 `npm run build` przechodzi

#### Manual

- [x] 1.4 Siatka kafelków na `/events` z wymaganymi polami i warunkowym biletem

### Phase 2: DiscoveryShell – układ pionowy, mapa, usunięcie podglądu

#### Automated

- [x] 2.1 `npm run check` przechodzi
- [x] 2.2 `npm run lint` przechodzi
- [x] 2.3 `npm run build` przechodzi
- [x] 2.4 Brak importów `EventPreviewCard` w `src/`

#### Manual

- [x] 2.5 Filtry|mapa obok na desktop; hover i klik pina; brak podglądu dolnego (układ – addendum)

### Phase 3: Testy i weryfikacja końcowa

#### Automated

- [x] 3.1 `npm run verify` przechodzi
- [x] 3.2 `npm test -- tests/unit/event-discovery-card.test.tsx` przechodzi

#### Manual

- [x] 3.3 Smoke test desktop + mobile; issue #38 gotowe do PR

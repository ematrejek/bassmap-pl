# Filtr „Pokaż tylko darmowe” — Implementation Plan

## Overview

Dodajemy filtr darmowych wydarzeń dla fana na stronie głównej `/`: parametr URL `free=1`, checkbox „Pokaż tylko darmowe” w panelu filtrów oraz `.eq("is_free", true)` w `listPublishedEvents`. Lista i mapa dostają ten sam przefiltrowany zestaw z SSR. Slice roadmapy **S-06** / change-id **`free-events-filter`**. **Bez migracji DB.**

## Current State Analysis

- **`FanEventFilters`** (`src/lib/events/fan-schema.ts`) — `city`, `subgenres`, `dateFrom`, `dateTo`; brak `freeOnly`.
- **`listPublishedEvents`** (`src/lib/services/events.ts` L146–179) — `published`, granice dat (`resolvePublishedDateBounds`), opcjonalnie miasto i OR podgatunków; **brak** filtra `is_free`.
- **`EventFilters.tsx`** — formularz `method="GET" action="/"`; sekcje Data, Miasto, Podgatunki; brak kontrolki darmowych.
- **`DiscoveryShell.tsx`** — `hasActiveFilters` = `city` / `subgenres` / `dateFrom`; copy wspomina datę, miasto, podgatunek.
- **`DateRangeFilter.tsx`** — `readLiveFiltersFromForm` czyta `city` i `subgenre` z formularza przy presetach; **nie** czyta przyszłego checkboxa `free`.
- **Baza** — `events.is_free boolean NOT NULL DEFAULT false` (`supabase/migrations/20260610100000_create_events.sql` L73).
- **Admin** — `EventForm.tsx` checkbox `isFree` („Wstęp wolny”); `formatEventPrice` zwraca „Wstęp wolny” gdy `isFree`.
- **Testy** — `tests/unit/fan-schema.test.ts` (daty + subgenre); `tests/integration/fan-read-list.test.ts` (oba fixture'y mają `is_free: true`).

### Key Discoveries

- S-05 (`date-range-filter`) zostawił w planie notkę, że przyszły slice może dodać `is_free` w URL — teraz to implementujemy.
- Filtr jest prosty boolean — nie wymaga nowego modułu helperów (w przeciwieństwie do `date-range.ts`).
- Checkbox GET jest wystarczający na MVP; shadcn `Switch` wymagałby ukrytego pola + JS bez realnego zysku SSR.
- Brak indeksu na `is_free` — akceptowalne przy małej liczbie eventów i istniejącym filtrze `starts_at`.

## Desired End State

1. URL: opcjonalnie `free=1`; inne wartości (`free=true`, `free=0`, `free=`) → traktowane jak brak filtra (wyłączone).
2. `FanEventFilters.freeOnly: boolean` — `true` tylko gdy URL ma dokładnie `free=1`.
3. Zapytanie: gdy `freeOnly`, dodaj `.eq("is_free", true)`; w przeciwnym razie bez zmian.
4. UI: checkbox z etykietą „Pokaż tylko darmowe” w `EventFilters`; `defaultChecked={currentFilters.freeOnly}`.
5. `buildFanFilterSearchParams` dodaje `free=1` gdy `freeOnly`.
6. `hasActiveFilters` uwzględnia `freeOnly`.
7. Presety dat zachowują stan checkboxa (aktualizacja `readLiveFiltersFromForm`).
8. CI: lint, build, testy zielone.

### Weryfikacja ręczna

- `/` — wszystkie nadchodzące (bez zmian).
- `/?free=1` — tylko wydarzenia z „Wstęp wolny” / `isFree: true`.
- Zaznacz checkbox → „Filtruj” → URL z `free=1` i zawężona lista.
- `/?city=…&subgenre=…&from=…&to=…&free=1` — AND wszystkich wymiarów.
- `/?free=bogus` — ignorowane; pełna lista.
- Klik preset „Dziś” przy zaznaczonym checkboxie — URL nadal z `free=1`.
- „Wyczyść filtry” — pełny reset (bez `free`).
- Mapa — te same pinezki co lista.

## What We're NOT Doing

- Migracja / nowe kolumny / indeks na `is_free`.
- Heurystyka „darmowe” z pola tekstowego `price` (np. „0 zł”) — tylko flaga `is_free`.
- Zmiana `listDistinctCities` pod kątem darmowych.
- Structured price / waluta (S-08).
- Mobile dropdown podgatunków (S-07).
- Publiczne API `GET /api/events`.
- Tłumaczenie UI na EN.
- Usunięcie wpisu z `src/data/public-roadmap.ts` — dopiero przy `/10x-archive`.
- shadcn `Switch` — checkbox wystarczy na MVP.

## Implementation Approach

Dwie fazy: (1) parser URL + filtr w serwisie + testy; (2) checkbox w UI + `hasActiveFilters` + zachowanie presetów dat. Zachować wzorzec SSR z S-02/S-05: submit formularza GET przeładowuje stronę z query string.

## Critical Implementation Details

### Parametr URL

| Param  | Wartość aktywna | Semantyka                                 |
| ------ | --------------- | ----------------------------------------- |
| `free` | `1`             | Pokaż tylko wydarzenia z `is_free = true` |

Walidacja w `parseFanFilters`:

```typescript
const freeOnly = searchParams.get("free") === "1";
```

Nie akceptujemy `true`, `yes` itd. — jeden kanoniczny format zgodny z checkboxem HTML.

### Zapytanie Supabase

W `listPublishedEvents`, po istniejących filtrach miasta/podgatunków:

```typescript
if (filters?.freeOnly) {
  query = query.eq("is_free", true);
}
```

Kolejność łańcuchowania `.eq` / `.or` nie ma znaczenia dla PostgREST przy tych filtrach.

### Formularz GET

```html
<label className="flex cursor-pointer items-center gap-2 …">
  <input
    type="checkbox"
    name="free"
    value="1"
    defaultChecked="{currentFilters.freeOnly}"
    className="size-4 rounded border-white/30 accent-purple-500"
  />
  <span>Pokaż tylko darmowe</span>
</label>
```

- Niezaznaczony checkbox **nie** wysyła pola `free` — parser zwraca `freeOnly: false`.
- Przycisk „Filtruj” submituje cały formularz (miasto, podgatunki, daty z ukrytych pól, opcjonalnie `free=1`).

### Presety dat a stan „darmowe”

`readLiveFiltersFromForm` w `DateRangeFilter.tsx` musi czytać checkbox:

```typescript
const freeOnly = formData.get("free") === "1";
```

I zwracać `freeOnly` w obiekcie `FanEventFilters`, żeby `buildFilterHref` / presety nie gubiły filtra.

---

## Phase 1: Schema URL i filtr w serwisie

### Overview

Logika `freeOnly` bez UI — po fazie można testować przez ręczne URL-e na dev serverze.

### Changes Required

#### 1. Rozszerzenie fan-schema

**File**: `src/lib/events/fan-schema.ts`

**Intent**: Typ i parser URL dla filtra darmowych.

**Contract**:

```typescript
export interface FanEventFilters {
  city: string | null;
  subgenres: Subgenre[];
  dateFrom: string | null;
  dateTo: string | null;
  freeOnly: boolean;
}
```

- `parseFanFilters`: `freeOnly = searchParams.get("free") === "1"`.
- `buildFanFilterSearchParams`: gdy `filters.freeOnly`, `params.set("free", "1")`.
- Zaktualizować wszystkie miejsca konstruujące `FanEventFilters` w testach (domyślnie `freeOnly: false`).

#### 2. Serwis listy

**File**: `src/lib/services/events.ts`

**Intent**: Zastosować filtr `is_free` w `listPublishedEvents`.

**Contract**: Gdy `filters?.freeOnly`, dodaj `.eq("is_free", true)`.

**Nie zmieniać**: `listDistinctCities`, `getPublishedEventById`.

#### 3. Testy jednostkowe

**File**: `tests/unit/fan-schema.test.ts`

**Intent**: Regresja parsera i round-trip URL.

**Contract** — przypadki:

| Test                                | Oczekiwanie                                 |
| ----------------------------------- | ------------------------------------------- |
| Brak `free`                         | `freeOnly: false`                           |
| `free=1`                            | `freeOnly: true`                            |
| `free=true` / `free=0` / `free=`    | `freeOnly: false`                           |
| Round-trip z `freeOnly: true`       | URL zawiera `free=1`; parse przywraca flagę |
| Kombinacja `city` + `free=1` + daty | wszystkie pola poprawnie                    |

#### 4. (Opcjonalnie) Fixture integracyjny

**File**: `tests/helpers/event-fixtures.ts`

**Intent**: Jeden z dwóch `published-upcoming` z `is_free: false` — umożliwia test integracyjny filtra.

**Contract**: Np. `published-upcoming-2` → `is_free: false`. Nowy test w `tests/integration/fan-read-list.test.ts`:

```typescript
const result = await listPublishedEvents(anonClient, {
  city: null,
  subgenres: [],
  dateFrom: null,
  dateTo: null,
  freeOnly: true,
});
// zwraca tylko wiersze z is_free true
```

**Uwaga**: opcjonalne — faza 1 jest kompletna bez tego, jeśli testy jednostkowe wystarczą.

### Success Criteria

#### Automated Verification

- `npm run lint`
- `npm run build`
- `npm test`

#### Manual Verification

- `/?free=1` na dev serverze — tylko eventy „Wstęp wolny” (wymaga co najmniej jednego płatnego w seed/fixture do porównania).
- `/?free=bogus` — pełna lista jak `/`.

**Implementation Note**: Po fazie 1 można commitować logikę bez widocznego UI (URL-only), ale pełny slice wymaga fazy 2.

---

## Phase 2: UI checkbox, copy i spójność presetów

### Overview

Widoczny przełącznik w panelu filtrów + poprawne zachowanie z presetami dat.

### Changes Required

#### 1. Checkbox w EventFilters

**File**: `src/components/discovery/EventFilters.tsx`

**Intent**: Fan włącza filtr darmowych w formularzu GET.

**Contract**:

- Sekcja po podgatunkach (lub przed przyciskami „Filtruj” / „Wyczyść”).
- Checkbox `name="free" value="1"` z etykietą „Pokaż tylko darmowe”.
- Krótka podpowiedź: `text-xs text-blue-100/50` — np. „Zostaw odznaczone, żeby zobaczyć też płatne wydarzenia.”

#### 2. Zachowanie presetów dat

**File**: `src/components/discovery/DateRangeFilter.tsx`

**Intent**: Presety i nawigacja kalendarza nie gubią `freeOnly`.

**Contract**: W `readLiveFiltersFromForm` dodać odczyt `formData.get("free") === "1"` → `freeOnly`.

#### 3. hasActiveFilters i copy

**File**: `src/components/discovery/DiscoveryShell.tsx`

**Intent**: Pusty stan listy i nagłówek uwzględniają filtr darmowych.

**Contract**:

```typescript
const hasActiveFilters =
  currentFilters.city !== null ||
  currentFilters.subgenres.length > 0 ||
  currentFilters.dateFrom !== null ||
  currentFilters.freeOnly;
```

- Opcjonalnie zaktualizować podtytuł: „… dacie, mieście, podgatunku **i cenie** …” lub „… oraz tylko darmowe”.

#### 4. (Opcjonalnie) PRD

**File**: `context/foundation/prd.md`

**Intent**: Dodać **FR-010** zgodnie z roadmapą.

**Contract**:

```markdown
- FR-010: Fan can filter the event list to free-entry events only (`is_free`). Priority: must-have (Partia I)
```

#### 5. Roadmap / GitHub (przy `/10x-implement`)

**Files**: `context/foundation/roadmap.md`, issue GitHub, project board

**Intent**: Utworzyć issue S-06 (brak numeru w tabeli Backlog Handoff), kolumna **In Progress** na projekcie 2 — **nie** w tej fazie planu, jeśli użytkownik nie startuje implementacji.

### Success Criteria

#### Automated Verification

- `npm run lint`
- `npm run build`
- `npm test`

#### Manual Verification

- Zaznacz checkbox → „Filtruj” → URL `free=1`, lista zawężona.
- Odznacz → „Filtruj” → brak `free` w URL, pełna lista.
- Preset „Dziś” przy zaznaczonym checkboxie — URL z `from`, `to` i `free=1`.
- „Wyczyść filtry” — reset do `/`.
- Kombinacja z miastem i datą — działa.
- Mapa — ta sama liczba pinezek co wierszy listy.
- Regresja: filtry bez checkboxa — bez zmian vs przed slice'em.

**Implementation Note**: Usunąć `free-events-filter` z `public-roadmap.ts` dopiero przy `/10x-archive`.

---

## Testing Strategy

### Unit Tests

- `parseFanFilters` / `buildFanFilterSearchParams` — `freeOnly` true/false, round-trip, kombinacje z datą/miastem.

### Integration Tests

- Opcjonalnie: rozszerzyć `event-fixtures.ts` + test w `fan-read-list.test.ts` dla `freeOnly: true`.
- Nie wymagane do zamknięcia slice'a, jeśli manual QA z seedem wystarczy.

### Manual Testing Steps

1. Otwórz `/` — liczba eventów jak przed zmianą.
2. `/?free=1` — tylko darmowe (porównaj z seedem).
3. Zaznacz checkbox, ustaw miasto, kliknij „Filtruj”.
4. Kliknij preset „W tym tygodniu” przy włączonym checkboxie — `free=1` w URL.
5. Sprawdź mapę — zgodność z listą.
6. „Wyczyść filtry” — pełny reset.

## Performance Considerations

- Dodatkowe `.eq("is_free", true)` na małym zbiorze — pomijalny koszt.
- Brak dodatkowego round-tripu — ten sam SSR co S-02/S-05.
- Brak nowych zależności npm.

## Migration Notes

- Brak migracji.
- Deploy: sam `wrangler deploy` po merge (bez `db push`).

## References

- Roadmap S-06: `context/foundation/roadmap.md`
- Wzorzec filtrów S-02: `context/archive/2026-06-11-fan-event-discovery/plan.md`
- Wzorzec dat S-05: `context/archive/2026-06-13-date-range-filter/plan.md`
- Kolumna `is_free`: `supabase/migrations/20260610100000_create_events.sql`
- Admin `isFree`: `src/components/admin/EventForm.tsx`
- Wyświetlanie ceny: `formatEventPrice` w `src/lib/events/format.ts`
- PRD FR-010 (propozycja): `context/foundation/roadmap.md` § S-06

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Schema URL i filtr w serwisie

#### Automated

- [x] 1.1 `fan-schema.ts` — `freeOnly`, parse + build
- [x] 1.2 `listPublishedEvents` — `.eq("is_free", true)` gdy `freeOnly`
- [x] 1.3 `npm run lint` przechodzi
- [x] 1.4 `npm run build` przechodzi
- [x] 1.5 `npm test` — rozszerzone `fan-schema`
- [x] 1.6 (Opcjonalnie) fixture + test integracyjny `freeOnly`

#### Manual

- [x] 1.7 Ręczny URL `/?free=1` na dev serverze — tylko darmowe eventy

### Phase 2: UI checkbox, copy i spójność presetów

#### Automated

- [x] 2.1 `EventFilters.tsx` — checkbox „Pokaż tylko darmowe”
- [x] 2.2 `DateRangeFilter.tsx` — `readLiveFiltersFromForm` z `freeOnly`
- [x] 2.3 `DiscoveryShell.tsx` — `hasActiveFilters` + opcjonalny copy
- [x] 2.4 `npm run lint` przechodzi
- [x] 2.5 `npm run build` przechodzi
- [x] 2.6 `npm test` — pełna regresja

#### Manual

- [x] 2.7 Checkbox + „Filtruj” / „Wyczyść” — URL i lista OK
- [x] 2.8 Preset dat przy włączonym checkboxie — `free=1` zachowane
- [x] 2.9 Mapa zgodna z listą przy `free=1`

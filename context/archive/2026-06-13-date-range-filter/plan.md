# Filtr dat w odkrywaniu — Implementation Plan

## Overview

Dodajemy filtr dat dla fana na stronie głównej `/`: parametry URL `from` / `to` (daty kalendarzowe Europe/Warsaw), presety „Dziś”, „W tym tygodniu”, „W tym miesiącu”, kalendarz do ręcznego wyboru dnia lub zakresu oraz filtrowanie w `listPublishedEvents`. Lista i mapa dostają ten sam przefiltrowany zestaw z SSR. Slice roadmapy **S-05** / change-id **`date-range-filter`**. **Bez migracji DB.**

## Current State Analysis

- **`FanEventFilters`** (`src/lib/events/fan-schema.ts`) — `city`, `subgenres`; `parseFanFilters` / `buildFanFilterSearchParams` bez dat.
- **`listPublishedEvents`** (`src/lib/services/events.ts` L145–172) — `.eq("status","published")`, `.gte("starts_at", getStartOfTodayWarsawUtcIso())`, opcjonalnie miasto i OR podgatunków.
- **`EventFilters.tsx`** — formularz `method="GET" action="/"`; miasto + checkboxy; „Wyczyść” → `href="/"`.
- **`DiscoveryShell.tsx`** — `hasActiveFilters` tylko `city` / `subgenres`; copy bez wzmianki o dacie.
- **`format.ts`** — `getStartOfTodayWarsawUtcIso()`, `parseDatetimeLocalWarsaw()` — baza do granic dnia w Warsaw.
- **RLS** — `is_upcoming(starts_at)` używa `(starts_at AT TIME ZONE 'Europe/Warsaw')::date` (`supabase/migrations/20260610100000_create_events.sql` L129–136). Lesson: serwis i tak filtruje jawne `published` + nadchodzące (`context/foundation/lessons.md`).
- **UI** — brak `calendar`, `popover` w `src/components/ui/`; shadcn skonfigurowany (`components.json`).
- **Testy** — `tests/unit/fan-schema.test.ts` (2 przypadki); `tests/unit/event-format.test.ts` dla datetime-local.

### Key Discoveries

- S-02 świadomie odłożył FR-008 (`context/archive/2026-06-11-fan-event-discovery/plan.md` L49) — teraz implementujemy na gotowym discovery.
- Indeks `events_starts_at_idx` — filtr zakresu dat korzysta z istniejącego indeksu; bez zmian schematu.
- `index.astro` już woła `parseFanFilters` + `listPublishedEvents` — wystarczy rozszerzyć typ i serwis; strona Astro bez nowych propsów poza szerszym `currentFilters`.
- Presety mogą być zwykłymi linkami GET (SSR-friendly); kalendarz wymaga małego islandu React wewnątrz już hydratowanego `DiscoveryShell` (`client:load`).

## Desired End State

1. URL: opcjonalnie `from=YYYY-MM-DD` i `to=YYYY-MM-DD` (oba w strefie kalendarzowej Warsaw; nieprawidłowe → ignorowane).
2. Jeden dzień: `from` bez `to` traktowane jako `to = from`; lub jawne `from=…&to=…` ten sam dzień.
3. Gdy `from > to` po parsowaniu — zamiana miejscami (normalizacja).
4. Zapytanie: wydarzenia z `starts_at` w **[effectiveStart, endExclusive)** gdzie:
   - `effectiveStart = max(startOfDay(from), startOfTodayWarsaw)` w UTC,
   - `endExclusive = startOfDay(dayAfter(to))` w UTC.
5. Brak parametrów daty — zachowanie jak dziś (wszystkie nadchodzące od początku dziś).
6. UI: sekcja „Data” w `EventFilters` — trzy presety + przycisk otwierający kalendarz (range mode); ukryte `<input name="from">` / `<input name="to">`.
7. `hasActiveFilters` uwzględnia aktywny zakres dat (gdy `from` ustawione).
8. Lista pusta z aktywnymi filtrami — istniejący komunikat w `EventList`.
9. CI: lint, build, testy zielone.

### Weryfikacja ręczna

- `/` — wszystkie nadchodzące (bez zmian).
- `?from=<dziś>&to=<dziś>` — tylko dzisiejsze (wg kalendarza Warsaw).
- `?from=<za tydzień>&to=<za 2 tygodnie>` — przyszły zakres.
- Preset „W tym tygodniu” — URL z pon–ndz bieżącego tygodnia ISO; lista się zawęża.
- `?from=2020-01-01&to=2020-01-31` — pusta lista (przeszłość).
- `?from=not-a-date` — ignorowane; jak brak filtra daty.
- Kombinacja: `city` + `subgenre` + `from`/`to` — AND między filtrami.
- Mapa — te same pinezki co lista po filtrze.

## What We're NOT Doing

- Migracja / nowe kolumny w Postgres.
- Pokazywanie przeszłych wydarzeń (archiwum = S-10 / Partia II).
- Filtr „tylko darmowe” (S-06) — osobny slice; plan nie blokuje przyszłego `is_free` w URL.
- Zmiana `listDistinctCities` pod kątem daty.
- Publiczne API `GET /api/events`.
- Tłumaczenie UI na EN.
- Usunięcie wpisu z `src/data/public-roadmap.ts` — dopiero przy `/10x-archive`.

## Implementation Approach

Dwie fazy: (1) parser URL + helpery granic UTC + filtr w serwisie + testy; (2) shadcn Calendar/Popover + `DateRangeFilter` + integracja w formularzu. Zachować wzorzec SSR z S-02: submit formularza GET przeładowuje stronę z query string.

## Critical Implementation Details

### Parametry URL

| Param  | Format       | Semantyka                                           |
| ------ | ------------ | --------------------------------------------------- |
| `from` | `YYYY-MM-DD` | Pierwszy dzień zakresu (włącznie), kalendarz Warsaw |
| `to`   | `YYYY-MM-DD` | Ostatni dzień zakresu (włącznie); opcjonalny        |

Walidacja: regex `^\d{4}-\d{2}-\d{2}$` + sensowna data (`Date` nie NaN po złożeniu z `T12:00:00` w UTC lub przez `parseDatetimeLocalWarsaw` z `T00:00`).

### Presety (Warsaw „teraz”)

Obliczane w `src/lib/events/date-range.ts` względem bieżącego momentu (parametr `referenceDate?: Date` na potrzeby testów):

| Preset             | `from`                              | `to`                    |
| ------------------ | ----------------------------------- | ----------------------- |
| **Dziś**           | dzisiejsza data Warsaw              | ta sama                 |
| **W tym tygodniu** | poniedziałek bieżącego tygodnia ISO | niedziela tego tygodnia |
| **W tym miesiącu** | 1. dzień miesiąca                   | ostatni dzień miesiąca  |

ISO tydzień: poniedziałek = start. Użyj `Intl` / ręcznej arytmetyki na datach kalendarzowych Warsaw (nie `Date.getDay()` w UTC).

### Granice zapytania Supabase

```typescript
// Pseudokod — implementacja w date-range.ts
function resolvePublishedDateBounds(filters: FanEventFilters): { gte: string; lt?: string } {
  const todayStart = getStartOfTodayWarsawUtcIso();
  if (!filters.dateFrom) {
    return { gte: todayStart };
  }
  const from = filters.dateFrom;
  const to = filters.dateTo ?? from;
  const rangeStart = startOfWarsawCalendarDayUtcIso(from);
  const gte = rangeStart < todayStart ? todayStart : rangeStart;
  const lt = startOfWarsawCalendarDayUtcIso(addCalendarDays(to, 1));
  return { gte, lt };
}
```

W `listPublishedEvents`:

```typescript
const { gte, lt } = resolvePublishedDateBounds(filters ?? {});
let query = supabase.from("events").select("*").eq("status", "published").gte("starts_at", gte);
if (lt) query = query.lt("starts_at", lt);
```

Gdy brak `dateFrom` — **nie** dodawaj `.lt()` (wszystkie przyszłe od dziś).

### Formularz GET a kalendarz

- Zachować istniejące `name="city"` i `name="subgenre"`.
- Dodać ukryte pola `from`, `to` — wypełniane przez `DateRangeFilter` przed submitem.
- Presety: `<a href={buildUrl({ ...currentFilters, preset })}>` lub `Button asChild` — nawigacja pełna (nie wymaga submit).
- Przycisk „Filtruj” submituje form z aktualnym zakresem z kalendarza.
- „Wyczyść filtry” — `href="/"` (już czyści wszystko).

### shadcn Calendar

```bash
npx shadcn@latest add calendar popover
```

Styl pod ciemny panel filtrów (`border-white/10`, `text-white`) — dopasować klasy w `DateRangeFilter` / override w `calendar.tsx` jeśli potrzeba.

Tryb: `mode="range"` (react-day-picker v9 API — sprawdzić wersję po instalacji).

---

## Phase 1: Schema URL, helpery dat i filtr w serwisie

### Overview

Logika dat bez UI — po fazie można testować przez ręczne URL-e na dev serverze.

### Changes Required

#### 1. Moduł zakresów dat

**File**: `src/lib/events/date-range.ts` (nowy)

**Intent**: Jedno miejsce na presety, walidację `YYYY-MM-DD` i konwersję na granice UTC.

**Contract**:

- `CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/`
- `isValidCalendarDate(value: string): boolean`
- `getWarsawCalendarDate(reference?: Date): string` — dziś jako `YYYY-MM-DD`
- `getWarsawDatePresetRange(preset: "today" | "week" | "month", reference?: Date): { from: string; to: string }`
- `startOfWarsawCalendarDayUtcIso(yyyyMmDd: string): string | null` — delegacja do `parseDatetimeLocalWarsaw(\`${yyyyMmDd}T00:00\`)`
- `resolvePublishedDateBounds(filters: Pick<FanEventFilters, "dateFrom" | "dateTo">): { gte: string; lt?: string }`

#### 2. Rozszerzenie fan-schema

**File**: `src/lib/events/fan-schema.ts`

**Intent**: Typ i parser URL dla dat.

**Contract**:

```typescript
export interface FanEventFilters {
  city: string | null;
  subgenres: Subgenre[];
  dateFrom: string | null; // YYYY-MM-DD Warsaw calendar
  dateTo: string | null;
}
```

- `parseFanFilters`: czytaj `from`, `to`; waliduj przez `isValidCalendarDate`; jeśli tylko `from` → `dateTo = dateFrom`; jeśli oba i `from > to` → swap.
- `buildFanFilterSearchParams`: `params.set("from", …)`, `params.set("to", …)` gdy ustawione (oba przy jednym dniu — jawne `from` i `to` dla czytelności URL).

#### 3. Serwis listy

**File**: `src/lib/services/events.ts`

**Intent**: Zastosować granice dat w `listPublishedEvents`.

**Contract**: Import `resolvePublishedDateBounds`; zastąpić sztywne `getStartOfTodayWarsawUtcIso()` logiką z helpera; dodać `.lt("starts_at", lt)` gdy `lt` zdefiniowane.

**Nie zmieniać**: `listDistinctCities`, `getPublishedEventById` (poza zakresem).

#### 4. Testy jednostkowe

**Files**: `tests/unit/fan-schema.test.ts`, `tests/unit/date-range.test.ts` (nowy)

**Intent**: Regresja parsera i presetów.

**Contract** — przykładowe przypadki:

| Test                                            | Oczekiwanie                          |
| ----------------------------------------------- | ------------------------------------ |
| Brak parametrów                                 | `dateFrom: null`, `dateTo: null`     |
| `from=2026-06-15`                               | `dateFrom` i `dateTo` = `2026-06-15` |
| `from=2026-06-20&to=2026-06-10`                 | po swap: `from` 10, `to` 20          |
| `from=invalid`                                  | oba null                             |
| Preset „today” z `vi.setSystemTime`             | znane `from`/`to`                    |
| Preset „week” w środku tygodnia                 | pon–ndz ISO                          |
| Preset „month” w lutym non-leap                 | `to` = 28 lub 29                     |
| `resolvePublishedDateBounds` z przeszłym `from` | `gte` = start dziś (mock today)      |
| `resolvePublishedDateBounds` z `to`             | `lt` = start następnego dnia po `to` |

Użyć `vi.setSystemTime` + `vi.useFakeTimers` w `date-range.test.ts`; przy testach DST rozważyć jeden przypadek graniczny (opcjonalnie).

### Success Criteria

#### Automated Verification

- `npm run lint`
- `npm run build`
- `npm test` — `fan-schema` + `date-range`

#### Manual Verification

- Dev server: `/?from=<jutro>&to=<jutro>` zwraca oczekiwany podzbiór (porównać z Supabase Studio / seed).

**Implementation Note**: Po Fazie 1 UI nadal bez kalendarza — test przez ręczne URL.

---

## Phase 2: UI kalendarza, presetów i copy

### Overview

Widoczny filtr dat w panelu odkrywania; presety i kalendarz zsynchronizowane z URL.

### Changes Required

#### 1. Komponenty shadcn

**Files**: `src/components/ui/calendar.tsx`, `src/components/ui/popover.tsx` (+ zależność `react-day-picker`)

**Intent**: Kalendarz zgodny z design system.

**Contract**: Instalacja przez `npx shadcn@latest add calendar popover`; dopasować kolory do ciemnego tła filtrów.

#### 2. DateRangeFilter

**File**: `src/components/discovery/DateRangeFilter.tsx` (nowy)

**Intent**: Presety + picker zakresu; synchronizacja z `currentFilters` i ukrytymi inputami formularza.

**Contract**:

- Props: `currentFilters: FanEventFilters`, opcjonalnie `formId` jeśli potrzebne.
- Trzy presety jako linki budowane przez `buildFanFilterSearchParams` (+ zachowanie `city`, `subgenres`).
- Popover + Calendar `mode="range"`; wybrany zakres → ustawia wartości ukrytych `<input type="hidden" name="from" value="…">` i `name="to"`.
- Etykieta przycisku: np. „Wybierz datę” / zakres sformatowany po polsku (`pl-PL`, Warsaw) gdy wybrany.
- Przycisk „Wyczyść datę” (link lub reset ukrytych pól) — usuwa tylko `from`/`to` z URL, zachowuje inne filtry.

#### 3. EventFilters

**File**: `src/components/discovery/EventFilters.tsx`

**Intent**: Wpiąć sekcję daty nad miastem lub pod podgatunkami (rekomendacja: **nad miastem** — hierarchia: kiedy → gdzie → co).

**Contract**:

- Import `DateRangeFilter`.
- Sekcja z `Label` „Data”.
- Formularz nadal `method="GET"` — ukryte pola wewnątrz `DateRangeFilter`.

#### 4. DiscoveryShell

**File**: `src/components/discovery/DiscoveryShell.tsx`

**Intent**: Spójny stan „aktywne filtry” i copy.

**Contract**:

```typescript
const hasActiveFilters =
  currentFilters.city !== null || currentFilters.subgenres.length > 0 || currentFilters.dateFrom !== null;
```

- Opcjonalnie zaktualizować podtytuł: „… miasto, podgatunek i dacie …”.

#### 5. (Opcjonalnie) PRD

**File**: `context/foundation/prd.md`

**Intent**: Elevacja FR-008 do must-have (Partia I) — zgodnie z roadmapą.

**Contract**: Zmienić priority FR-008; krótka notka w Socrates block o elevacji z nice-to-have.

#### 6. Roadmap / GitHub (przy `/10x-implement`)

**Files**: `context/foundation/roadmap.md`, issue GitHub

**Intent**: Issue S-05 (#TBD), kolumna **In Progress** na projekcie 2 — **nie** w tej fazie planu, jeśli użytkownik nie startuje implementacji.

### Success Criteria

#### Automated Verification

- `npm run lint`
- `npm run build`
- `npm test`

#### Manual Verification

- Preset „Dziś” — URL i lista OK.
- Kalendarz: wybór jednego dnia → submit → URL i wyniki.
- Kalendarz: zakres kilku dni → działa.
- „Wyczyść filtry” — pełny reset.
- „Wyczyść datę” (jeśli osobny) — miasto/podgatunek zostają.
- Mobile: kalendarz w Popover mieści się na ekranie.
- Regresja: miasto + podgatunek bez daty — bez zmian.

**Implementation Note**: Usunąć `date-range-filter` z `public-roadmap.ts` dopiero przy `/10x-archive`.

---

## Testing Strategy

### Unit Tests

- `parseFanFilters` / `buildFanFilterSearchParams` — round-trip dla dat.
- `getWarsawDatePresetRange` — zamrożony czas.
- `resolvePublishedDateBounds` — dolna clamp do dziś, górna granica exclusive.

### Integration Tests

- Nie wymagane na MVP — istniejące testy fan-read w `tests/` mogą zostać bez rozszerzenia; opcjonalny smoke w przyszłym rollout test-plan.

### Manual Testing Steps

1. Otwórz `/` — liczba eventów jak przed zmianą.
2. Kliknij „Dziś” — tylko dzisiejsze (jeśli są w seed).
3. Ustaw zakres obejmujący znaną datę z seed — jeden konkretny event widoczny.
4. Połącz z `?city=…`.
5. Sprawdź mapę — ta sama liczba pinezek co wierszy listy.

## Performance Considerations

- Filtr `.gte` + `.lt` na `starts_at` używa `events_starts_at_idx`.
- Brak dodatkowego round-tripu — ten sam SSR co S-02.
- react-day-picker ładowany w już hydratowanym `DiscoveryShell` — akceptowalny koszt na MVP.

## Migration Notes

- Brak migracji.
- Deploy: sam `wrangler deploy` po merge (bez `db push`).

## References

- Roadmap S-05: `context/foundation/roadmap.md`
- Wzorzec filtrów S-02: `context/archive/2026-06-11-fan-event-discovery/plan.md`
- Lesson fan read: `context/foundation/lessons.md`
- Helpery czasu: `src/lib/events/format.ts`
- PRD FR-008: `context/foundation/prd.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Schema URL, helpery dat i filtr w serwisie

#### Automated

- [x] 1.1 `src/lib/events/date-range.ts` — presety, walidacja, `resolvePublishedDateBounds`
- [x] 1.2 `fan-schema.ts` — `dateFrom` / `dateTo`, parse + build
- [x] 1.3 `listPublishedEvents` — granice dat w zapytaniu
- [x] 1.4 `npm run lint` przechodzi
- [x] 1.5 `npm run build` przechodzi
- [x] 1.6 `npm test` — `fan-schema` + `date-range`

#### Manual

- [x] 1.7 Ręczny URL `?from=&to=` na dev serverze — oczekiwany podzbiór eventów

### Phase 2: UI kalendarza, presetów i copy

#### Automated

- [x] 2.1 shadcn `calendar` + `popover` zainstalowane
- [x] 2.2 `DateRangeFilter.tsx` + integracja w `EventFilters.tsx`
- [x] 2.3 `DiscoveryShell` — `hasActiveFilters` + copy
- [x] 2.4 `npm run lint` przechodzi
- [x] 2.5 `npm run build` przechodzi
- [x] 2.6 `npm test` przechodzi

#### Manual

- [x] 2.7 Presety dziś / tydzień / miesiąc — URL + lista + mapa
- [x] 2.8 Kalendarz — jeden dzień i zakres; submit formularza
- [x] 2.9 Wyczyść filtry / wyczyść datę; regresja miasto + podgatunek
- [x] 2.10 (Opcjonalnie) PRD FR-008 elevated

# Filtr dat — Plan Brief

> Full plan: `context/archive/2026-06-13-date-range-filter/plan.md`

## What & Why

Fan na stronie głównej (`/`) może zawęzić listę i mapę do **konkretnego dnia lub zakresu dat** — ręcznie w kalendarzu albo jednym kliknięciem („Dziś”, „W tym tygodniu”, „W tym miesiącu”). To **gwiazda przewodnia Partii I** roadmapy: pierwszy duży krok w filtrach odkrywania po S-02 (miasto + podgatunek).

## Starting Point

- `FanEventFilters` (`src/lib/events/fan-schema.ts`) — tylko `city` i `subgenres`; URL `?city=…&subgenre=…`.
- `listPublishedEvents` (`src/lib/services/events.ts`) — zawsze `status = published` + `starts_at >= początek dziś (Warszawa)`; brak górnej granicy daty.
- `EventFilters.tsx` — formularz GET z miastem i checkboxami podgatunków; brak UI daty.
- `getStartOfTodayWarsawUtcIso()` / `parseDatetimeLocalWarsaw()` w `src/lib/events/format.ts` — gotowe helpery strefy Warsaw.
- Brak komponentu kalendarza w `src/components/ui/` (trzeba dodać shadcn `calendar` + `popover`).
- Testy: `tests/unit/fan-schema.test.ts` (city/subgenre); wzorzec czasu: `tests/unit/event-format.test.ts`.

## Desired End State

1. URL może zawierać `from=YYYY-MM-DD` i opcjonalnie `to=YYYY-MM-DD` (daty kalendarzowe w Warszawie).
2. Presety ustawiają te same parametry w URL (udostępnialne linki).
3. Lista i mapa pokazują tylko wydarzenia, których `starts_at` wpada w wybrany zakres kalendarzowy (Warszawa), nadal tylko **nadchodzące** (dolna granica nie wcześniej niż dziś).
4. Kalendarz w panelu filtrów: wybór jednego dnia lub zakresu; przyciski presetów obok.
5. „Wyczyść filtry” usuwa też daty; pusty stan = jak dziś (wszystkie nadchodzące).
6. `npm run lint`, `npm run build`, `npm test` — zielone.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Parametry URL | `from` + `to` (`YYYY-MM-DD`) | Spójne z formularzem GET; jeden dzień = `from=to` | Plan |
| Strefa czasu | Europe/Warsaw | Jak RLS `is_upcoming` i istniejące helpery formatu | Roadmap unknown |
| Tydzień (preset) | Poniedziałek–niedziela bieżącego tygodnia ISO w Warszawie | Naturalne „w tym tygodniu” w PL | Plan |
| Miesiąc (preset) | 1.–ostatni dzień bieżącego miesiąca kalendarzowego w Warszawie | „W tym miesiącu” bez magii „30 dni” | Plan |
| Dolna granica zapytania | `max(zakres od użytkownika, dziś)` | Produkt nadal pokazuje tylko nadchodzące eventy | Lesson fan read |
| Górna granica | Półotwarty przedział: `starts_at < początek dnia po `to`` | Włącza cały ostatni dzień zakresu | Plan |
| UI kalendarza | shadcn Calendar + Popover (react-day-picker) | Roadmap wymaga kalendarza; spójne z shadcn w projekcie | Plan |
| Presety | Linki/nawigacja GET z wyliczonym `from`/`to` | Działa bez JS; zgodne z SSR | Plan |
| Migracja DB | Brak | Filtr na `starts_at` — kolumna już jest | Codebase |
| Lista miast | Bez zmiany (wszystkie miasta z nadchodzących) | YAGNI — dropdown miast bez filtra daty na MVP | Plan |

## Scope

**In scope:** rozszerzenie `fan-schema`, helpery zakresu dat, filtr w `listPublishedEvents`, UI kalendarza + presetów, `hasActiveFilters`, testy jednostkowe parsera i presetów, opcjonalna notka PRD FR-008.

**Out of scope:** filtr „tylko darmowe” (S-06), mobile dropdown podgatunków (S-07), archiwum przeszłych eventów, osobne API GET, paginacja, filtrowanie `listDistinctCities` po dacie, i18n EN.

## Architecture / Approach

Rozszerzenie istniejącego przepływu SSR: **URL → `parseFanFilters` → `listPublishedEvents` → `DiscoveryShell`**. Nowy moduł `date-range.ts` liczy granice UTC z dat kalendarzowych Warsaw. UI: `DateRangeFilter` (React) w `EventFilters` z ukrytymi polami `from`/`to` w formularzu GET.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Filtr w danych | Schema URL, helpery dat, zapytanie Supabase, testy | Błędne granice UTC przy DST |
| 2. UI odkrywania | Kalendarz, presety, copy, `hasActiveFilters` | Formularz GET nie przenosi dat |

**Prerequisites:** S-02 done; Vitest skonfigurowany.

**Estimated effort:** ~1 sesja, 2 fazy.

## Open Risks & Assumptions

- Assumption: fan nie oczekuje przeszłych eventów w zakresie — zakres w przeszłości zwraca pustą listę (dolna granica = dziś).
- Assumption: `listDistinctCities` bez filtra daty jest akceptowalne na MVP.
- Risk: DST — testy z `vi.setSystemTime` na datach granicznych (marzec/listopad).

## Success Criteria (Summary)

- `/?from=2026-06-13&to=2026-06-13` pokazuje tylko eventy z tego dnia (Warszawa).
- Presety „Dziś / Tydzień / Miesiąc” ustawiają URL i filtrują listę + mapę.
- Nieprawidłowe daty w URL są ignorowane (jak bogus subgenre).
- Lint, build, testy przechodzą.

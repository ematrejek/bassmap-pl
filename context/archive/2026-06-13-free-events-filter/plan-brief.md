# Filtr „Pokaż tylko darmowe” — Plan Brief

> Full plan: `context/changes/free-events-filter/plan.md`

## What & Why

Fan na stronie głównej (`/`) może włączyć **„Pokaż tylko darmowe”** i zobaczyć na liście i mapie wyłącznie wydarzenia oznaczone przez admina jako bezpłatne (`is_free = true`). Filtr działa razem z istniejącymi filtrami daty, miasta i podgatunku — to kolejny mały, samodzielny slice Partii I (S-06).

## Starting Point

- `FanEventFilters` (`src/lib/events/fan-schema.ts`) — `city`, `subgenres`, `dateFrom`, `dateTo`; brak flagi darmowych.
- `listPublishedEvents` (`src/lib/services/events.ts`) — filtruje `published`, datę, miasto, podgatunki; **nie** filtruje `is_free`.
- `EventFilters.tsx` — formularz GET z datą, miastem, checkboxami podgatunków; brak przełącznika darmowych.
- `DiscoveryShell.tsx` — `hasActiveFilters` bez `freeOnly`.
- `DateRangeFilter.tsx` — presety dat nawigują przez `readLiveFiltersFromForm` (czyta miasto/podgatunki z formularza; trzeba dodać stan checkboxa `free`).
- Baza: kolumna `is_free` od foundation; admin ustawia w `EventForm.tsx` (checkbox „Wstęp wolny”).
- Testy: `tests/unit/fan-schema.test.ts` (parser URL); integracja `fan-read-list.test.ts` (bez filtra `is_free`).

## Desired End State

1. URL może zawierać `free=1` — wtedy lista i mapa pokazują tylko darmowe wydarzenia.
2. Brak parametru lub nieprawidłowa wartość — jak dziś (wszystkie nadchodzące, niezależnie od ceny).
3. Checkbox „Pokaż tylko darmowe” w panelu filtrów; submit formularza GET ustawia/usuwa parametr.
4. Presety dat (i inna nawigacja z `DateRangeFilter`) **zachowują** stan przełącznika darmowych.
5. `hasActiveFilters` uwzględnia `freeOnly`.
6. Kombinacja: `city` + `subgenre` + `from`/`to` + `free=1` — AND między filtrami.
7. `npm run lint`, `npm run build`, `npm test` — zielone.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Parametr URL | `free=1` | Krótki, czytelny w GET; checkbox HTML `name="free" value="1"` | Plan |
| Semantyka parsera | Tylko `free=1` aktywuje filtr | Unikamy niejednoznaczności (`true`, `yes`, puste) | Plan |
| Pole w typie | `freeOnly: boolean` (domyślnie `false`) | Prostsze niż `null`; brak parametru = wyłączone | Plan |
| Zapytanie DB | `.eq("is_free", true)` gdy `freeOnly` | Bezpośrednio na istniejącej kolumnie | Roadmap |
| UI | Checkbox w formularzu GET (jak podgatunki) | Działa bez JS przy „Filtruj”; spójne z SSR S-02/S-05 | Plan |
| shadcn Switch | Nie na MVP | Checkbox wystarczy; roadmap mówi „przełącznik” — copy PL, kontrolka może być checkbox ze stylami | Plan |
| `listDistinctCities` | Bez zmiany | YAGNI — dropdown miast bez filtra darmowych na MVP | Plan |
| Migracja DB | Brak | `is_free` już jest | Codebase |
| Indeks DB | Brak | Niski wolumen MVP; filtr łączy się z `starts_at` / `status` | Plan |

## Scope

**In scope:** rozszerzenie `fan-schema`, filtr w `listPublishedEvents`, checkbox w `EventFilters`, `hasActiveFilters`, aktualizacja `readLiveFiltersFromForm`, testy jednostkowe parsera, opcjonalna notka PRD FR-010.

**Out of scope:** structured price (S-08), mobile dropdown podgatunków (S-07), filtrowanie po cenie tekstowej/heurystyka „0 zł”, osobne API GET, paginacja, filtrowanie `listDistinctCities`, i18n EN, usunięcie wpisu z `public-roadmap.ts` (przy archive).

## Architecture / Approach

Rozszerzenie istniejącego przepływu SSR: **URL → `parseFanFilters` → `listPublishedEvents` → `DiscoveryShell`**. Jedna nowa flaga boolean w typie i jedna linia w zapytaniu Supabase. UI: checkbox w istniejącym formularzu GET.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Filtr w danych | Schema URL, zapytanie Supabase, testy parsera | Zapomnienie `.eq("is_free")` przy kombinacji filtrów |
| 2. UI odkrywania | Checkbox, `hasActiveFilters`, zachowanie presetów dat | Preset dat gubi stan „tylko darmowe” |

**Prerequisites:** S-02 done; S-05 done (filtr dat — `FanEventFilters` już rozszerzony).

**Estimated effort:** ~1 sesja, 2 fazy (mniejszy niż S-05).

## Open Risks & Assumptions

- Assumption: admin poprawnie ustawia `is_free` w formularzu — jakość danych poprawi S-08, ale nie blokuje tego slice'a.
- Assumption: fan rozumie „darmowe” jako `is_free`, nie „cena = 0 zł” w polu tekstowym `price`.
- Risk: oba fixture'y integracyjne mają `is_free: true` — test integracyjny filtra wymaga rozszerzenia fixture'ów (opcjonalnie w fazie 1).

## Success Criteria (Summary)

- `/?free=1` pokazuje tylko wydarzenia z `isFree: true`.
- `/?city=Warszawa&free=1` — AND miasto + darmowe.
- Checkbox + „Filtruj” ustawia URL; „Wyczyść filtry” resetuje wszystko.
- Preset „Dziś” przy włączonym checkboxie darmowych — URL zawiera `free=1`.
- Lint, build, testy przechodzą.

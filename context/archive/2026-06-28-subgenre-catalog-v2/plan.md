# Katalog podgatunków v2 – Implementation Plan

## Overview

Slice roadmapy **S-29** (`change-id`: **`subgenre-catalog-v2`**). Zastępujemy 26-pozycyjny katalog UI **13 pozycjami** uzgodnionymi z produktem. Enum Postgres **pozostaje nadzbiórem** (stare wartości zostają w typie SQL); aplikacja wprowadza warstwę **aktywnego katalogu** do selektorów, walidacji zapisu i wyświetlania badge'ów.

**Kluczowa zasada:** zero destrukcyjnych migracji danych. Stare tagi w wierszach `events`, `fan_profiles`, `crews` nie są kasowane – **znikają tylko z UI** (filtry, formularze, etykiety na kartach). Pięć nowych identyfikatorów (`garage`, `bassline`, `dubstep`, `bass_house`, `bounce`) dodajemy przez `ALTER TYPE … ADD VALUE IF NOT EXISTS` – wzorzec jak `20260611120000_add_dancefloor_subgenre.sql`.

## Current State Analysis

- **`src/types.ts`** – `Subgenre` (union 26+ wartości), `SUBGENRES` (pełna lista do formularzy), `SUBGENRE_LABELS`. Komentarz: 1:1 z enumem Postgres.
- **Enum SQL** – `public.subgenre` w `20260610100000_create_events.sql` (25) + `dancefloor` w `20260611120000_add_dancefloor_subgenre.sql` → **26 wartości**.
- **Walidacja zapisu** – `z.enum(SUBGENRES)` w:
  - `src/lib/events/schema.ts` (create/update event)
  - `src/lib/fan/profile-schema.ts` (favoriteSubgenres, max 5)
  - `src/lib/fan/crew-schema.ts` (subgenres, max 5)
- **Filtry URL** – `src/lib/events/fan-schema.ts`: `isSubgenre()` sprawdza `SUBGENRE_SET` z `SUBGENRES`; nieznane parametry URL są **cicho odrzucane** (test `fan-schema.test.ts` 3a).
- **Wyświetlanie** – bez filtrowania legacy; wszędzie `SUBGENRE_LABELS[subgenre]`:
  - `EventCardSubgenreBadges.tsx`, `EventsMap.tsx`, `events/[id].astro`
  - `ProfileView.tsx`, `ProfileEventCard.tsx`, `ArchiveEventList.tsx`
  - `CrewDashboard.tsx` (reuse badge)
- **Formularze wyboru** – iteracja `SUBGENRES.map`:
  - `SubgenreFilter.tsx` (lista + mobile popover)
  - `EventForm.tsx` (admin + fan)
  - `ProfileEditor.tsx`, `CrewForm.tsx`
  - `DateRangeFilter.tsx` – lokalna kopia `isSubgenre` z `SUBGENRES`
- **Sugestie zmian** – `EventSuggestChangesForm.tsx` **nie ma** pola podgatunków; `suggestion-schema.ts` nie przekazuje `subgenres` (whitelist kluczy bez `subgenres`). W scope tej zmiany: **dodać** pole.
- **Testy** – liczne fixture'y z `liquid_dnb`, `neurofunk`, `jump_up` itd.; testy schematu odrzucają `not_a_real_genre`. Brak testu „legacy ukryte w UI”.

### Key Discoveries

- Pojedyncze źródło prawdy (`SUBGENRES`) steruje formularzami i URL – wystarczy wydzielić **aktywny** katalog + helper filtrujący, bez dotykania mapperów DB.
- CHECK `events_subgenres_min_one` – event z samymi legacy tagami **nadal spełnia** constraint; nie wymaga naprawy danych.
- Renaming etykiet (`Liquid`, `Hardcore`, `Trance`) to tylko `SUBGENRE_LABELS`; identyfikatory DB bez zmian (`liquid_dnb`, `hardcore_oldschool`, `trancestep`).
- 13 pozycji zmniejsza panel filtrów na mobile – korzystny efekt uboczny po S-07.

## Desired End State

1. **`ACTIVE_SUBGENRES`** – 13 identyfikatorów w ustalonej kolejności UI (tabela w `change.md`).
2. **`SUBGENRES`** – alias eksportowany jako `ACTIVE_SUBGENRES` (formularze i filtry bez masowej podmiany importów) **albo** podmiana referencji – preferencja: alias, żeby jeden punkt zmiany.
3. **`Subgenre`** – union **wszystkich** wartości enumu DB (legacy + active), żeby odczyt z Supabase nie wymagał castów.
4. **`filterActiveSubgenres(subgenres)`** – zwraca tylko aktywne; używany we **wszystkich** komponentach wyświetlających badge'e / listy etykiet.
5. **Walidacja zapisu** – create/update event, profil, ekipa, sugestia: tylko `ACTIVE_SUBGENRES`; legacy w payloadzie → błąd walidacji (nowe zapisy).
6. **Filtry URL** – `parseFanFilters` akceptuje tylko aktywne (już działa przez `isSubgenre` po podmianie zbioru).
7. **Sugestie** – checkboxy podgatunków w `EventSuggestChangesForm`; `subgenres` w `SUGGESTION_PAYLOAD_KEYS` + testy.
8. **Migracja additive** – jeden plik SQL dodający 5 nowych wartości enumu.
9. **PRD + roadmap** – zaktualizowana tabela katalogu, `subgenre_catalog_version: 2`.

### Weryfikacja ręczna

- `/events` – filtr pokazuje 13 pozycji; wybór działa; URL `?subgenre=halftime` **nie filtruje** (param ignorowany).
- Event ze starym tagiem `halftime` – kafelek **bez** badge'a halftime; reszta pól OK.
- Admin/fan: formularz eventu – 13 checkboxów; zapis z `neurofunk` + `garage` działa (po migracji enum).
- `/profile` – edycja ulubionych: 13 chipów; zapis max 5.
- `/team` – ekipa: 13 pozycji w formularzu.
- Strona eventu – sugestia zmiany podgatunków; admin apply aktualizuje event.
- Archiwum + mapa – legacy tagi niewidoczne.

## What We're NOT Doing

- Usuwanie wartości z enumu Postgres (`ALTER TYPE … DROP VALUE` – niemożliwe bez rebuild).
- Masowy `UPDATE` czyszczący legacy z kolumn `subgenres` / `favorite_subgenres`.
- Zmiana logiki filtra OR w `listPublishedEvents` poza aktywnym katalogiem w URL.
- Grupowanie / wyszukiwarka w filtrze podgatunków (FR-003 dopuszcza w przyszłości).
- Tłumaczenie UI na EN.
- Mapowanie legacy → nowe (np. `liquid_funk` → `liquid_dnb`) – legacy po prostu znika z UI.
- GitHub issue / board sync – przy implementacji, nie w tym planie.

## Implementation Approach

Trzy fazy: (1) model katalogu + migracja enum additive; (2) walidacja + formularze + filtry; (3) display filter + sugestie + testy + docs.

```
types.ts / lib/subgenres.ts
  ACTIVE_SUBGENRES, LEGACY_SUBGENRES, filterActiveSubgenres, isActiveSubgenre
  SUBGENRES := ACTIVE_SUBGENRES
  SUBGENRE_LABELS – etykiety dla wszystkich Subgenre (legacy zachowują stare etykiety na wypadek debugu; UI ich nie renderuje)

Wyświetlanie: filterActiveSubgenres(row.subgenres) przed mapowaniem na badge

Zapis: z.enum(ACTIVE_SUBGENRES) w schematach zod
```

## Critical Implementation Details

### Aktywny katalog (kolejność UI)

```typescript
export const ACTIVE_SUBGENRES = [
  "liquid_dnb",
  "neurofunk",
  "jump_up",
  "dancefloor",
  "garage",
  "bassline",
  "dubstep",
  "bass_house",
  "jungle",
  "techstep",
  "hardcore_oldschool",
  "bounce",
  "trancestep",
] as const satisfies readonly Subgenre[];

export const SUBGENRES = ACTIVE_SUBGENRES;
```

Etykiety (fragment – pełna mapa w `SUBGENRE_LABELS`):

| id | Etykieta |
| --- | --- |
| `liquid_dnb` | Liquid |
| `hardcore_oldschool` | Hardcore |
| `trancestep` | Trance |
| `garage` | Garage |
| `bassline` | Bassline |
| `dubstep` | Dubstep |
| `bass_house` | Bass House |
| `bounce` | Bounce |

### Helper wyświetlania

**File:** `src/lib/subgenres.ts` (nowy, cienki moduł – unikamy rozdmuchania `types.ts`)

```typescript
import { ACTIVE_SUBGENRES, type Subgenre } from "@/types";

const ACTIVE_SET = new Set<string>(ACTIVE_SUBGENRES);

export function isActiveSubgenre(value: string): value is Subgenre {
  return ACTIVE_SET.has(value);
}

export function filterActiveSubgenres(subgenres: readonly Subgenre[]): Subgenre[] {
  return subgenres.filter((s) => ACTIVE_SET.has(s));
}
```

**File:** `EventCardSubgenreBadges.tsx` – na początku renderu:

```typescript
const visibleSubgenres = filterActiveSubgenres(subgenres);
// dalsza logika na visibleSubgenres
```

Ten sam wzorzec w: `EventsMap.tsx`, `events/[id].astro`, `ProfileView.tsx`, `ProfileEventCard.tsx`, `ArchiveEventList.tsx`, `CrewDashboard.tsx` (przed przekazaniem do badge).

### Walidacja zapisu

We wszystkich schematach zamienić bazę enumu:

```typescript
import { ACTIVE_SUBGENRES, type Subgenre } from "@/types";
const activeSubgenreSchema = z.enum(ACTIVE_SUBGENRES as [Subgenre, ...Subgenre[]]);
```

Pliki: `schema.ts`, `profile-schema.ts`, `crew-schema.ts`, `fan-schema.ts` (`SUBGENRE_SET` z `ACTIVE_SUBGENRES`), `DateRangeFilter.tsx` (import `isActiveSubgenre` zamiast lokalnej kopii).

**Event update partial:** jeśli payload zawiera `subgenres`, muszą być wyłącznie aktywne i `min(1)` jak dziś.

### Formularze – stan początkowy z legacy

`EventForm` / `ProfileEditor` / `CrewForm`: stan checkboxów inicjuj z `filterActiveSubgenres(initial?.subgenres ?? [])` – legacy **nie zaznaczone**, ale **nie usuwane z DB** dopóki użytkownik nie zapisze formularz z nowym wyborem.

Przy zapisie eventu z samymi legacy w DB i edycji **innych pól** bez dotykania podgatunków – API powinno **nie wysyłać** `subgenres` w PATCH (zachowanie partial update) → legacy zostają w DB. OK.

### Migracja SQL (additive only)

**File:** `supabase/migrations/YYYYMMDDHHmmss_add_subgenre_catalog_v2_values.sql`

```sql
ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'garage';
ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'bassline';
ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'dubstep';
ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'bass_house';
ALTER TYPE public.subgenre ADD VALUE IF NOT EXISTS 'bounce';
```

Rozszerzyć union `Subgenre` w `types.ts` o te 5 wartości. **Bez** usuwania starych.

### Sugestie zmian – rozszerzenie payloadu

1. **`suggestion-schema.ts`** – dodać `"subgenres"` do `SUGGESTION_PAYLOAD_KEYS`; `parseEventUpdate` już obsługuje `subgenres` gdy pole obecne.
2. **`EventSuggestChangesForm.tsx`** – sekcja checkboxów (wzorzec z `EventForm`: `SUBGENRES.map` + toggle); stan `subgenres` inicjowany z `filterActiveSubgenres(event.subgenres)`; wysyłka tylko gdy użytkownik zmieni wybór względem początkowego.
3. **`ChangeSuggestionReviewDialog`** / format podglądu – jeśli payload zawiera `subgenres`, pokaż listę etykiet (sprawdzić `suggestion-format.ts`).
4. **`applyChangeSuggestionToEvent`** – bez zmian jeśli już merguje przez `parseEventUpdate`.

---

## Phase 1: Model katalogu + migracja enum

### Overview

Nowy moduł helperów, refactor `types.ts`, migracja SQL, rozszerzenie typu TS.

### Changes

1. **`src/types.ts`**
   - Dodać 5 nowych literałów do union `Subgenre`.
   - Wprowadzić `ACTIVE_SUBGENRES` (13 poz.) i `SUBGENRES = ACTIVE_SUBGENRES`.
   - Zaktualizować `SUBGENRE_LABELS` (nowe etykiety + 5 nowych id).
   - Opcjonalnie: `LEGACY_SUBGENRES` jako różnica zbiorów (dokumentacja / testy).

2. **`src/lib/subgenres.ts`** – `isActiveSubgenre`, `filterActiveSubgenres`.

3. **`supabase/migrations/…_add_subgenre_catalog_v2_values.sql`** – 5× `ADD VALUE IF NOT EXISTS`.

### Tests

- **`tests/unit/subgenres.test.ts`** (nowy) – `filterActiveSubgenres(["neurofunk", "halftime"])` → `["neurofunk"]`; kolejność zachowana.
- **`tests/unit/forum-schema.test.ts`** / inne – tylko jeśli importują count SUBGENRES; grep po `26` i `SUBGENRES.length`.

---

## Phase 2: Walidacja, filtry, formularze

### Overview

Schematy zod, filtry URL, wszystkie selektory.

### Changes

1. **`src/lib/events/schema.ts`**, **`profile-schema.ts`**, **`crew-schema.ts`** – `activeSubgenreSchema`.
2. **`src/lib/events/fan-schema.ts`** – `SUBGENRE_SET` z `ACTIVE_SUBGENRES`.
3. **`src/components/discovery/DateRangeFilter.tsx`** – import wspólnego `isActiveSubgenre`.
4. **Formularze** – `EventForm`, `ProfileEditor`, `CrewForm`, `SubgenreFilter`: bez zmian importu jeśli `SUBGENRES` wskazuje na active; inicjalizacja stanu przez `filterActiveSubgenres` gdzie potrzeba.
5. **`src/lib/events/mapper.ts`** – **bez filtrowania** przy mapowaniu z DB (pełna fidelity w modelu `Event`); filtrowanie tylko w UI.

### Tests

- **`tests/unit/fan-schema.test.ts`** – `bogus` nadal odrzucany; `halftime` w URL **ignorowany** (legacy nieaktywny).
- **`tests/unit/forum-schema.test.ts`** → **`event schema tests`** – odrzucenie legacy w create payload np. `subgenres: ["halftime"]` → fail.
- Zaktualizować fixture'y używające wyłącznie active ids (większość już OK).

---

## Phase 3: Wyświetlanie, sugestie, dokumentacja

### Overview

Filtrowanie badge'ów, rozszerzenie sugestii, PRD/roadmap, testy regresji.

### Changes

1. **Display components** – `filterActiveSubgenres` (lista w sekcji Critical Details).
2. **`EventSuggestChangesForm.tsx`** + **`suggestion-schema.ts`** + ewentualnie **`suggestion-format.ts`**.
3. **`context/foundation/prd.md`** – tabela Business Logic: 13 pozycji, nowe FR note.
4. **`context/foundation/roadmap.md`** – wpis S-29, `subgenre_catalog_version: 2`.
5. **`idea.md`** – opcjonalnie skrócić „21 other subgenres” jeśli nadal widoczne publicznie.

### Tests

- **`tests/unit/suggestion-schema.test.ts`** – payload z `subgenres: ["garage"]` success; `["halftime"]` fail.
- **`tests/unit/profile-section.test.tsx`** – profil z legacy w mocku: po wdrożeniu **nie** renderuje legacy label (mock `favoriteSubgenres: ["neurofunk", "halftime"]` → tylko Neurofunk).
- **`tests/unit/subgenres.test.ts`** – pełny katalog 13 pozycji, etykiety Liquid/Hardcore/Trance.
- Uruchomić **`npm run verify`** przed PR.

---

## Touchpoint checklist (implementacja)

| Obszar | Pliki |
| ------ | ----- |
| Źródło katalogu | `src/types.ts`, `src/lib/subgenres.ts` |
| DB enum (additive) | `supabase/migrations/…_add_subgenre_catalog_v2_values.sql` |
| Lista eventów – filtry | `SubgenreFilter.tsx`, `fan-schema.ts`, `DateRangeFilter.tsx` |
| Lista – kafelki | `EventCardSubgenreBadges.tsx`, `EventDiscoveryCard.tsx` |
| Mapa | `EventsMap.tsx` |
| Archiwum | `ArchiveEventList.tsx` |
| Szczegóły eventu | `events/[id].astro` |
| Dodawanie eventów | `EventForm.tsx` → `FanEventForm`, admin routes |
| Profil | `ProfileEditor.tsx`, `ProfileView.tsx`, `ProfileEventCard.tsx` |
| Ekipy | `CrewForm.tsx`, `CrewDashboard.tsx` |
| Sugestie | `EventSuggestChangesForm.tsx`, `suggestion-schema.ts`, `suggestion-format.ts` |
| Walidacja API | `schema.ts`, `profile-schema.ts`, `crew-schema.ts` |
| Testy | `subgenres.test.ts`, `fan-schema.test.ts`, `suggestion-schema.test.ts`, integracje z fixture subgenres |

---

## Risks & mitigations

| Ryzyko | Mitygacja |
| ------ | --------- |
| Event tylko z legacy tagami – brak badge'ów | Akceptowane (decyzja produktowa); event nadal widoczny na liście |
| Admin nie może „usunąć” legacy bez wyboru nowych | Edycja podgatunków w formularzu – świadomy wybór 13 poz.; partial PATCH bez subgenres zostawia DB |
| Nowe enumy przed deploy migracji | Kolejność: migracja → deploy kodu; lokalnie `supabase db reset` / push migracji |
| Testy integracyjne z `darkstep`, `halftime` w seed | Seed może zawierać legacy – testy read nadal przechodzą; testy create używają active ids |

---

## Post-archive

- Zamknąć issue GitHub S-29, kolumna **Done** na boardzie.
- Wpis w `lessons.md` jeśli powtarzalny wzorzec „active catalog vs DB enum” okaże się przydatny w przyszłości.
- **Nie** usuwać wpisu z `public-roadmap.ts` jeśli istnieje – dopiero przy archive tej zmiany.

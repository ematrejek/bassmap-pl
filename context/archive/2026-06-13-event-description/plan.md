# Pole opisu wydarzenia — Implementation Plan

## Overview

Dodajemy opcjonalne pole `description` do wydarzeń: kolumna w Postgres, pełny przepływ danych (typy → Zod → serwis → API admin), pole textarea w panelu admina oraz sekcję „Opis” na publicznej stronie szczegółów `/events/[id]`. Slice roadmapy **S-04** / change-id **`event-description`**.

## Current State Analysis

- Tabela `public.events` (`supabase/migrations/20260610100000_create_events.sql`) — brak `description`; są m.in. `lineup text[]`, `price text`.
- Typ `Event` w `src/types.ts` — brak `description`.
- `src/lib/events/mapper.ts` — mapowanie snake_case ↔ camelCase bez `description`.
- `src/lib/events/schema.ts` — `commonEventFields` bez `description`.
- `src/lib/services/events.ts` — `parsedCreateToInsert` i `updateEvent` nie obsługują opisu.
- `src/components/admin/EventForm.tsx` — textarea tylko dla lineup.
- `src/pages/events/[id].astro` — sekcje: nagłówek, podgatunki, lineup, bilet; brak opisu.
- Testy: `tests/unit/event-schema.test.ts` + `tests/helpers/mutation-fixtures.ts`.

### Key Discoveries

- Wzorzec referencyjny: **lineup** — opcjonalne, nullable, textarea w adminie, sekcja na stronie szczegółów (`src/pages/events/[id].astro` L86–97).
- RLS nie wymaga zmian — opis jest kolumną tej samej tabeli co reszta pól publicznych.
- Lesson (`context/foundation/lessons.md`): publiczne ready już filtrują `published` + nadchodzące w serwisie — opis podąża automatycznie.
- Discovery list/preview (`EventList.tsx`, `EventPreviewCard.tsx`) — **poza zakresem**; nie dodawać opisu na kartach.

## Desired End State

1. Migracja dodaje `description text` (nullable) do `events`.
2. Admin w `/admin/events/new` i `/admin/events/[id]/edit` ma pole „Opis wydarzenia” (textarea, opcjonalne).
3. Fan na `/events/[id]` widzi sekcję „Opis” z tekstem (`whitespace-pre-wrap`), **tylko gdy** `description` nie jest null/pusty.
4. Zod: trim, pusty string → `null`, max 5000 znaków, komunikat po polsku.
5. CI: lint, build, testy schema zielone.

## What We're NOT Doing

- Markdown / rich text / HTML w opisie.
- Opis na liście wydarzeń, mapie ani w `EventPreviewCard`.
- Osobne API poza istniejącymi `/api/admin/events` (POST/PUT).
- Zmiana PRD na dysku (opcjonalnie później — FR-009 w roadmapie).
- Tłumaczenie UI na EN.

## Implementation Approach

Klasyczny przepływ pionowy: **migracja → typy/mapper → walidacja Zod → serwis → UI admin → UI fan → testy**. Faza 1 kończy się działającym zapisem przez API (weryfikowalne testami); Faza 2 dodaje widoczność w UI.

## Phase 1: Warstwa danych i walidacja

### Overview

Kolumna w bazie, spójne typy TypeScript, mapper, schema Zod, serwis create/update oraz testy jednostkowe.

### Changes Required:

#### 1. Migracja Supabase

**File**: `supabase/migrations/20260613140000_event_description.sql`

**Intent**: Dodać opcjonalną kolumnę opisu do tabeli wydarzeń bez wpływu na istniejące wiersze.

**Contract**: `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description text;` — bez NOT NULL, bez domyślnej wartości (istniejące wiersze = NULL).

#### 2. Typy współdzielone

**File**: `src/types.ts`

**Intent**: Udostępnić `description` w modelu domenowym i DTO insert/update.

**Contract**: `Event.description: string | null`; opcjonalne `description?: string | null` w `EventInsert`.

#### 3. Mapper DB ↔ aplikacja

**File**: `src/lib/events/mapper.ts`

**Intent**: Mapować `description` / `description` między Supabase a typem `Event`.

**Contract**: `EventRow.description: string | null`; uwzględnić w `mapEventRow`, `toEventInsertRow`, `toEventUpdateRow`.

#### 4. Walidacja Zod

**File**: `src/lib/events/schema.ts`

**Intent**: Przyjmować opcjonalny opis w create/update z limitem długości i normalizacją pustych wartości.

**Contract**: Pole `description` w `commonEventFields` i `eventUpdatePartialSchema`:

```typescript
description: z
  .string()
  .max(5000, "Opis może mieć maksymalnie 5000 znaków")
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null))
  .transform((value) => (value === undefined ? value : value.trim() || null)),
```

(Uproszczenie implementacyjne dozwolone — ważne: max 5000, trim, `""` → `null`.)

#### 5. Serwis wydarzeń

**File**: `src/lib/services/events.ts`

**Intent**: Przekazywać opis przy tworzeniu i aktualizacji wydarzenia.

**Contract**: `parsedCreateToInsert` — `description: parsed.description ?? null`; `updateEvent` — `if (parsed.description !== undefined) patch.description = parsed.description`.

#### 6. Testy schema

**Files**: `tests/unit/event-schema.test.ts`, opcjonalnie `tests/helpers/mutation-fixtures.ts`

**Intent**: Regresja walidacji opisu.

**Contract**: Testy:
- akceptuje `description: null` i brak pola;
- akceptuje sensowny tekst wieloliniowy;
- odrzuca > 5000 znaków;
- normalizuje pusty string do `null` (jeśli testowalne przez parse).

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` (lokalnie) lub `npx supabase db push` — migracja bez błędów
- `npm run lint`
- `npm run build`
- `npm test` (Vitest) — w tym `tests/unit/event-schema.test.ts`

#### Manual Verification:

- (Po Fazie 2) Admin zapisuje wydarzenie z opisem — w Supabase Studio widać `description`

**Implementation Note**: Po Fazie 1 można zweryfikować zapis przez API/Studio; pełna weryfikacja UI w Fazie 2.

---

## Phase 2: UI admina i strona szczegółów fana

### Overview

Textarea w formularzu admina oraz sekcja opisu na publicznej stronie wydarzenia.

### Changes Required:

#### 1. Formularz admina

**File**: `src/components/admin/EventForm.tsx`

**Intent**: Umożliwić adminowi wpisanie opisu przy tworzeniu i edycji.

**Contract**:
- Stan `description` z `initialEvent?.description ?? ""`.
- Textarea „Opis wydarzenia” (np. po sekcji lineup, przed okładką), `rows={5}`, placeholder po polsku, opcjonalne.
- `buildBody()` — `description: description.trim() || null`.
- Ten sam `fieldClass` co lineup.

#### 2. Strona szczegółów wydarzenia

**File**: `src/pages/events/[id].astro`

**Intent**: Fan czyta opis na stronie szczegółów.

**Contract**:
- Sekcja warunkowa: renderuj tylko gdy `event.description` truthy po trim.
- Nagłówek: „Opis” (uppercase jak „Lineup”).
- Treść: `<p class="whitespace-pre-wrap text-blue-100/80">` — Astro escapuje HTML automatycznie.
- Umiejscowienie: **po** nagłówku (data/miejsce/cena), **przed** sekcją Podgatunki (opis ogólny przed metadanymi).

#### 3. (Opcjonalnie) Admin — podgląd listy

**Files**: `src/pages/admin/*` — tylko jeśli istnieje tabela z kolumnami; **poza zakresem** chyba że admin table już pokazuje lineup — wtedy nie dodawać (YAGNI).

### Success Criteria:

#### Automated Verification:

- `npm run lint`
- `npm run build`

#### Manual Verification:

- Utwórz wydarzenie z opisem wieloliniowym → strona `/events/[id]` pokazuje sekcję z zachowanymi enterami
- Wydarzenie bez opisu → brak sekcji „Opis” (nie „Brak opisu”)
- Edycja: zmiana opisu, wyczyszczenie opisu (null) — sekcja znika u fana
- Regresja: lineup, cena, okładka, filtry discovery bez zmian

**Implementation Note**: Po tej fazie usuń wpis `event-description` z `src/data/public-roadmap.ts` dopiero przy `/10x-archive` — nie w tej implementacji.

---

## Testing Strategy

### Unit Tests:

- `parseEventCreate` / `parseEventUpdate` z polem `description` (valid, null, too long)
- Mapper round-trip (opcjonalnie krótki test jeśli istnieje wzorzec)

### Integration Tests:

- Brak nowych testów integracyjnych wymaganych — pole przechodzi przez istniejące API admin jak lineup

### Manual Testing Steps:

1. Zaloguj jako admin → nowe wydarzenie z opisem 2–3 linie → opublikuj → otwórz `/events/[id]` jako gość
2. Edytuj → usuń opis → sekcja znika
3. Wklej >5000 znaków → formularz pokazuje błąd walidacji (client-side Zod przed fetch)

## Performance Considerations

- Jedna kolumna `text` — brak wpływu na listy (opis nie jest selectowany osobno; Supabase `select("*")` już pobiera wszystkie kolumny — akceptowalne przy małej skali MVP).

## Migration Notes

- Istniejące wiersze: `description = NULL` — brak backfillu.
- Deploy: `npx supabase db push` na remote przed/po deploy Worker (standardowy flow projektu).
- Rollback: `ALTER TABLE public.events DROP COLUMN description;` + revert kodu.

## References

- Roadmap S-04: `context/foundation/roadmap.md`
- Wzorzec lineup: `src/components/admin/EventForm.tsx`, `src/pages/events/[id].astro`
- Lesson fan read: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Warstwa danych i walidacja

#### Automated

- [x] 1.1 Migracja `20260613140000_event_description.sql` stosuje się lokalnie (`supabase db reset` lub `db push`)
- [x] 1.2 `npm run lint` przechodzi
- [x] 1.3 `npm run build` przechodzi
- [x] 1.4 `npm test` — testy `event-schema` dla `description` przechodzą

#### Manual

- [x] 1.5 (Opcjonalnie) W Supabase Studio kolumna `description` widoczna na `events`

### Phase 2: UI admina i strona szczegółów fana

#### Automated

- [x] 2.1 `npm run lint` przechodzi
- [x] 2.2 `npm run build` przechodzi

#### Manual

- [x] 2.3 Admin tworzy/edytuje opis; fan widzi sekcję na `/events/[id]` gdy opis jest wypełniony
- [x] 2.4 Pusty opis — sekcja ukryta; brak regresji lineup/cena/okładka/discovery

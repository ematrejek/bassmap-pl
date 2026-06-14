# Ustrukturyzowana cena i waluta — Implementation Plan

## Overview

Zastępujemy dowolny tekst w kolumnie `price text` ustrukturyzowanym modelem: tryb ceny (`exact` / `from` / `range`), kwota(y) numeryczne i waluta (`PLN` / `EUR` / `CZK`). Admin wybiera tryb i wpisuje liczby w formularzu; Zod i CHECK w bazie walidują spójność; fan nadal widzi cenę przez `formatEventPrice` (lista, podgląd mapy, szczegóły). Migracja SQL przenosi znane wzorce ze seeda (`od 89 zł` itd.); nierozpoznane wartości → `NULL` (admin uzupełnia ręcznie). Slice roadmapy **S-08** / change-id **`structured-price-currency`**.

## Current State Analysis

- **DB** (`supabase/migrations/20260610100000_create_events.sql`): `is_free boolean NOT NULL DEFAULT false`, `price text` (nullable, bez constraintów).
- **Typy** (`src/types.ts`): `Event.price: string | null` — dowolny string.
- **Mapper** (`src/lib/events/mapper.ts`): pass-through `price` / `is_free`.
- **Zod** (`src/lib/events/schema.ts`): `price: z.string().optional().nullable()` — bez formatu ani waluty.
- **Serwis** (`src/lib/services/events.ts`): create/update przekazuje `price` jak przychodzi; brak wymuszenia `isFree → null price` po stronie serwera.
- **Admin** (`src/components/admin/EventForm.tsx`): jedno pole tekstowe „Cena”, placeholder `od 50 zł`, wyłączone gdy „Wstęp wolny”.
- **Fan** (`src/lib/events/format.ts` → `formatEventPrice`): `isFree` → „Wstęp wolny”; inaczej surowy `price` lub „Cena do ustalenia”. Używane w `EventList.tsx`, `EventPreviewCard.tsx`, `events/[id].astro`.
- **Seed** (`supabase/seed.sql`): `'od 89 zł'`, `'od 45 zł'`, `'od 60 zł'`; anomalia Halftime: `is_free: false` + `'wstęp wolny, rezerwacja miejsc'`.
- **Testy**: brak testów ceny; `mutation-fixtures.ts` ma `price: null`; `event-fixtures.ts` bez pola `price`.

### Key Discoveries

- Wzorzec pionowy: **S-04 event-description** — migracja → typy → mapper → Zod → serwis → admin UI → fan helper → testy.
- **S-06 free-events-filter** explicite zakazał heurystyki z `price` — `is_free` pozostaje jedynym źródłem prawdy dla „darmowe”.
- `formatEventPrice` jest centralnym punktem fan-facing — komponenty listy/szczegółów **nie** wymagają zmian sygnatury, jeśli helper przyjmie nowe pola `Event`.
- Brak `src/components/ui/select.tsx` — walutę i tryb ceny w adminie realizujemy natywnym `<select>` / radio (jak `coverAspect` w `EventForm`).
- Roadmap unknown (migracja starych tekstów): **heurystyka w SQL dla seeda + NULL dla reszty** — akceptowalne przy małej liczbie wierszy na produkcji.

## Desired End State

1. Migracja: enumy `price_mode`, `event_currency`; kolumny `price_mode`, `price_min`, `price_max`, `currency`; usunięcie `price text`; CHECK spójności z `is_free`.
2. Migracja danych: seedowe `od N zł` → `from` + `N` + `PLN`; Halftime → `is_free: true`, cena `NULL`.
3. `Event` / `EventInsert` / `EventUpdate`: `priceMode`, `priceMin`, `priceMax`, `currency` zamiast `price`.
4. Zod: walidacja liczb (> 0, max 2 miejsca po przecinku), trybu, waluty; gdy `isFree: true` → wszystkie pola ceny `null`; gdy płatne bez ceny → dozwolone (fan: „Cena do ustalenia”).
5. Serwis: przy `isFree: true` zeruje pola ceny w insert/patch (server-side, nie tylko UI).
6. Admin: radio tryb (dokładna / od X / X–Y), inputy liczbowe, select waluty; ukryte/wyłączone gdy „Wstęp wolny”.
7. Fan: `formatEventPrice` formatuje po polsku, np. `50 zł`, `od 50 zł`, `40–60 zł`, `25 €`, `300 Kč`.
8. Testy jednostkowe: schema + formatowanie + fixture płatnego wydarzenia.
9. PRD: **FR-012** dodane do `context/foundation/prd.md`.
10. CI: lint, build, testy zielone.

### Weryfikacja ręczna

- Admin tworzy wydarzenie „od 50” PLN → lista i `/events/[id]` pokazują „od 50 zł”.
- Admin tworzy przedział 40–60 EUR → „40–60 €”.
- „Wstęp wolny” → „Wstęp wolny”; pola ceny wyczyszczone w DB.
- Płatne bez podanej ceny → „Cena do ustalenia”.
- Edycja istniejącego seedowego wydarzenia — formularz wypełniony z zmigrowanych wartości.
- Regresja: filtr `free=1`, opis, daty, podgatunki, okładki bez zmian.

## What We're NOT Doing

- Konwersja walut / kursy NBP.
- Filtr po cenie lub walucie w discovery (URL / `fan-schema`).
- Heurystyka „darmowe” z tekstu ceny (S-06).
- Rich text / dowolny opis ceny w DB.
- Waluty poza PLN / EUR / CZK.
- shadcn `Select` (chyba że dodany w trakcie — nie wymagany).
- Nowe trasy API — ten sam POST/PUT `/api/admin/events`.
- Usunięcie wpisu z `src/data/public-roadmap.ts` — dopiero przy `/10x-archive`.
- GitHub issue / board sync — osobny krok przy `/10x-implement` (brak issue # dla S-08 w `roadmap.md`).

## Implementation Approach

Trzy fazy: (1) migracja + warstwa danych i walidacja + `formatEventPrice` + testy; (2) formularz admina; (3) seed/fixtures + PRD. Faza 1 kończy się poprawnym zapisem przez API; faza 2 — UX admina; faza 3 — spójność dev seed i dokumentacji.

## Critical Implementation Details

### Model domenowy

| Pole (TS / API) | Kolumna DB | Typ | Semantyka |
| --------------- | ---------- | --- | --------- |
| `priceMode` | `price_mode` | `'exact' \| 'from' \| 'range' \| null` | Jak pokazać cenę |
| `priceMin` | `price_min` | `number \| null` | Kwota lub dolna granica |
| `priceMax` | `price_max` | `number \| null` | Górna granica (tylko `range`) |
| `currency` | `currency` | `'PLN' \| 'EUR' \| 'CZK' \| null` | Waluta |

**Reguły biznesowe (Zod + CHECK + serwis):**

| `isFree` | `priceMode` | `priceMin` | `priceMax` | `currency` | Fan UI |
| -------- | ----------- | ---------- | ---------- | ---------- | ------ |
| `true` | `null` | `null` | `null` | `null` | „Wstęp wolny” |
| `false` | `null` | `null` | `null` | `null` | „Cena do ustalenia” |
| `false` | `exact` | wymagane > 0 | `null` | wymagane | np. `50 zł` |
| `false` | `from` | wymagane > 0 | `null` | wymagane | np. `od 50 zł` |
| `false` | `range` | wymagane > 0 | wymagane > `priceMin` | wymagane | np. `40–60 zł` |

Częściowe podanie ceny przy `isFree: false` (np. sam `priceMin` bez trybu) → błąd walidacji.

### Formatowanie (fan)

Nowy moduł `src/lib/events/price.ts` (lub rozszerzenie `format.ts`):

```typescript
const CURRENCY_DISPLAY: Record<EventCurrency, string> = {
  PLN: "zł",
  EUR: "€",
  CZK: "Kč",
};

function formatAmount(n: number): string {
  // Usuń zbędne .00; separator dziesiętny przecinek w pl-PL
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
}
```

- `exact`: `{min} {suffix}`
- `from`: `od {min} {suffix}`
- `range`: `{min}–{max} {suffix}` (myślnik en-dash `–`)

`formatEventPrice` w `format.ts` deleguje do tego modułu — **bez zmian** w `EventList` / `EventPreviewCard` / `[id].astro`.

### Migracja SQL (heurystyka)

W jednym pliku migracji, po `ADD COLUMN`:

1. `UPDATE` wierszy z `price ~* '^od\s+(\d+(?:[.,]\d+)?)\s*(zł|pln)'` → `from`, `price_min`, `PLN`.
2. Analogicznie sufiksy `€|eur` → `EUR`, `kč|czk` → `CZK`.
3. Wzorzec `(\d+)\s*[-–]\s*(\d+)` → `range`.
4. Samo `(\d+)` z walutą → `exact`.
5. Reszta → pola ceny `NULL`.
6. `ALTER TABLE ... DROP COLUMN price`.
7. Seed Halftime: w `supabase/seed.sql` od razu `is_free: true`, `price_*: null` (bez starego tekstu).

**Produkcja:** jeśli są niestandardowe teksty — po migracji admin edytuje wydarzenia z pustą ceną; log migracji opcjonalny (`RAISE NOTICE`) — YAGNI na MVP.

### CHECK w Postgres (defense-in-depth)

```sql
CONSTRAINT events_price_free_clear CHECK (
  is_free = false OR (
    price_mode IS NULL AND price_min IS NULL AND price_max IS NULL AND currency IS NULL
  )
),
CONSTRAINT events_price_shape CHECK (
  price_mode IS NULL OR (
    price_min IS NOT NULL AND currency IS NOT NULL AND (
      (price_mode IN ('exact', 'from') AND price_max IS NULL)
      OR (price_mode = 'range' AND price_max IS NOT NULL AND price_max > price_min)
    )
  )
)
```

### API body (admin)

Zamiast `price: "od 50 zł"`:

```json
{
  "isFree": false,
  "priceMode": "from",
  "priceMin": 50,
  "priceMax": null,
  "currency": "PLN"
}
```

`EventForm.buildBody()` buduje ten kształt; przy `isFree: true` wysyła same `null`e dla pól ceny.

---

## Phase 1: Migracja, typy, walidacja, formatowanie

### Overview

Schemat bazy, pełny przepływ danych, `formatEventPrice` i testy jednostkowe — bez zmian w `EventForm`.

### Changes Required

#### 1. Migracja Supabase

**File**: `supabase/migrations/20260613180000_structured_price_currency.sql`

**Intent**: Zastąpić `price text` strukturą numeryczną + enum waluty/trybu; zmigrować istniejące wiersze; dodać CHECK.

**Contract**:

- `CREATE TYPE public.price_mode AS ENUM ('exact', 'from', 'range');`
- `CREATE TYPE public.event_currency AS ENUM ('PLN', 'EUR', 'CZK');`
- `ADD COLUMN price_mode`, `price_min numeric(10,2)`, `price_max numeric(10,2)`, `currency event_currency`
- `UPDATE` heurystyka (patrz wyżej)
- `DROP COLUMN price`
- Oba `CHECK` constrainty
- Komentarz w migracji: nierozpoznane → NULL

#### 2. Moduł ceny

**File**: `src/lib/events/price.ts` (nowy)

**Intent**: Stałe, typy pomocnicze, formatowanie kwoty i sufiksu waluty.

**Contract**:

- Eksport: `EVENT_CURRENCIES`, `PRICE_MODES`, `EventCurrency`, `EventPriceMode`
- `formatStructuredPrice(params: { priceMode, priceMin, priceMax, currency }): string | null` — `null` gdy brak kompletnych danych
- Używane przez `format.ts` i testy

#### 3. Typy współdzielone

**File**: `src/types.ts`

**Intent**: Zastąpić `price: string | null` polami strukturalnymi.

**Contract**:

```typescript
export type EventPriceMode = "exact" | "from" | "range";
export type EventCurrency = "PLN" | "EUR" | "CZK";

// Event:
priceMode: EventPriceMode | null;
priceMin: number | null;
priceMax: number | null;
currency: EventCurrency | null;
// Usunąć: price
```

To samo w `EventInsert` / `EventUpdate` (opcjonalne pola).

#### 4. Mapper DB ↔ aplikacja

**File**: `src/lib/events/mapper.ts`

**Intent**: Mapować nowe kolumny; konwersja `numeric` string → `number` w `mapEventRow`.

**Contract**:

- `EventRow`: `price_mode`, `price_min`, `price_max`, `currency` (bez `price`)
- `mapEventRow`: `priceMin: row.price_min !== null ? Number(row.price_min) : null` (analogicznie `priceMax`)
- `toEventInsertRow` / `toEventUpdateRow`: snake_case + `null` gdy `isFree`

#### 5. Walidacja Zod

**File**: `src/lib/events/schema.ts`

**Intent**: Zastąpić `price: z.string()` walidacją strukturalną z `superRefine`.

**Contract**:

- Usunąć `price` z `commonEventFields`
- Dodać: `priceMode`, `priceMin`, `priceMax`, `currency` (opcjonalne/nullable)
- `priceMin` / `priceMax`: `z.number().positive()` lub preprocess z stringa z formularza
- `superRefine` na create/update:
  - `isFree === true` → wszystkie pola ceny muszą być `null`/brak
  - jeśli którekolwiek pole ceny podane → wymagany komplet zgodny z tabelą reguł
- Komunikaty po polsku (np. „Podaj kwotę większą od zera”, „W przedziale cena maksymalna musi być większa od minimalnej”)

#### 6. Serwis wydarzeń

**File**: `src/lib/services/events.ts`

**Intent**: Create/update z nowymi polami; wymuszenie spójności `isFree`.

**Contract**:

- `parsedCreateToInsert`: mapować `priceMode`, `priceMin`, `priceMax`, `currency`; gdy `isFree` → wszystkie `null`
- `updateEvent`: to samo w `patch`; gdy `parsed.isFree === true` → wyzeruj pola ceny nawet jeśli klient je wysłał

#### 7. Formatowanie fana

**File**: `src/lib/events/format.ts`

**Intent**: `formatEventPrice` używa struktury zamiast surowego stringa.

**Contract**:

```typescript
export function formatEventPrice(
  event: Pick<Event, "isFree" | "priceMode" | "priceMin" | "priceMax" | "currency">,
): string {
  if (event.isFree) return "Wstęp wolny";
  const formatted = formatStructuredPrice({ ... });
  return formatted ?? "Cena do ustalenia";
}
```

#### 8. Testy

**Files**:

- `tests/unit/event-schema.test.ts` — scenariusze ceny (valid exact/from/range, `isFree` clears, błędny range, brak waluty)
- `tests/unit/event-price.test.ts` (nowy) — `formatStructuredPrice` / `formatEventPrice` dla PLN/EUR/CZK, exact/from/range, `isFree`, brak ceny
- `tests/helpers/mutation-fixtures.ts` — zamienić `price: null` na strukturalne pola
- `tests/helpers/event-fixtures.ts` — jeden fixture płatny z `price_mode: 'from'`, `price_min: 50`, `currency: 'PLN'`

### Success Criteria

#### Automated Verification

- `npx supabase db reset` — migracja + seed bez błędów
- `npm run lint`
- `npm run build`
- `npm test` — nowe i zaktualizowane testy zielone

#### Manual Verification

- (Po Fazie 2) API POST z JSON strukturalnym zapisuje wiersz w Studio

**Implementation Note**: Po Fazie 1 fan widzi już sformatowane ceny ze seeda (bez zmian w komponentach React/Astro).

---

## Phase 2: Formularz admina

### Overview

Zastąpić pole tekstowe „Cena” kontrolkami: tryb, kwoty, waluta; zachować checkbox „Wstęp wolny”.

### Changes Required

#### 1. EventForm

**File**: `src/components/admin/EventForm.tsx`

**Intent**: Admin wprowadza ustrukturyzowaną cenę z walidacją po stronie klienta (Zod przy submit).

**Contract**:

- Stan: `priceMode: EventPriceMode | null`, `priceMin` / `priceMax` (string dla inputów lub number), `currency: EventCurrency | 'PLN'` (domyślnie PLN)
- Inicjalizacja z `initialEvent` — mapowanie zmigrowanych wartości
- Sekcja „Cena” (gdy `!isFree`):
  - Radio / fieldset: „Dokładna”, „Od”, „Przedział” → `exact` / `from` / `range`
  - `Input type="number" min="0" step="0.01"` dla min; drugi input dla max tylko gdy `range`
  - `<select>` waluta: PLN, EUR, CZK
- Gdy `isFree`: sekcja ukryta lub `disabled`; `buildBody()` wysyła `priceMode/Min/Max/currency: null`
- Przy przełączeniu na „Wstęp wolny”: opcjonalnie wyczyść lokalny stan ceny (UX)
- Zachować `fieldClass` i układ siatki obok `ticketUrl`

#### 2. Regresja admin API

**Files**: `src/pages/api/admin/events/index.ts`, `[id].ts` — **bez zmian** (parsują przez `schema.ts`)

### Success Criteria

#### Automated Verification

- `npm run lint`
- `npm run build`

#### Manual Verification

- `/admin/events/new` — utworzenie z każdym trybem i walutą
- `/admin/events/[id]/edit` — seed Neuro Night pokazuje „Od” + 89 PLN
- „Wstęp wolny” — zapis, fan widzi „Wstęp wolny”
- Błędny przedział (max ≤ min) — komunikat Zod przed fetch
- Regresja: opis, okładka, lokalizacja, podgatunki

---

## Phase 3: Seed, PRD, porządki

### Overview

Spójny seed dev, dokumentacja FR-012, aktualizacja fixture’ów integracyjnych jeśli potrzeba.

### Changes Required

#### 1. Seed

**File**: `supabase/seed.sql`

**Intent**: INSERTy używają kolumn strukturalnych zamiast `price` tekstu.

**Contract**:

- Neuro / Jump-Up / Jungle: `price_mode: 'from'`, `price_min: 89/45/60`, `currency: 'PLN'`
- Liquid Sundays: `is_free: true`, cena NULL
- Halftime: `is_free: true` (naprawa anomalii), cena NULL

#### 2. PRD

**File**: `context/foundation/prd.md`

**Intent**: Udokumentować FR-012 (propozycja z roadmapy).

**Contract** (sekcja Functional Requirements):

- **FR-012:** Cena wydarzenia to liczba lub przedział z walutą PLN/EUR/CZK (tryby: dokładna, od X, X–Y); nie dowolny string. Priority: must-have (Partia I).

#### 3. Testy integracyjne (jeśli dotknięte)

**File**: `tests/integration/fan-read-list.test.ts`

**Intent**: Upewnić się, że odczyt listy zwraca nowe pola i `formatEventPrice` nie psuje asercji (jeśli są asercje na cenę — zaktualizować).

### Success Criteria

#### Automated Verification

- `npx supabase db reset`
- `npm test` (pełny suite)
- `npm run lint` + `npm run build`

#### Manual Verification

- Lokalny dev: lista `/` pokazuje „od 89 zł” itd. ze seeda
- Brak regresji filtra `free=1`

---

## Testing Strategy

### Unit Tests

| Obszar | Plik | Przypadki |
| ------ | ---- | --------- |
| Zod | `event-schema.test.ts` | exact/from/range OK; range z max ≤ min FAIL; isFree + cena FAIL; płatne bez ceny OK |
| Format | `event-price.test.ts` | PLN/EUR/CZK; exact/from/range; isFree; null → „Cena do ustalenia” |
| Mapper | opcjonalnie krótki test round-trip jeśli wzorzec w repo |

### Integration Tests

- Istniejący `fan-read-list.test.ts` — upewnić się, że fixture INSERT pasuje do nowego schematu
- Brak nowych tras API

### Manual Testing Steps

1. `supabase db reset` → `npm run dev` → jako gość sprawdź listę i szczegóły seedowych cen
2. Admin → nowe wydarzenie, tryb „Przedział” 30–45 CZK → zapis → fan widzi „30–45 Kč”
3. Admin → edycja → „Wstęp wolny” → cena znika w DB i UI fana
4. `/?free=1` — nadal tylko `is_free: true` (Liquid, Halftime)

## Performance Considerations

- Cztery kolumny zamiast jednego `text` — bez wpływu na MVP; `select("*")` bez zmian.
- Brak indeksu na polach ceny — nie są filtrem.

## Migration Notes

- **Deploy:** `npx supabase db push` na remote **przed** deployem Worker z nowym kodem (kod oczekuje nowych kolumn).
- **Rollback:** przywrócić `price text`, skopiować sformatowane wartości z powrotem (ręcznie) — na MVP wystarczy backup przed push.
- **Produkcja:** po push admin przegląda wydarzenia z pustą ceną i uzupełnia w panelu.

## References

- Roadmap S-08: `context/foundation/roadmap.md`
- Wzorzec S-04: `context/archive/2026-06-13-event-description/plan.md`
- Relacja is_free: `context/archive/2026-06-13-free-events-filter/plan.md`
- `formatEventPrice`: `src/lib/events/format.ts`
- Admin form: `src/components/admin/EventForm.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Migracja, typy, walidacja, formatowanie

#### Automated

- [x] 1.1 Migracja `20260613180000_structured_price_currency.sql` stosuje się (`supabase db reset`)
- [x] 1.2 `npm run lint` przechodzi
- [x] 1.3 `npm run build` przechodzi
- [x] 1.4 `npm test` — `event-schema` + `event-price` przechodzą

#### Manual

- [ ] 1.5 W Studio: kolumny `price_mode`, `price_min`, `price_max`, `currency`; brak `price`
- [ ] 1.6 Seedowe wiersze zmigrowane (Neuro „od 89 zł” jako struktura)

### Phase 2: Formularz admina

#### Automated

- [x] 2.1 `npm run lint` przechodzi
- [x] 2.2 `npm run build` przechodzi

#### Manual

- [ ] 2.3 Admin tworzy/edytuje wydarzenie we wszystkich trybach i walutach
- [ ] 2.4 „Wstęp wolny” czyści cenę; walidacja przedziału działa

### Phase 3: Seed, PRD, porządki

#### Automated

- [x] 3.1 `supabase db reset` + pełny `npm test`
- [x] 3.2 `npm run lint` + `npm run build`

#### Manual

- [ ] 3.3 Fan widzi poprawne ceny na `/` i `/events/[id]`; filtr darmowych bez regresji

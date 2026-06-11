# Event Data Foundation Implementation Plan

## Overview

Utworzenie fundamentu danych wydarzeń DnB w Supabase: migracja SQL z tabelą `events`, enumami, politykami RLS (publiczny odczyt, zapis tylko admin), typami TypeScript oraz seedem lokalnym. To pierwszy krok roadmapy F-01 — odblokowuje S-01 (panel admina) i S-02 (odkrywanie przez fana).

## Current State Analysis

- **Supabase CLI** skonfigurowany (`supabase/config.toml`, Postgres 17); folder `supabase/migrations/` **nie istnieje**; brak plików `.sql` w repo.
- **Klient SSR** (`src/lib/supabase.ts`) obsługuje wyłącznie Auth — brak `supabase.from(...)`.
- **`src/types.ts`** nie istnieje; brak wygenerowanych typów `Database`.
- **PRD** definiuje pola wymagane (nazwa, data, miasto, venue) i opcjonalne (lineup, link biletowy, cena); wielokrotne tagi podgatunków; ukrywanie przeszłych eventów; publiczna widoczność tylko po weryfikacji.
- **F-02** (`admin-role-guard`) jest osobnym slice'em — w F-01 stosujemy tymczasową tabelę `admin_allowlist` jako most do pełnej roli admina.

### Key Discoveries:

- `README.md` (L114) mówi, że migracje nie są wymagane — po F-01 trzeba zaktualizować README.
- `supabase/config.toml` wskazuje `sql_paths = ["./seed.sql"]`, ale plik `seed.sql` nie istnieje.
- Wzorzec migracji z AGENTS.md: `YYYYMMDDHHmmss_short_description.sql`, RLS z granularnymi politykami per operacja.

## Desired End State

Po zakończeniu planu:

1. `npx supabase db reset` lokalnie stosuje migrację i seed bez błędów.
2. Tabela `events` zawiera wszystkie pola wymagane przez PRD plus rozszerzenia uzgodnione w planowaniu (adres, status workflow, flaga free/bilety, opcjonalna lista artystów).
3. RLS: anonimowy użytkownik widzi tylko `published` + nadchodzące (Europe/Warsaw); zapis (INSERT/UPDATE/DELETE) tylko dla e-maili z `admin_allowlist`.
4. `src/types.ts` eksportuje typy domenowe (`Event`, `EventStatus`, `Subgenre`) zgodne ze schematem.
5. `seed.sql` zawiera 3–5 realistycznych wydarzeń DnB z pełnym adresem; współrzędne opcjonalne (nullable).

### Weryfikacja ręczna (Supabase Studio):

- SELECT jako anon na `events` zwraca tylko published + przyszłe.
- Wstawienie wiersza jako anon/authenticated spoza allowlist → odrzucone.
- Wstawienie jako admin (e-mail z allowlist) → sukces.

## What We're NOT Doing

- UI panelu admina, API CRUD — to S-01.
- Geokodowanie adresu → współrzędne w runtime — to S-01 (helper w formularzu); w F-01 kolumny `latitude`/`longitude` są nullable.
- Formalna rola admina (`app_metadata`, custom claims) — to F-02; `admin_allowlist` jest mostem tymczasowym.
- Mapa, filtry, strony fana — to S-02.
- Tabela `organizers` / self-service submit — post-MVP (v2).
- `supabase gen types` do osobnego pliku — na razie ręczne typy w `src/types.ts` (wystarczy na MVP).

## Implementation Approach

Jedna migracja SQL tworząca enumy, tabele pomocnicze (`admin_allowlist`), tabelę `events`, funkcje pomocnicze (`is_admin()`, `is_upcoming()`), indeksy i polityki RLS. Osobny plik `seed.sql` z danymi testowymi. Typy TS odzwierciedlają schemat bez generowania z CLI.

Kolejność w migracji ma znaczenie: enumy → tabele → funkcje → RLS → indeksy.

## Critical Implementation Details

- **Strefa czasowa „nadchodzące”:** użyj `(starts_at AT TIME ZONE 'Europe/Warsaw')::date >= (now() AT TIME ZONE 'Europe/Warsaw')::date` w polityce SELECT i funkcji `is_upcoming()`, nie porównuj `now()` bez konwersji — nocne eventy i granica „dziś” muszą być spójne z PRD.
- **`admin_allowlist`:** seed zawiera placeholder e-maila (`admin@example.com`); implementer **musi** podmienić na własny e-mail przed testem zapisu. F-02 zastąpi lub uzupełni ten mechanizm.
- **Status `published` w seedzie:** wszystkie przykładowe eventy mają `status = 'published'`, żeby były widoczne przy publicznym SELECT.
- **Podgatunki — tylko ze stałej listy:** kolumna `subgenres` przyjmuje wyłącznie wartości enumu `subgenre` (25 pozycji). Wartości spoza listy są odrzucane przez typ enum — nie ma wolnego tekstu. Etykiety z nawiasami, spacjami i myślnikami (np. „Hardcore (oldschool)”, „Jump-up”) mapuje się w UI przez `SUBGENRE_LABELS` w `src/types.ts`; w bazie zapisujemy identyfikator snake_case.

### Katalog podgatunków (kanoniczna lista)

| Identyfikator enum / TS | Etykieta UI          |
| ----------------------- | -------------------- |
| `jungle`                | Jungle               |
| `hardcore_oldschool`    | Hardcore (oldschool) |
| `liquid_dnb`            | Liquid DnB           |
| `liquid_funk`           | Liquid Funk          |
| `jump_up`               | Jump-up              |
| `anthem_dnb`            | Anthem DnB           |
| `darkstep`              | Darkstep             |
| `neurofunk`             | Neurofunk            |
| `techstep`              | Techstep             |
| `doomcore`              | Doomcore             |
| `funk_dnb`              | Funk DnB             |
| `jazz_step`             | Jazz-step            |
| `soul_dnb`              | Soul DnB             |
| `drumfunk`              | Drumfunk             |
| `abstract_dnb`          | Abstract DnB         |
| `autonomic`             | Autonomic            |
| `halftime`              | Halftime             |
| `sambass`               | Sambass              |
| `clownstep`             | Clownstep            |
| `trancestep`            | Trancestep           |
| `drumstep`              | Drumstep             |
| `crossbreed`            | Crossbreed           |
| `ragga_dnb`             | Ragga DnB            |
| `ambient_dnb`           | Ambient DnB          |
| `intelligent_dnb`       | Intelligent DnB      |

> **Źródło prawdy katalogu:** `context/foundation/prd.md` §Business Logic (zsynchronizowane z tym planem).

## Phase 1: Schemat SQL i enumy

### Overview

Utworzenie pierwszej migracji z tabelą `events`, enumami statusu i podgatunku oraz polami lokalizacji.

### Changes Required:

#### 1. Migracja główna

**File**: `supabase/migrations/YYYYMMDDHHmmss_create_events.sql`

**Intent**: Zdefiniować kompletny schemat wydarzeń zgodny z PRD i decyzjami planowania — jedna migracja, idempotentna struktura od zera.

**Contract**:

- `CREATE TYPE event_status AS ENUM ('draft', 'pending', 'published', 'rejected')`
- `CREATE TYPE subgenre AS ENUM` — dokładnie 25 wartości z tabeli „Katalog podgatunków” powyżej (`jungle`, `hardcore_oldschool`, `liquid_dnb`, `liquid_funk`, `jump_up`, `anthem_dnb`, `darkstep`, `neurofunk`, `techstep`, `doomcore`, `funk_dnb`, `jazz_step`, `soul_dnb`, `drumfunk`, `abstract_dnb`, `autonomic`, `halftime`, `sambass`, `clownstep`, `trancestep`, `drumstep`, `crossbreed`, `ragga_dnb`, `ambient_dnb`, `intelligent_dnb`). Żadnych innych wartości — enum jest zamknięty.
- Tabela `events`:
  - `id` uuid PK `gen_random_uuid()`
  - `name` text NOT NULL
  - `starts_at` timestamptz NOT NULL
  - `city` text NOT NULL
  - `venue_name` text NOT NULL
  - `address_street` text NOT NULL
  - `address_number` text NOT NULL
  - `latitude` double precision NULL
  - `longitude` double precision NULL
  - `subgenres` subgenre[] NOT NULL DEFAULT '{}' — CHECK: co najmniej 1 element (`cardinality(subgenres) >= 1`)
  - `lineup` text[] NULL — opcjonalna lista artystów
  - `ticket_url` text NULL
  - `is_free` boolean NOT NULL DEFAULT false — flaga: wydarzenie bezpłatne vs płatne/bilety
  - `price` text NULL — opcjonalny opis ceny (np. „od 40 zł”); NULL gdy `is_free = true` lub brak info
  - `status` event_status NOT NULL DEFAULT 'draft'
  - `created_at` timestamptz NOT NULL DEFAULT now()
  - `updated_at` timestamptz NOT NULL DEFAULT now()
- Constraint CHECK na współrzędne: obie NULL lub obie NOT NULL.
- Trigger `updated_at` (funkcja `moddatetime` lub własna `set_updated_at()`).

#### 2. Folder migracji

**File**: `supabase/migrations/` (katalog)

**Intent**: Utworzyć katalog wymagany przez Supabase CLI.

**Contract**: Katalog istnieje; zawiera plik migracji z Phase 1.

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` kończy się kodem 0 (po dodaniu seed w Phase 3 — w tej fazie można użyć `npx supabase migration up` jeśli seed jeszcze nie istnieje; pełny reset weryfikujemy w Phase 3)
- Plik migracji istnieje pod `supabase/migrations/`

#### Manual Verification:

- W Supabase Studio (`http://localhost:54323`) widać tabelę `events` z oczekiwanymi kolumnami i enumami
- Próba INSERT bez wymaganych pól kończy się błędem constraint
- Próba INSERT z wartością spoza enumu `subgenre` (np. `'neuro'`) kończy się błędem typu

**Implementation Note**: Po Phase 1 i automated verification — potwierdzenie manualne przed Phase 2.

---

## Phase 2: RLS, funkcje pomocnicze i admin allowlist

### Overview

Włączenie RLS, publiczny odczyt nadchodzących published eventów, zapis tylko dla adminów z allowlisty.

### Changes Required:

#### 1. Tabela admin_allowlist i funkcja is_admin

**File**: `supabase/migrations/YYYYMMDDHHmmss_create_events.sql` (kontynuacja tego samego pliku lub druga migracja w tej samej sesji implementacji — preferowane **jeden plik** jeśli F-01 wdrażane atomowo)

**Intent**: Tymczasowy mechanizm rozpoznawania admina (właściciel projektu) do czasu F-02.

**Contract**:

- Tabela `admin_allowlist (email text PRIMARY KEY)`
- `CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean` — sprawdza `auth.jwt() ->> 'email'` w allowliście; `SECURITY DEFINER`, `SET search_path = public`
- RLS na `admin_allowlist`: SELECT tylko dla `is_admin()`; brak publicznego INSERT (seed przez migrację/service role)

#### 2. Funkcja is_upcoming i polityki RLS na events

**File**: ten sam plik migracji

**Intent**: Egzekwować reguły biznesowe PRD na poziomie bazy.

**Contract**:

- `CREATE OR REPLACE FUNCTION public.is_upcoming(starts_at timestamptz) RETURNS boolean` — porównanie dat w `Europe/Warsaw`
- `ALTER TABLE events ENABLE ROW LEVEL SECURITY`
- Polityki:
  - `SELECT`: `status = 'published' AND is_upcoming(starts_at)` — rola `anon` i `authenticated`
  - `INSERT`: `is_admin()` — rola `authenticated`
  - `UPDATE`: `is_admin()` — rola `authenticated`
  - `DELETE`: `is_admin()` — rola `authenticated`
- Indeksy: `(starts_at)`, `(status)`, `(city)`, GIN na `subgenres`

#### 3. Seed admin e-mail w migracji

**File**: ten sam plik migracji (na końcu) lub `supabase/seed.sql`

**Intent**: Wstawić e-mail właściciela do allowlisty.

**Contract**: `INSERT INTO admin_allowlist (email) VALUES ('<OWNER_EMAIL>') ON CONFLICT DO NOTHING` — implementer podmienia placeholder w seed lub migracji komentarzem `-- TODO: replace with your email`.

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` (gdy seed gotowy) — bez błędów RLS przy seedzie przez service role
- `npm run lint` — bez regresji (brak zmian TS w tej fazie)

#### Manual Verification:

- Jako anon w Studio/SQL: `SELECT * FROM events` zwraca tylko published + przyszłe
- Jako zalogowany użytkownik spoza allowlist: INSERT na `events` → permission denied
- Jako użytkownik z e-mailem z allowlist: INSERT → sukces

**Implementation Note**: Po Phase 2 — manualne potwierdzenie przed Phase 3.

---

## Phase 3: Typy TypeScript, seed i dokumentacja

### Overview

Typy domenowe, realistyczny seed lokalny, aktualizacja README.

### Changes Required:

#### 1. Typy współdzielone

**File**: `src/types.ts`

**Intent**: Jedno źródło typów dla przyszłych slice'ów S-01/S-02.

**Contract**:

- `export type Subgenre` — union 25 identyfikatorów z katalogu podgatunków (1:1 z enumem SQL)
- `export const SUBGENRES: readonly Subgenre[]` — uporządkowana lista wszystkich dozwolonych wartości (do selectów w S-01/S-02)
- `export const SUBGENRE_LABELS: Record<Subgenre, string>` — mapowanie identyfikator → etykieta UI (np. `jump_up` → `'Jump-up'`, `hardcore_oldschool` → `'Hardcore (oldschool)'`)
- `export type EventStatus = 'draft' | 'pending' | 'published' | 'rejected'`
- `export interface Event` — pola 1:1 z kolumnami tabeli `events` (camelCase w TS: `startsAt`, `venueName`, `addressStreet`, `addressNumber`, `ticketUrl`, `isFree`, itd.)
- `export interface EventInsert` / `EventUpdate` — Partial z wymaganymi polami przy tworzeniu (opcjonalnie, jeśli ułatwia S-01)

#### 2. Seed wydarzeń

**File**: `supabase/seed.sql`

**Intent**: 3–5 przykładowych wydarzeń DnB w różnych miastach i podgatunkach do lokalnego dev.

**Contract**:

- Wszystkie: `status = 'published'`, daty w przyszłości (względem daty implementacji — użyć dat stałych np. 2026-09+)
- Różne kombinacje: `is_free true/false`, z/bez `lineup`, z/bez `ticket_url` i `price`
- `subgenres`: wyłącznie wartości z katalogu; seed używa różnych podgatunków (np. `neurofunk`, `liquid_dnb`, `jump_up`, `halftime`)
- Adresy: pełne `venue_name`, `address_street`, `address_number`, `city`
- `latitude`/`longitude`: NULL w części rekordów, wypełnione w 1–2 (np. znane kluby Warszawa/Kraków) — pokazuje oba przypadki
- Seed `admin_allowlist` z e-mailem dev (komentarz do podmiany)

#### 3. README

**File**: `README.md`

**Intent**: Usunąć stwierdzenie, że migracje nie są wymagane; opisać `db reset` i seed.

**Contract**: Sekcja Supabase Local Setup wspomina `supabase/migrations/`, `seed.sql` i `npx supabase db reset`.

#### 4. change.md

**File**: `context/changes/event-data-foundation/change.md`

**Intent**: Oznaczyć change jako zaplanowany.

**Contract**: `status: planned`, `updated: 2026-06-10`.

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` — exit 0
- `npm run lint` — exit 0
- `npm run build` — exit 0 (nowy `src/types.ts` nie psuje buildu)

#### Manual Verification:

- Po resecie: Studio pokazuje 3–5 eventów widocznych przy anon SELECT
- Przynajmniej jeden event ma `lineup` wypełnione, jeden `is_free = true`, jeden z `ticket_url` i `price`

**Implementation Note**: Po Phase 3 — finalne manualne potwierdzenie przed `/10x-implement` archive lub merge.

---

## Testing Strategy

### Unit Tests:

- Brak test runnera w projekcie — poza zakresem F-01.

### Integration Tests:

- Weryfikacja przez `supabase db reset` + ręczne zapytania SQL w Studio.

### Manual Testing Steps:

1. `npx supabase start` (jeśli nie działa)
2. Podmień e-mail w `admin_allowlist` na swój
3. `npx supabase db reset`
4. Studio → Table Editor → `events` — sprawdź kolumny i seed
5. SQL Editor jako `anon`: `SELECT count(*) FROM events` — tylko published + upcoming
6. Zaloguj się w aplikacji (`/auth/signup`) e-mailem spoza allowlist → INSERT przez API/SQL odrzucony
7. Dodaj swój e-mail do allowlist → INSERT testowego eventu → sukces
8. Ustaw `starts_at` w przeszłości na jednym evencie → znika z anon SELECT

## Performance Considerations

- Indeks na `starts_at` i `(status, starts_at)` wystarczy na MVP (setki eventów).
- GIN na `subgenres` dla filtra FR-003 w S-02.
- Brak potrzeby partycjonowania przy `data_volume: small`.

## Migration Notes

- Pierwsza migracja w zielonym polu — brak danych produkcyjnych do migracji.
- Deploy do Supabase Cloud: `npx supabase db push` po lokalnej weryfikacji.
- Po F-02: rozważyć usunięcie `admin_allowlist` na rzecz `app_metadata.role` bez zmiany schematu `events`.

## References

- PRD: `context/foundation/prd.md` — Business Logic, Access Control, FR-003–FR-007
- Roadmap: `context/foundation/roadmap.md` — F-01
- Klient Supabase: `src/lib/supabase.ts`
- Konwencje migracji: `AGENTS.md`, `CLAUDE.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Schemat SQL i enumy

#### Automated

- [x] 1.1 `npx supabase db reset` kończy się kodem 0 (po seed w Phase 3; w Phase 1: migracja stosuje się bez błędu)
- [x] 1.2 Plik migracji istnieje pod `supabase/migrations/`

#### Manual

- [x] 1.3 Studio: tabela `events` z oczekiwanymi kolumnami i enumami
- [x] 1.4 INSERT bez wymaganych pól → błąd constraint

### Phase 2: RLS, funkcje pomocnicze i admin allowlist

#### Automated

- [x] 2.1 `npx supabase db reset` bez błędów RLS przy seedzie
- [x] 2.2 `npm run lint` bez regresji

#### Manual

- [x] 2.3 Anon SELECT: tylko published + nadchodzące
- [ ] 2.4 Użytkownik spoza allowlist: INSERT odrzucony
- [ ] 2.5 Użytkownik z allowlist: INSERT sukces

### Phase 3: Typy TypeScript, seed i dokumentacja

#### Automated

- [x] 3.1 `npx supabase db reset` — exit 0
- [x] 3.2 `npm run lint` — exit 0
- [x] 3.3 `npm run build` — exit 0

#### Manual

- [x] 3.4 Studio: 3–5 seed eventów widocznych przy anon SELECT
- [x] 3.5 Seed pokrywa lineup, is_free, ticket_url/price

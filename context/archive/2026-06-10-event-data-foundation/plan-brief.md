# Event Data Foundation — Plan Brief

> Full plan: `context/changes/event-data-foundation/plan.md`

## What & Why

BassMap PL potrzebuje tabeli wydarzeń DnB w Supabase, zanim powstanie panel admina (S-01) lub odkrywanie dla fana (S-02). F-01 dostarcza migrację SQL, RLS, typy TypeScript i seed lokalny — fundament danych zgodny z PRD (pola wymagane, podgatunki, ukrywanie przeszłych, weryfikacja przez status).

## Starting Point

Supabase działa tylko pod Auth (`src/lib/supabase.ts`, middleware). Brak `supabase/migrations/`, `src/types.ts` i jakiegokolwiek kodu wydarzeń. `config.toml` jest gotowy; `seed.sql` jest skonfigurowany, ale plik nie istnieje.

## Desired End State

Po wdrożeniu `npx supabase db reset` tworzy tabelę `events` z pełnym adresem (klub, ulica, numer), opcjonalnymi współrzędnymi, listą artystów, flagą `is_free`, opcjonalną ceną i linkiem biletowym. Anonimowy fan (przez RLS) widzi tylko opublikowane, nadchodzące wydarzenia. Tylko admin (e-mail z `admin_allowlist`) może zapisywać. `src/types.ts` jest gotowy dla kolejnych slice'ów.

## Key Decisions Made

| Decision        | Choice                                             | Why                                                                                                    | Source     |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------- |
| Podgatunki      | `subgenre[]` enum (25 wartości)                    | Wiele tagów na event; tylko ze stałej listy (PRD §Business Logic); etykiety UI przez `SUBGENRE_LABELS` | PRD / Plan |
| Data wydarzenia | `timestamptz`                                      | Poprawna granica „dziś” w Europe/Warsaw + godzina                                                      | Plan       |
| Miasto          | `text` wolny                                       | MVP z jednym adminem; filtr bez słownika miast                                                         | Plan       |
| Adres           | `venue_name` + `address_street` + `address_number` | Dokładne miejsce ważniejsze niż sama nazwa klubu                                                       | Plan       |
| Współrzędne     | `latitude`/`longitude` nullable                    | Admin zwykle nie zna współrzędnych; geokodowanie w S-01                                                | Plan       |
| Lineup          | `lineup text[]` nullable                           | Opcjonalna lista artystów                                                                              | Plan       |
| Bilety / cena   | `is_free` + `ticket_url` + `price` nullable        | Flaga free vs płatne; cena opcjonalna                                                                  | Plan       |
| Weryfikacja     | `event_status` enum                                | draft / pending / published / rejected — gotowe na organizatora v2                                     | Plan       |
| Zapis           | `admin_allowlist` + `is_admin()`                   | Na start tylko Ty; most do F-02                                                                        | Plan       |
| Seed            | 3–5 eventów w `seed.sql`                           | Lokalny dev bez ręcznego INSERT                                                                        | Plan       |

## Scope

**In scope:** migracja SQL, enumy, tabela `events`, `admin_allowlist`, funkcje `is_admin()` / `is_upcoming()`, RLS, indeksy, `src/types.ts`, `seed.sql`, aktualizacja README.

**Out of scope:** UI admina, API CRUD, geokodowanie runtime, mapa, formalna rola admin (F-02), test runner, `supabase gen types`.

## Architecture / Approach

```
supabase/migrations/*.sql
  → enums (event_status, subgenre)
  → tables (events, admin_allowlist)
  → functions (is_admin, is_upcoming, updated_at trigger)
  → RLS policies (SELECT public filtered; writes admin-only)
  → indexes

supabase/seed.sql → sample events + admin email

src/types.ts → Event, EventStatus, Subgenre (mirror schema)
```

Kolejne slice'y (F-02, S-01) podłączą się do tego schematu bez jego przebudowy.

## Phases at a Glance

| Phase          | What it delivers                      | Key risk                                           |
| -------------- | ------------------------------------- | -------------------------------------------------- |
| 1. Schemat SQL | Tabela `events` + enumy + constrainty | Literówka w CHECK na subgenres                     |
| 2. RLS + admin | Public read, admin write, allowlist   | Zły e-mail w allowlist → brak zapisu               |
| 3. Typy + seed | `src/types.ts`, `seed.sql`, README    | Seed z datami w przeszłości → niewidoczne przy RLS |

**Prerequisites:** Docker + `npx supabase start`, `.env` z `SUPABASE_URL`/`SUPABASE_KEY`.

**Estimated effort:** ~1 sesja implementacji, 3 fazy sekwencyjnie.

## Open Risks & Assumptions

- `admin_allowlist` to rozwiązanie tymczasowe — F-02 może wymagać migracji polityk bez zmiany tabeli `events`.
- Geokodowanie adres → współrzędne nie jest w F-01; eventy bez lat/lng nie pojawią się na mapie do S-02.
- Implementer musi podmienić placeholder e-maila admina przed testem zapisu.
- README wymaga korekty (obecnie twierdzi, że migracje nie są potrzebne).

## Success Criteria (Summary)

- `supabase db reset` przechodzi lokalnie bez błędów.
- Anon widzi tylko published + nadchodzące wydarzenia; przeszłe są ukryte.
- Admin z allowlist może INSERT; inni nie.
- `npm run lint` i `npm run build` przechodzą po dodaniu typów.

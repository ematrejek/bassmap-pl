# Admin Event Management — Plan Brief

> Full plan: `context/changes/admin-event-management/plan.md`

## What & Why

Admin musi dodawać, edytować i usuwać wydarzenia DnB — to jedyne źródło danych w MVP (FR-006, FR-007). F-01 dostarcza schemat i RLS, F-02 guard tras `/admin/*`; S-01 dopełnia warstwę aplikacyjną: lista, formularze, API mutacji oraz **automatyczne geokodowanie adresu** przy zapisie, żeby S-02 mógł od razu rysować pinezki na mapie.

## Starting Point

- **F-01 done:** tabela `events`, enumy, RLS, typy w `src/types.ts`, seed z 5 wydarzeniami.
- **F-02 done:** `locals.isAdmin`, middleware na `/admin/*`, `requireAdmin()`, placeholder `/admin`, link w Topbarze.
- **Brakuje:** mapper, serwis eventów, geokodowanie, API `/api/admin/events/*`, formularze z trybem lokalizacji, lista zastępująca placeholder.

## Desired End State

Zalogowany admin wchodzi na `/admin`, widzi tabelę wydarzeń, dodaje/edytuje/usuwa eventy. **Domyślnie** wpisuje adres (ulica, numer, miasto, venue) — system przy zapisie geokoduje go (Nominatim) i zapisuje `latitude`/`longitude`. **Opcjonalnie** zaznacza „Brak adresu — podaję współrzędne” (imprezy tajne) i wpisuje lat/lng ręcznie. Nowe wydarzenia mają status `published`. Mutacje chronione `requireAdmin()` + zod.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Architektura zapisu | API `/api/admin/events/*` + `requireAdmin()` | Middleware nie chroni `/api/*`; zgodne z AGENTS.md i impl-review F-02 | Research / Plan |
| Geokodowanie | Nominatim (OSM), serwer przy POST/PUT | Zero kosztu MVP; współrzędne zapisane raz przy entry — S-02 tylko czyta | User / Plan |
| Kiedy geokodować | Przy zapisie eventu (S-01), nie w S-02 | Admin to źródło danych; mapa fana konsumuje gotowe coords | User / Plan |
| Tryb lokalizacji | `address` (domyślny) vs `coordinates` (tajna) | Adres → auto coords; secret event bez ulicy, tylko ręczne współrzędne | User / Plan |
| Provider geokodowania | Nominatim + policy OSM (User-Agent, rate limit) | Darmowy; bez klucza API w MVP | Plan |
| Adres przy trybie coords | `address_street`/`address_number` nullable (migracja) | Unikamy fałszywego „—” w UI fana; venue + miasto nadal wymagane | Plan |
| Odczyt listy / edycji | SSR w Astro frontmatter | Prostsze niż osobny GET API | Plan |
| Wysyłka formularza | React island + `fetch()` JSON | Tryb lokalizacji, tablice, inline błędy geokodowania | Plan |
| Status przy tworzeniu | Zawsze `published` | PRD: admin-add = od razu publiczne | PRD / Plan |
| Lineup | Textarea — jeden artysta na linię | Prosty input; mapowanie na `text[]` | Plan |
| Usuwanie | Hard delete + dialog | FR-007 | Plan |
| Walidacja | zod | AGENTS.md | Plan |
| Język UI | Polski | PRD §Language | PRD |

## Scope

**In scope:** migracja nullable adresu, serwis geokodowania (Nominatim), zod z `locationMode`, mapper + serwis eventów, API POST/PUT/DELETE, lista `/admin`, formularze z przełącznikiem trybu lokalizacji, usuwanie, shadcn UI.

**Out of scope:** mapa i filtry fana (S-02), picker statusu draft/pending/rejected, UI allowlisty, płatne API geokodowania (Google Maps), cache geokodowania poza prostym in-memory (opcjonalnie później), test runner.

## Architecture / Approach

```
EventForm (locationMode: address | coordinates)
    │
    └── fetch JSON ──► POST/PUT /api/admin/events/*
                            requireAdmin() → zod
                            │
                            ├─ address mode → geocodeAddress() → lat/lng
                            └─ coordinates mode → użyj lat/lng z body
                            │
                            └── createEvent / updateEvent → Supabase

src/lib/geocoding/nominatim.ts   fetch do Nominatim (server-only)
src/lib/services/events.ts       resolveCoordinates() przed INSERT/UPDATE
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Backend + geokodowanie | migracja adresu, Nominatim, zod, serwis, API | Rate limit Nominatim; błąd „nie znaleziono adresu” |
| 2. Lista admina | `/admin` z tabelą | — |
| 3. Formularze + delete | tryb adres vs współrzędne, new/edit, usuwanie | UX przełącznika trybu; re-geokod przy zmianie adresu |

**Prerequisites:** F-01 + F-02; konto Auth na e-mailu z `admin_allowlist`.

**Estimated effort:** ~3 sesje implementacji, 3 fazy sekwencyjnie (+ geokodowanie w fazie 1 i 3).

## Open Risks & Assumptions

- Nominatim wymaga rozsądnego rate limitu (max 1 req/s) i identyfikacji aplikacji w User-Agent — przy wielu adminach rozważyć cache.
- Nieznaleziony adres → 400 z komunikatem PL; admin musi poprawić adres lub przełączyć na tryb współrzędnych.
- Seed z eventami bez coords — opcjonalnie uzupełnić geokodowaniem lub ręcznie w Studio (nie blokuje S-01).

## Success Criteria (Summary)

- Admin tworzy event z adresem → w Studio są współrzędne bez ręcznego wpisywania.
- Admin tworzy „tajną” imprezę z samymi współrzędnymi → zapis OK, brak wymaganego adresu ulicy.
- Admin edytuje/usuwa; nie-admin → 403 na API.
- `npm run lint` i `npm run build` przechodzą.

# Fan Event Discovery — Plan Brief

> Full plan: `context/changes/fan-event-discovery/plan.md`

## What & Why

Fan otwiera BassMap PL i w jednym miejscu znajduje nadchodzące imprezy DnB w Polsce — filtruje po mieście i podgatunkach, widzi listę posortowaną po dacie, pinezki na mapie oraz pełne szczegóły po kliknięciu. To **gwiazda przewodnia** produktu (S-02, US-01, FR-001–FR-005): bez tego slice'a aplikacja nie spełnia głównej hipotezy scentralizowanego odkrywania eventów.

## Starting Point

- **F-01 done:** tabela `events`, RLS (`published` + `is_upcoming` dla anon), indeksy na `city`, `subgenres`, `starts_at`.
- **S-01 done:** admin CRUD, geokodowanie Nominatim przy zapisie, współrzędne w DB; typy/mapper/format w `src/lib/events/*`, serwis w `src/lib/services/events.ts` (tylko admin).
- **Brakuje:** publiczny serwis odczytu, stron fana, biblioteki map, UI filtrów; `/` to nadal placeholder `Welcome.astro`.

## Desired End State

Niezalogowany fan wchodzi na `/`, wybiera miasto (dropdown z bazy) i jeden lub więcej podgatunków (logika OR), widzi przefiltrowaną listę i mapę obok siebie (na mobile — zakładki Lista/Mapa). Klik na wiersz lub pinezkę otwiera **podgląd** (placeholder graficzny, venue, data, bilety, tagi) z przyciskiem „Przejdź do wydarzenia” → `/events/[id]` z pełnym lineupem i linkiem biletowym w nowej karcie. Filtry są w URL (`?city=…&subgenre=…`) — link do udostępnienia działa.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Biblioteka map | Leaflet + OpenStreetMap | Zero kosztu MVP, dojrzały ekosystem react-leaflet | Plan |
| Routing | `/` = odkrywanie, `/events/[id]` = szczegóły | Naturalny north star; łatwe udostępnianie eventu | Plan |
| Layout | Split lista+mapa (desktop), zakładki (mobile) | Spełnia FR-001 i FR-005 jednocześnie | Plan |
| Filtr miasta | Dropdown z unikalnych miast w DB | Brak literówek, spójne z danymi admina | Plan |
| Filtr podgatunku | Multi-select, logika OR | Fan szuka „tego albo tego”; zgodne z wieloma tagami na evencie | Plan |
| Stan filtrów | Query params w URL + nawigacja SSR | Shareable linki; jedna ścieżka danych | Plan |
| Ładowanie danych | SSR w Astro (Supabase w frontmatter) | Ten sam wzorzec co admin; szybki first paint | Plan (agent) |
| Klik lista/mapa | Podgląd (popup) → pełna strona szczegółów | Szybki skan bez utraty kontekstu mapy | User / Plan |
| Zdjęcie eventu | Placeholder graficzny (brak pola w DB) | Zero migracji; prawdziwe plakaty w przyszłym slice | Plan |
| Brak współrzędnych | Fallback: centrum miasta (statyczna mapa) | Rzadki edge case po S-01; event nadal na mapie | User / Plan |
| Link biletowy | `target=_blank` + `rel=noopener` | Fan wraca łatwo do BassMap | Plan |
| Geokodowanie runtime | Brak — tylko odczyt z DB | Rozstrzygnięte w S-01/roadmapie | Research |
| Filtr dat (FR-008) | Poza zakresem | Nice-to-have w PRD | PRD |

## Scope

**In scope:** serwis odczytu publicznego, parsowanie filtrów z URL, strona `/` (filtry + lista + mapa + podgląd), `/events/[id]`, Leaflet, helpery formatowania, polski shell (Layout `lang=pl`, Topbar), zastąpienie Welcome.

**Out of scope:** pole `image_url` / upload plakatów, odsłuch samplek, komentarze, konta fanów, publiczne API GET, filtr zakresu dat (FR-008), geokodowanie w runtime, test runner.

## Architecture / Approach

```
GET /?city=Warszawa&subgenre=neurofunk&subgenre=jump_up
    │
    └── index.astro (SSR)
            parseFanFilters(URL) → listPublishedEvents() + listDistinctCities()
            │
            ├── EventFilters (form GET → nawigacja URL)
            ├── EventList (klik → podgląd)
            └── EventsMap client:only (Leaflet, pinezki, klik → podgląd)
                    │
                    └── EventPreviewCard (popup współdzielony stan)
                            └── link → /events/[id].astro (SSR getPublishedEventById)
```

RLS filtruje `published` + nadchodzące — serwis dodaje `.eq('city')` i OR po `subgenres`. Współrzędne mapy: `latitude`/`longitude` z DB lub `getCityCenter(city)`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Serwis odczytu | zapytania publiczne, schema URL, helpery coords/format | Zapytanie OR po wielu podgatunkach w PostgREST |
| 2. Strona odkrywania | `/` filtry + lista + URL sync | Zastąpienie startera bez regresji layoutu |
| 3. Mapa + podgląd | Leaflet, popup, sync lista↔mapa | Hydratacja Leaflet w Astro SSR / Cloudflare |
| 4. Szczegóły + shell | `/events/[id]`, Layout PL, Topbar | 404 dla niepublikowanych / przeszłych (RLS → null) |

**Prerequisites:** F-01 + S-01 done; seed lub eventy admina w bazie.

**Estimated effort:** ~4 sesje implementacji, 4 fazy sekwencyjnie (mapa = największa luka umiejętnościowa).

## Open Risks & Assumptions

- Leaflet wymaga `client:only` i importu CSS — mapa nie renderuje się bez JS (akceptowalne; lista nadal działa).
- Multi-select podgatunków w URL: powtarzany param `subgenre` (np. `?subgenre=neurofunk&subgenre=jump_up`).
- Eventy bez coords — fallback centrum miasta; admin powinien uzupełniać dane (S-01 geokoduje przy zapisie).
- Brak test runnera — weryfikacja manualna + lint/build.

## Success Criteria (Summary)

- Fan filtruje po mieście i podgatunku, widzi listę i pinezki, otwiera podgląd i stronę szczegółów — bez logowania.
- Przeszłe i nieopublikowane eventy niewidoczne; link biletowy otwiera się w nowej karcie.
- `npm run lint` i `npm run build` przechodzą.

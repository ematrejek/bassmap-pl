# Kafelki wydarzeń (S-18) – Plan Brief

> Full plan: `context/changes/event-card-redesign/plan.md`
> Design reference: `bassmap-pl-ui/components/event-card.tsx`, `event-explorer.tsx`

## What & Why

Partia III zaczyna się od odświeżenia listy wydarzeń: zamiast poziomych wierszy z miniaturką fan widzi kwadratowe kafelki jak w mockupie **bassmap-pl-ui**. To przygotowuje UI pod RSVP (S-19) i utrzymuje spójny wygląd z profilem fana (`ProfileEventCard`).

## Starting Point

`/events` używa `EventList` – pionowa lista przycisków z okładką 56×56 px, synchronizacją z mapą i dolnym podglądem `EventPreviewCard`. `ProfileEventCard` na profilu już wygląda jak mockup (GenreBadge, neon, uppercase tytuł). Folder `bassmap-pl-ui/` w repo zawiera wzorzec `EventCard` + siatkę `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

## Desired End State

Strona `/events`: filtry, potem mapa na pełnej szerokości, potem siatka kafelków. Każdy kafelek to link do szczegółów z: podgatunkami, nazwą, miejscem, datą/czasem, ceną, „0 Idzie” (placeholder), „Kup bilet” (gdy jest `ticketUrl`) lub „Zobacz”. Hover na kafelku podświetla pin. Brak `EventPreviewCard`. Bez zmian w bazie danych.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Układ strony | Mapa nad siatką (jak mockup) | Zgodność z bassmap-pl-ui EventExplorer | Plan |
| Klik kafelka | Link → `/events/[id]` | Prostsze UX; RSVP na stronie szczegółów (S-19) | Plan |
| Stopka kafelka | Cena + „0 Idzie” + warunkowy bilet | Roadmapa wymaga ceny; licznik placeholder do S-19 | Plan |
| Pasek statusu | Brak na liście discovery | Publiczna lista = tylko opublikowane | Plan |
| Okładka | Brak na kafelku | Jak mockup i ProfileEventCard | Plan |
| Zakres | Tylko `/events` | Archiwum i profil poza S-18 | Plan |
| Podgląd dolny | Usunąć EventPreviewCard | Sprzeczny z linkiem do szczegółów | Plan |
| Mapa | Hover z kafelka podświetla pin | Zachowuje połączenie lista–mapa | Plan |
| Fazy | 3 (kafelek → shell → testy) | Mniejsze, reviewowalne PR-y | Plan |

## Scope

**In scope:**

- Nowy komponent kafelka discovery
- Siatka w `EventList`
- Przebudowa `DiscoveryShell` (układ pionowy, hover, usunięcie podglądu)
- Aktualizacja `EventsMap` (hover highlight, klik → nawigacja)
- Testy jednostkowe kafelka
- Usunięcie martwego kodu (`EventPreviewCard` jeśli nieużywany)

**Out of scope:**

- `/archive`, `ProfileEventCard`, strona `/events/[id]` (poza ewentualnym linkowaniem)
- Prawdziwy licznik „Idę” (S-19)
- Zmiany schematu DB, API, filtrów URL
- Statusy mockupu (Live now / Selling fast)

## Architecture / Approach

Nowy `EventDiscoveryCard` w `src/components/discovery/` – port wizualny z `bassmap-pl-ui/components/event-card.tsx`, dane z `Event` + `formatEventPrice` / `formatEventVenueLine` / `formatEventDate`, badge'y przez istniejący `GenreBadge`. `EventList` renderuje siatkę `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5` z linkami `<a href="/events/{id}">`. `DiscoveryShell` trzyma `hoveredEventId` i przekazuje do mapy; `EventsMap` rozróżnia `hoveredEventId` (podświetlenie) od nawigacji po kliknięciu pina.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Kafelek + siatka | `EventDiscoveryCard`, grid w `EventList` | Stopka z trzema elementami na wąskim mobile |
| 2. Shell + mapa | Układ pionowy, hover sync, usunięcie podglądu | Regresja mobile (zakładki Lista/Mapa) |
| 3. Testy + porządki | Vitest, `npm run verify`, cleanup | Brak istniejących testów discovery – nowy wzorzec |

**Prerequisites:** S-16 done; folder `bassmap-pl-ui/` dostępny lokalnie jako reference.

**Estimated effort:** ~2–3 sesje implementacji w 3 fazach (UI-only, bez migracji).

## Open Risks & Assumptions

- Mockup nie pokazuje ceny na kafelku – dodajemy ją według roadmapy (może wymagać drobnej korekty spacingu w stopce).
- `bassmap-pl-ui` jest gitignored – implementer musi mieć folder lokalnie (potwierdzone przez właścicielkę).
- Pin na mapie bez współrzędnych nadal się nie renderuje (istniejące zachowanie).

## Success Criteria (Summary)

- Fan na `/events` widzi siatkę kafelków z wymaganymi polami (nazwa, podgatunki, miejsce, czas, cena).
- Klik kafelka lub pina otwiera stronę wydarzenia; hover podświetla pin.
- `npm run verify` przechodzi; brak regresji filtrów URL.

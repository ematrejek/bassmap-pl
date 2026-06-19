# Sugestie zmian wydarzeń (S-14) – Plan Brief

> Full plan: `context/changes/change-suggestions/plan.md`

## What & Why

Zalogowany fan na stronie **opublikowanego nadchodzącego** wydarzenia może zaproponować konkretne poprawki (data, miasto, venue, adres, cena, opis, lineup, link biletowy) zamiast pisać ogólny komentarz. Admin w panelu otwiera sugestię, widzi wypełnione pola i po **Przyjmij** zapisuje je w bazie – bez ręcznego przepisywania.

**Dlaczego teraz:** S-13 dostarczył tabelę `change_suggestions`, panel admina i tekstową sugestię z flow duplikatu. S-14 domyka FR-020: główna ścieżka „Zasugeruj zmiany” ze strony szczegółów wydarzenia.

## Starting Point

- Tabela `change_suggestions` z `body` (tekst 10–2000 znaków), `source` (`duplicate_flow` | `event_page`), statusy `pending` / `accepted` / `rejected`.
- S-13: fan wysyła **tekst** z dialogu duplikatu (`source = duplicate_flow`); admin **Przyjmij** = tylko zmiana statusu (ręczna edycja eventu).
- RLS INSERT fan: dziś tylko `duplicate_flow`; `event_page` zablokowany.
- Strona `/events/[id]` – brak CTA sugestii; gość widzi tylko treść eventu.
- Panel admina: sekcja „Sugestie zmian” bez kolumny źródła i bez podglądu pól JSON.

## Desired End State

1. Fan (nie-admin) na `/events/[id]` widzi formularz sugestii z polami eventu (opcjonalne – min. jedno wypełnione) + opcjonalny komentarz.
2. Gość widzi tekst z linkiem do logowania (bez przycisku submit).
3. Po wysłaniu – redirect do `/my-events?suggestionSubmitted=1` z wpisem w tabeli „Twoje sugestie”.
4. Admin widzi kolumnę **Źródło** (Duplikat / Strona wydarzenia), przycisk **Otwórz sugestię** → podgląd pól → **Przyjmij** merge’uje payload do eventu i oznacza `accepted`.
5. Sugestie `duplicate_flow` działają jak dotąd (tekst, accept = status only).

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Formularz | Strukturalne pola (core) | Fan wskazuje konkretne poprawki, admin nie zgaduje z tekstu | Plan |
| Pola w scope | Data, miasto, venue, adres/współrzędne, cena, opis, lineup, bilet | Pokrywa typowe błędy w katalogu bez nazwy/podgatunków | Plan |
| Walidacja | Co najmniej jedno pole wypełnione | Elastyczność – fan poprawia tylko to, co wie | Plan |
| Kto wysyła | Tylko fan (nie-admin) | Admin edytuje event bezpośrednio w panelu | Plan |
| Gość | Tekst + link logowania | Jasna ścieżka bez fałszywego przycisku | Plan |
| Po wysłaniu | Redirect do Moje eventy | Spójność z flow S-13 | Plan |
| Wydarzenia | Tylko published + nadchodzące | Zgodnie z roadmapą i `/events/[id]` | Plan |
| Wiele pending | Dozwolone | Prostsze; admin sortuje po dacie | Plan |
| Storage | `payload jsonb` + opcjonalny `body` | Tekst zostaje dla duplicate_flow; JSON dla event_page | Plan |
| Admin Przyjmij | Otwórz → podgląd → merge pól do eventu | Oszczędza czas admina vs ręczne przepisywanie | Plan |
| Kolumna źródła | Tak w tabeli admina | Rozróżnia duplikat vs strona eventu | Plan |

## Scope

**In scope:**

- Migracja: kolumna `payload jsonb`, constraint per `source`, RLS `event_page`, RPC eligibility per source
- Zod: `parseSuggestionPayload` (partial update pól core)
- Serwis: create z `source`, `applyChangeSuggestion` (admin merge)
- API: rozszerzenie `POST /api/fan/change-suggestions`, nowy `POST /api/admin/change-suggestions/[id]/apply`
- UI fan: React island na `events/[id].astro`
- UI admin: kolumna źródła, dialog/podgląd sugestii, apply
- Testy unit + integracja RLS; legal sync; `public-roadmap.ts`

**Out of scope:**

- Zmiana nazwy lub podgatunków przez sugestię
- Okładka w sugestii
- Auto-merge bez akcji admina
- Komentarze (S-15), usuwanie konta (S-16)
- Rate limit / deduplikacja sugestii

## Architecture / Approach

```
/events/[id] (fan, upcoming published)
  → EventSuggestChangesForm (React)
  → POST /api/fan/change-suggestions { eventId, source: "event_page", payload, body? }
  → INSERT change_suggestions (payload + optional body)
  → redirect /my-events?suggestionSubmitted=1

Admin panel
  → ChangeSuggestionsTable (+ kolumna Źródło)
  → „Otwórz sugestię” → ChangeSuggestionReviewDialog
  → event_page + payload: „Przyjmij” → POST .../apply → updateEvent(merged fields) + status accepted
  → duplicate_flow: „Przyjmij” = status only (jak S-13)
```

`payload` używa tych samych nazw pól co `parseEventUpdate` (partial). Apply woła istniejący `updateEvent` (w tym geokodowanie adresu).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Schema | `payload`, RLS `event_page`, RPC eligibility | Migracja constraint na istniejących wierszach |
| 2. Serwis + walidacja | Typy, Zod payload, create/apply | Spójność partial price/location rules |
| 3. API | Fan POST + admin apply | Rozdzielenie accept vs apply dla duplicate_flow |
| 4. UI fan | Formularz na stronie eventu | Duży formularz – reuse fragmentów z EventForm |
| 5. UI admin | Podgląd + apply | UX merge vs bieżące wartości |
| 6. Testy + legal | CI green, polityka/regulamin | Tekst prawny – review właściciela |

**Prerequisites:** S-12 + S-13 done; issue [#26](https://github.com/ematrejek/bassmap-pl/issues/26).

**Estimated effort:** ~2–3 sesje implementacji w 6 fazach.

## Open Risks & Assumptions

- Formularz sugestii reużywa logikę pól z `EventForm` – bez pełnego copy 1300 linii; wycinek pól core.
- Apply lokalizacji uruchamia geokodowanie Nominatim – jak przy zwykłej edycji admina (limit API OSM).
- Istniejące wiersze `duplicate_flow` mają `payload = null` – migracja musi to zachować.

## Success Criteria (Summary)

- Fan wypełnia co najmniej jedno pole na stronie nadchodzącego eventu i widzi sugestię w „Moje eventy”.
- Admin otwiera sugestię ze strony eventu, klika Przyjmij – pola eventu się aktualizują.
- `duplicate_flow` bez regresji; `npm run lint`, `npm run build`, testy sugestii zielone.

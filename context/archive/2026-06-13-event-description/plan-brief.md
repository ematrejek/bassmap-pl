# Pole opisu wydarzenia — Plan Brief

> Full plan: `context/changes/event-description/plan.md`

## What & Why

Dodajemy opcjonalne pole **opis** do wydarzeń DnB. Admin może wpisać dłuższy tekst (np. info o imprezie, dress code, linki); fan widzi go na stronie szczegółów. To pierwszy slice Partii I roadmapy — mały, samodzielny krok przed filtrami dat i nowym layoutem.

## Starting Point

Tabela `events` ma już opcjonalne pola tekstowe (`lineup`, `price`). Brak kolumny `description` w migracjach, typach, Zod schema, `EventForm` i `/events/[id]`. Wzorzec do skopiowania: pole `lineup` (textarea admin → sekcja na stronie szczegółów).

## Desired End State

Admin zapisuje opis przy tworzeniu/edycji wydarzenia. Fan na `/events/[id]` widzi sekcję „Opis” z sformatowanym tekstem (zachowane końce linii), gdy opis istnieje. Gdy opis pusty — sekcja się nie pokazuje. Istniejące wydarzenia działają bez zmian (`description = null`).

## Key Decisions Made

| Decision             | Choice                                 | Why (1 sentence)                                             | Source  |
| -------------------- | -------------------------------------- | ------------------------------------------------------------ | ------- |
| Typ pola w DB        | `text NULL`                            | Elastyczna długość bez sztywnego limitu w Postgres           | Plan    |
| Format treści        | Zwykły tekst (bez Markdown/HTML)       | Prosto, bezpiecznie (brak XSS), jak lineup                   | Plan    |
| Maks. długość        | 5000 znaków (walidacja Zod)            | Wystarczy na opis imprezy; blokuje przypadkowe ściany tekstu | Plan    |
| Pusty opis           | `null` w bazie; sekcja ukryta u fana   | Opcjonalne pole — nie pokazuj pustego bloku                  | Plan    |
| Gdzie pokazać u fana | Tylko strona szczegółów `/events/[id]` | Roadmap S-04; lista/karta bez opisu (czytelność)             | Roadmap |
| Zmiana RLS           | Brak                                   | Opis jest częścią wiersza `events` — te same polityki        | Plan    |

## Scope

**In scope:** migracja SQL, typy TS, mapper, Zod, serwis create/update, formularz admina, sekcja na stronie szczegółów, testy jednostkowe schema.

**Out of scope:** opis na liście/karcie w discovery, Markdown, tłumaczenia EN, edycja opisu przez fanów, SEO/meta description (osobny temat).

## Architecture / Approach

Jedna kolumna `description` w `events` → przepływ identyczny jak `lineup`: `EventRow` → `Event` → Zod → API admin → `createEvent`/`updateEvent` → `EventForm` textarea → Astro szczegóły z `whitespace-pre-wrap`.

## Phases at a Glance

| Phase   | What it delivers                          | Key risk                        |
| ------- | ----------------------------------------- | ------------------------------- |
| 1. Data | Migracja + typy + schema + serwis + testy | Zapomnienie mappera przy update |
| 2. UI   | Formularz admina + strona szczegółów fana | Regresja formularza przy edycji |

**Prerequisites:** MVP done (S-01, S-02); lokalny Supabase lub `db push` do remote.

**Estimated effort:** ~1 sesja, 2 fazy.

## Open Risks & Assumptions

- Assumption: 5000 znaków wystarczy — łatwo podnieść limit w Zod bez migracji DB.
- Assumption: opis nie trafia do listy eventów (Partia II layout może to przejrzeć).

## Success Criteria (Summary)

- Admin zapisuje i edytuje opis bez błędów.
- Fan widzi opis na stronie szczegółów gdy jest wypełniony.
- `npm run lint`, `npm run build`, testy schema przechodzą.

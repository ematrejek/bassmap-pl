# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Fan read queries – jawne filtry niezależnie od RLS

**Context:** `src/lib/services/events.ts` – `listPublishedEvents`, `getPublishedEventById`, `listDistinctCities`

**Problem:** Zapytania „dla fana” polegające wyłącznie na RLS pokazują adminowi szkice i przeszłe eventy na stronach publicznych. Przy skali MVP brak paginacji i DISTINCT po stronie DB zwiększa transfer przy wzroście danych.

**Rule:** Publiczne funkcje read zawsze filtrują `status = published` i nadchodzące daty w kodzie serwisu – nie polegaj wyłącznie na RLS, gdy zalogowany użytkownik ma szersze polityki. Przed skalą produkcyjną dodaj limit/paginację list i `DISTINCT` miast po stronie DB.

**Applies to:** `src/lib/services/*` – ścieżki odczytu dla widoku publicznego (fan discovery, landing pages).

## Archiwum – jawny filtr daty + RLS

**Context:** `listArchivedEvents` w `src/lib/services/events.ts`; migracja `20260615120000_events_select_archive.sql`

**Problem:** Samo RLS na przeszłe eventy nie wystarczy przy szerszych politykach admina; serwis musi jawnie filtrować `published` i `starts_at < dziś` (Warsaw), spójnie z `NOT is_upcoming()`.

**Rule:** Archiwum filtruje w serwisie tak jak discovery filtruje nadchodzące; nowa polityka RLS uzupełnia anon read, nie zastępuje filtra w kodzie.

**Applies to:** `listArchivedEvents`, `/archive`, test `tests/integration/archive-list.test.ts`.

## Typografia – en dash zamiast em dash

**Context:** Copy UI, tytuły stron, komentarze w `src/`, dokumenty aktywnej zmiany.

**Problem:** Długi myślnik em dash (U+2014, `\u2013`) wygląda zbyt ciężko w polskim tekście i bywa niespójny między plikami.

**Rule:** Używaj wyłącznie **en dash** (U+2013, `–`, w JS/CSS `\u2013`). Nie używaj em dash w nowym kodzie ani copy. Przy edycji istniejących plików w `src/` zamieniaj `\u2013` na `–`.

**Applies to:** `src/**`, `context/changes/**` (aktywne zmiany), teksty widoczne dla użytkownika.

## CI – `astro check` przed pushem

**Context:** `tests/unit/event-comments-api.test.ts` (S-15, 2026-06-19); workflow `.github/workflows/ci.yml` i `deploy.yml`

**Problem:** Lokalnie przechodziły `npm test`, `npm run lint` i `npm run build`, ale CI i Deploy padały na `npx astro check`. Hook `pre-push` uruchamiał tylko testy Supabase (gdy jest `.env.test`), a `pre-commit` tylko ESLint – **bez** `astro check`. W testach API route mocki używały `as APIContext` zamiast `as unknown as APIContext`; Vitest to akceptuje, `astro check` nie.

**Rule:** Przed `git push` na `main` uruchom **`npm run verify`** (`astro sync` + `astro check` + `lint:all` + `npm test`). Z Dockerem i `.env.test` dodatkowo **`npm run test:ci`**. W testach handlerów API zawsze mockuj `APIContext` przez **`as unknown as APIContext`** (wzorzec: `tests/unit/fan-change-suggestions-api.test.ts`).

**Applies to:** `tests/unit/*-api.test.ts`, każdy commit na `main`, AGENTS.md §Build.

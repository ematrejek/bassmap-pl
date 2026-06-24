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

## RSVP count aggregation at scale

**Context:** `src/lib/services/event-attendance.ts` – `getAttendanceSummary`

**Problem:** Funkcja pobiera wszystkie wiersze `event_attendance` dla eventu i liczy w JS. Przy dużej liczbie RSVP rośnie transfer i czas odpowiedzi (GET na szczególe + po każdym PUT/DELETE). Na MVP (<100 RSVP/event) akceptowalne.

**Rule:** Przy skali produkcyjnej agreguj liczniki RSVP w SQL (`COUNT` + `FILTER`) lub cache – nie pobieraj wszystkich wierszy do liczenia w TS.

**Applies to:** `getAttendanceSummary`, ścieżki GET/PUT/DELETE `/api/events/[id]/attendance`.

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

## Radix UI – `client:only`, nie `client:load`

**Context:** Komponenty z `@radix-ui/*` (AlertDialog w `DeleteAccountSection`, Checkbox w `SubgenreFilter`, Dialog) na stronach Astro z islandami React (`profile.astro`, `events.astro`).

**Problem:** `client:load` próbuje renderować Radix na serwerze (SSR). Skutek: błąd `useMemo` / invalid hook, biała strona lub wieczne „Ładowanie listy wydarzeń…”. S-20 profil (`AlertDialog`); lista eventów (cache Vite + Checkbox).

**Rule:** Islandy z Radix lub ciężkim stanem klienta używaj **`client:only="react"`** (wzorzec: `DiscoveryShell` na `/events`, `AppMenu`). W `astro.config.mjs` trzymaj Radix w `optimizeDeps.exclude` i `ssr.noExternal`. Nowe dialogi/checkboxy – ten sam wzorzec.

**Applies to:** `src/pages/*.astro` z islandami, `src/components/ui/*`, fazy UI w `/10x-implement`.

## Vite – wyczyść cache po zmianie bundlera

**Context:** `astro.config.mjs` (`optimizeDeps`, `ssr.noExternal`); lokalny `npm run dev`.

**Problem:** Po zmianie configu lub aktualizacji zależności Vite zgłasza brak pliku w `node_modules/.vite/deps/` (np. `@radix-ui_react-checkbox.js`). Strona zostaje na fallbacku „Ładowanie…” mimo zielonych testów Vitest.

**Rule:** Po edycji `astro.config.mjs` lub po ostrzeżeniu Vite o `optimize deps` uruchom **`npm run cache:clean`** i zrestartuj dev server. Przed zamknięciem slicu odpal **`npm run test:e2e`** – łapie wiszący React w przeglądarce.

**Applies to:** `/10x-implement`, debug lokalny, `context/foundation/smoke-checklist.md`.

## Zamknięcie slicu – verify + build + E2E

**Context:** Koniec fazy w `context/changes/<id>/plan.md`; pre-push hook.

**Problem:** `npm run verify` nie uruchamia przeglądarki ani produkcyjnego buildu. Regresje UI (SSR Radix, Vite cache) przechodzą do ręcznego „wszystko się wywaliło”.

**Rule:** Przed pushem na `main`: **`npm run verify`**, potem **`npm run build`**, a przy zmianach UI/configu także **`npm run test:e2e`** (lub jednym **`npm run verify:full`**). Ręcznie testuj tylko **nową funkcję slicu** – stały dymek robi Playwright (`tests/e2e/smoke.spec.ts`). Checklist: `context/foundation/smoke-checklist.md`.

**Applies to:** `/10x-implement`, `/10x-archive`, PR do `main`, AGENTS.md §Build.

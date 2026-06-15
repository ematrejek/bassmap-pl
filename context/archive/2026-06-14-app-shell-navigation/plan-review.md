---
change_id: app-shell-navigation
reviewed_at: 2026-06-14
reviewer: Cursor Agent
plan: context/changes/app-shell-navigation/plan.md
verdict: approved-with-amendments
---

# Plan Review: app-shell-navigation

## Werdykt

**Zatwierdzony z poprawkami** – plan jest wykonalny, spójny z `frame.md` i roadmapą F-04/S-09/S-10. Poprawki z tego przeglądu zostały wpisane do `plan.md`. Można startować **`/10x-implement`**.

## Scorecard (5 punktów)

| Obszar                   | Ocena | Uwagi                                                                                                 |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------- |
| **Zgodność z produktem** | 5/5   | Routing `/` + `/events`, copy, menu gościa, archiwum – zgodne z frame (2026-06-14).                   |
| **Architektura**         | 4/5   | AppShell + islands + `routes.ts` – dobre; doprecyzowano dostęp do EMAIL binding i `ArchiveEventList`. |
| **Wykonalność faz**      | 5/5   | 5 faz logicznie uporządkowanych; zależności jasne.                                                    |
| **Testowalność**         | 4/5   | Integracja archiwum + schema formularza – OK; brak E2E redirect (akceptowalne przy MVP).              |
| **Ryzyka / deploy**      | 4/5   | Email Sending wymaga kroku operatorskiego – opisane; spam bez Turnstile – świadomie odłożone.         |

**Średnia: 4.4/5**

## Mocne strony

1. **Jeden vertical slice** – F-04 + S-09 + S-10 w jednym PR to sensowne; unika podwójnego refactoru layoutu.
2. **`src/lib/routes.ts`** – centralizacja tras zamiast rozproszonych `href="/"` (dziś jest ich 8+ w kodzie).
3. **Redirect w middleware** – 302 przed renderem; nie obciąża `index.astro`.
4. **Archiwum** – nowa polityka RLS + jawny filtr w serwisie (zgodnie z `lessons.md`).
5. **Scope control** – jasne „What We're NOT Doing” (S-12, WebGL, ticket w DB).
6. **Progress checklist** – gotowy pod `/10x-implement` z commit sha.

## Znalezione luki (i poprawki)

### 1. Angielskie URL (decyzja użytkownika 2026-06-14)

| Było w planie    | Po poprawce         |
| ---------------- | ------------------- |
| `/zglos-problem` | **`/report-issue`** |
| `/archiwum`      | **`/archive`**      |

Etykiety w menu **po polsku** („Zgłoś problem”, „Archiwum wydarzeń”). Istniejące `/polityka-prywatnosci` i `/regulamin` **bez zmian** (już na produkcji).

### 2. `EventList` nie nadaje się na archiwum

`EventList.tsx` używa `button` + `onSelectEvent` pod mapę – na `/archive` potrzebny **`ArchiveEventList.tsx`** z linkami do `/events/[id]`. Wpisane w planie.

### 3. `DISCOVERY_PATH` w fazie 1 vs 2

Menu w fazie 1 nie może linkować do `/events` zanim strona powstanie. Plan: faza 1 → `DISCOVERY_PATH = "/"`; faza 2 → `"/events"`.

### 4. Cloudflare Email w Astro API

Plan uzupełniony o wzorzec: `context.locals.runtime.env.EMAIL` + 503 gdy binding brak (typowy dev lokalny).

### 5. Props do `AppMenu` island

Serializować tylko `userEmail` + `isAdmin` – nie cały obiekt Supabase User.

### 6. Spam / rate limit

MVP bez Turnstile – akceptowalne; ryzyko dodane do tabeli; ewentualnie osobny slice.

## Otwarte (nie blokują implementacji)

- Wizualna akceptacja neonów – dopiero na dev po fazie 1/3.
- Czy auth strony dostają pełny AppShell – plan sugeruje minimalny powrót; OK na MVP.
- Aktualizacja `frame.md` – zsynchronizowano trasy na angielskie (poniżej).

## Rekomendacja kolejności

Zacząć od **fazy 1** (`/10x-implement`), nie skracać faz – faza 2 (routing) jest krytyczna przed deployem na produkcję.

## Następny krok

`/10x-implement app-shell-navigation`

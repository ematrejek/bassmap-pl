---
change_id: fan-account-zone
reviewed_at: 2026-06-14
reviewer: Cursor Agent
plan: context/archive/2026-06-15-fan-account-zone/plan.md
verdict: approved-with-amendments
---

# Plan Review: fan-account-zone

## Werdykt

**Zatwierdzony z poprawkami** – plan jest wykonalny, spójny z roadmapą S-12 i stanem kodu po F-04/S-10. Poprawki z tego przeglądu zostały wpisane do `plan.md`. Można startować **`/10x-implement fan-account-zone`**.

## Scorecard (5 punktów)

| Obszar | Ocena | Uwagi |
|--------|-------|-------|
| **Zgodność z produktem** | 4/5 | Zakres S-12 (menu, profil, submit, placeholdery, moderacja) kompletny; doprecyzowano: menu fana **tylko dla nie-admina** (roadmap L315). |
| **Architektura** | 4/5 | Reużycie schema + serwisu + EventForm sensowne; doprecyzowano `created_by` w INSERT, PATCH status, kolejność middleware vs strony. |
| **Wykonalność faz** | 4/5 | 5 faz logiczne; fazy 3–4 lekko przestawione (routing przed stronami). |
| **Testowalność** | 4/5 | Nowy `fan-event-submit.test.ts` + aktualizacja deny – OK; brak E2E przeglądarki (akceptowalne przy MVP). |
| **Ryzyka / deploy** | 4/5 | Migracja RLS + `db push` opisane; spam bez Turnstile świadomie odłożone; PRD Non-Goals nadal rozjechany. |

**Średnia: 4.0/5**

## Mocne strony

1. **Reuse admin stack** – `parseEventCreate`, geokodowanie, `AdminEventsTable` status badges – minimalny nowy kod.
2. **Enum `pending` już w DB** – migracja tylko dodaje `created_by` + polityki, nie zmienia modelu statusów.
3. **Jawne filtry w serwisie** – zgodnie z `lessons.md` (`listEventsByCreator` + public read bez zmian).
4. **Scope control** – brak okładek fana, brak S-13–S-16, brak `profiles` – sensowne odcięcie.
5. **Moderacja admina** – Opublikuj/Odrzuć domyka pętlę FR-018 (submit → publish → discovery).
6. **Progress checklist** – gotowy pod `/10x-implement`.

## Znalezione luki (i poprawki)

### 1. Menu fana vs admin (roadmap)

Roadmap S-12: *„po zalogowaniu **fan (nie admin)** widzi zakładki…”*.

| Było w planie | Po poprawce |
|---------------|-------------|
| Admin widzi fanLinks + Panel admina | **`fanLinks` tylko gdy `!isAdmin`**; admin: navLinks publiczne + Panel admina + Wyloguj |
| Fan API zwraca 403 dla admina | **OK** – admin dodaje w `/admin/events/new` (published); fan API tylko dla fanów |

### 2. `created_by` musi trafić do wiersza INSERT

Polityka `events_insert_fan` wymaga `created_by = auth.uid()` w `WITH CHECK`. Serwis **musi** ustawić kolumnę w `toEventInsertRow` – samo RLS nie wypełni pola.

### 3. Kolejność faz 3 vs 4

Strony fan w fazie 3 bez middleware z fazy 4 byłyby publiczne. **Poprawka:** faza 3 zaczyna się od `routes.ts` + `middleware.ts` (PROTECTED_ROUTES + redirect `/dashboard`); AppMenu + AdminEventsTable moderacja zostają w fazie 4.

### 4. PATCH status – pierwszy endpoint PATCH w repo

Brak istniejących `export const PATCH` w `src/pages/api/`. Astro obsługuje PATCH jak POST/PUT. Alternatywa: rozszerzyć `PUT /api/admin/events/[id]` o opcjonalne pole `status` – **plan zostaje przy dedykowanym `status.ts`** (czytelniejsze, mniejszy diff w istniejącym PUT).

### 5. Test `auth-mutation-deny.test.ts`

Nie zmieniać istniejącego testu „non-admin create FAIL” – `createEvent()` nadal tworzy `published`. Nowy flow testować przez **`createFanSubmittedEvent()`** w osobnym pliku `fan-event-submit.test.ts`. Stary test zostaje bez zmian (deny published).

### 6. `DASHBOARD_PATH` → `PROFILE_PATH`

Zastąpić stałą w `routes.ts`; `DASHBOARD_PATH` usunąć lub aliasować na `PROFILE_PATH` tylko na czas redirectu w middleware. Grep: 3 miejsca dziś (`routes.ts`, `middleware.ts`, `AppMenu.tsx`).

### 7. Ochrona `/my-events/new`

`PROTECTED_ROUTES` z `.startsWith()` – wpis **`MY_EVENTS_PATH`** (`/my-events`) obejmuje też `/my-events/new`. Jawne dopisanie w planie.

### 8. Ekstrakcja `STATUS_LABELS`

Nie opcjonalnie – **wymusić** `src/lib/events/status-labels.ts` współdzielony przez `AdminEventsTable` i `FanEventsTable` (DRY).

### 9. `setEventStatus` – walidacja przejścia

Tylko `pending` → `published` | `rejected`. Inne przejścia → 400. Admin nie może „cofnąć” published do pending przez ten endpoint (edycja pełna w osobnym flow).

### 10. Admin widzi zgłoszenie – kto wysłał (MVP)

Kolumna `created_by` w DB wystarczy; **UI admina bez email zgłaszającego w MVP** (join auth wymaga service role / RPC). Ryzyko zaakceptowane; ewentualnie w S-13.

## Otwarte (nie blokują implementacji)

- Aktualizacja `prd.md` (Non-Goals, NFR Privacy) – osobna decyzja produktowa.
- Sort pending na górze listy admina – nice-to-have; badge wystarczy.
- Rate limit / Turnstile na fan submit – kolejny slice.
- Czy admin kiedyś dostanie „Moje eventy” – poza S-12; dziś admin nie ma `created_by` na własnych insertach.

## Rekomendacja kolejności

Zacząć od **fazy 1** (migracja + serwis + test RLS). Nie wdrażać stron fan przed migracją na remote (`db push`). Faza 2 (API) przed fazą 3 (UI).

## Następny krok

`/10x-implement fan-account-zone`

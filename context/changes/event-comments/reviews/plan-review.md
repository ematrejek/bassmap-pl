---
change_id: event-comments
reviewed_at: 2026-06-19
reviewer: Cursor Agent
plan: context/changes/event-comments/plan.md
verdict: approved-with-amendments
---

# Plan Review: event-comments (S-15)

## Werdykt

**Zatwierdzony z poprawkami** – plan jest wykonalny, spójny z roadmapą S-15, PRD FR-021 i wzorcami z S-13/S-14. Poprawki z tego przeglądu zostały wpisane do `plan.md`. Można startować **`/10x-implement event-comments`**.

## Scorecard (5 punktów)

| Obszar | Ocena | Uwagi |
| ------ | ----- | ----- |
| **Zgodność z produktem** | 5/5 | FR-021 w pełni: public read, auth write, admin delete; schema gotowa pod S-16 (`author_label` + `ON DELETE SET NULL`). |
| **Architektura** | 4/5 | Osobna tabela UGC, denormalizacja `author_label` – właściwa decyzja; drobna niespójność nazewnictwa tras API (poprawiona). |
| **Wykonalność faz** | 5/5 | 5 faz logicznych, zakres ~2 sesje realistyczny; reuse `formatEventDate`, `SIGN_IN_PATH`, wzorce API. |
| **Testowalność** | 4/5 | Unit + integracja RLS jak S-14; brak E2E przeglądarki – akceptowalne przy MVP. |
| **Ryzyka / deploy** | 4/5 | Brak rate limitu świadomie; hard delete wymaga doprecyzowania w legal; `user.email` może być puste. |

**Średnia: 4.4/5**

## Mocne strony

1. **Denormalizacja `author_label`** – brak ujawniania e-maili w publicznym API; gotowe pod anonimizację S-16 bez joinów do auth.
2. **RLS wzorzec S-13** – SELECT `anon` + `authenticated`, INSERT z `auth.uid()`, DELETE `is_admin()`; brak UPDATE = brak edycji przez lukę.
3. **Spójność ze stroną eventu** – komentarze na wszystkich `published` (w tym archiwum), w przeciwieństwie do sugestii (tylko upcoming) – świadoma, poprawna różnica.
4. **Scope control** – brak rate limitu, edycji, panelu admina, soft delete – sensowne MVP.
5. **S-16 handoff** – jawny UPDATE `author_label` / `author_id` w planie, nie w scope implementacji.
6. **Legal sync** w fazie 5 – zgodnie z AGENTS.md dla slice UGC.

## Znalezione luki (i poprawki)

### 1. Nazwa parametru trasy API

| Było w planie | Po poprawce |
| ------------- | ----------- |
| `src/pages/api/events/[eventId]/comments.ts` | **`src/pages/api/events/[id]/comments.ts`** – jak `admin/events/[id].ts`, `fan/events/[id]/cover.ts` |

W handlerze: `context.params.id`, nie `eventId`.

### 2. Brak e-maila użytkownika przy INSERT

`User.email` w Supabase może być `undefined`. Przy `createEventComment` – jeśli brak e-maila, zwróć **400** z komunikatem po polsku albo fallback `author_label = "Użytkownik"` (preferowane: **400**, bo profil też zakłada e-mail).

### 3. Osobny plik `comment-format.ts`

`formatEventDate` w `src/lib/events/format.ts` już formatuje `pl-PL` + `Europe/Warsaw`. **Nie tworzyć** nowego pliku – reuse `formatEventDate` dla daty komentarza.

### 4. Pusty stan listy (UX)

Plan nie wspomina o UI gdy 0 komentarzy. Dodać w Phase 4: tekst **„Brak komentarzy. Bądź pierwszy!”** (lub krótszy wariant).

### 5. `plan-brief.md` – drobna niespójność

Brief mówi „SSR: listEventComments + resolve author labels”, podczas gdy plan słusznie używa kolumny `author_label`. To tylko kosmetyka briefu – implementacja według `plan.md`.

### 6. Legal – hard delete przez admina

Przy aktywacji §2.8 dopisać: komentarz usunięty przez Administratora **nie jest odzyskiwalny**; retencja dotyczy komentarzy widocznych do momentu usunięcia (spójnie z §6 regulaminu – zgłoszenia naruszeń).

### 7. `authorId` w odpowiedzi publicznej API

Typ `EventComment` zawiera `authorId`. Publiczny GET może go zwracać (UUID nie jest e-mailem). **Opcjonalnie** pominąć `authorId` w JSON dla gości – nie blokuje MVP; S-16 i tak zeruje pole przy anonimizacji.

### 8. `public-roadmap.ts`

Wpis S-15 dodany już przy `/10x-plan` – faza 5 może to traktować jako done; usunąć dopiero przy `/10x-archive`.

## Otwarte (nie blokują implementacji)

- Rate limit / Turnstile na komentarze – kolejna iteracja po walidacji rynku.
- Fan usuwa własny komentarz – poza FR-021 MVP.
- Panel admina z listą wszystkich komentarzy – poza scope; moderacja na stronie eventu wystarczy.
- Paginacja / „załaduj więcej” – przy dziesiątkach komentarzy na event wystarczy pełna lista.
- E2E Playwright – nie w planie; manual checklist wystarczy przed archive.

## Rekomendacja kolejności

Zacząć od **fazy 1** (migracja + typy). **Faza 2** (serwis) przed **fazą 3** (API). **Faza 4** (UI) dopiero po zielonym POST w testach. Legal (**faza 5**) w tej samej sesji co kod – przed deployem na produkcję.

## Następny krok

`/10x-implement event-comments`

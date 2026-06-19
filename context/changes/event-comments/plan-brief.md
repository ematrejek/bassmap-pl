# Komentarze pod wydarzeniami (S-15) – Plan Brief

> Full plan: `context/changes/event-comments/plan.md`

## What & Why

Pod stroną szczegółów wydarzenia fani mogą zostawić krótki komentarz (np. „kto jedzie?”, „było zajebiście”). Goście czytają bez logowania; pisanie wymaga konta. Admin usuwa treści nie na miejscu.

**Dlaczego teraz:** S-12 dało konta fanów, S-14 domknął sugestie zmian. Komentarze to kolejny krok społecznościowy (FR-021) i **wymagają** wdrożenia przed S-16 (usuwanie konta z anonimizacją autora komentarzy).

## Starting Point

- Strona `/events/[id]` – treść wydarzenia + formularz sugestii (S-14); **brak sekcji komentarzy**.
- Baza – tabela `events`, `change_suggestions`; **brak tabeli komentarzy**.
- Auth – Supabase cookie SSR, `locals.user` / `locals.isAdmin`.
- Wyświetlanie autora – wzorzec `resolveSubmitterProfiles` + `loginFromEmail` (panel admina); profil fana używa `profileFromEmail` z lokalnej części e-maila.
- Polityka prywatności §2.8 – „planowana funkcja”; regulamin – brak § o komentarzach publicznych.

## Desired End State

1. Gość i zalogowany użytkownik na `/events/[id]` (published, nadchodzące **lub** archiwalne) widzi listę komentarzy (autor + treść + data).
2. Zalogowany użytkownik (fan lub admin) może dodać komentarz (1–2000 znaków); gość widzi tekst z linkiem do logowania.
3. Admin widzi przy każdym komentarzu przycisk **Usuń**; usunięcie jest trwałe (hard delete).
4. API + RLS: publiczny odczyt, insert tylko dla zalogowanych na opublikowanym evencie, delete tylko admin.
5. Polityka i regulamin opisują komentarze; `LEGAL_UPDATED_AT` zaktualizowany.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Tabela | `event_comments` | Osobna encja UGC, nie mieszać ze `change_suggestions` | Plan |
| Autor publiczny | `author_label` (snapshot przy dodaniu) | Bez ujawniania e-maila; gotowe pod S-16 („Usunięty użytkownik”) | Plan + FR-022 |
| `author_id` | FK `auth.users` ON DELETE SET NULL | S-16 odłączy tożsamość bez kasowania treści | Roadmap S-16 |
| Kto komentuje | Każdy zalogowany (fan + admin) | Roadmap: „zalogowany użytkownik” | Roadmap |
| Które eventy | Wszystkie `published` (nadchodzące + archiwum) | `getPublishedEventById` już obsługuje oba; komentarze po evencie mają sens | Plan |
| Kolejność listy | `created_at ASC` | Chronologiczna rozmowa | Plan |
| Edycja komentarza | Brak | MVP – tylko dodaj + admin delete | Roadmap unknowns |
| Moderacja treści | Tylko admin delete | Zgodnie z unknowns roadmapy | Roadmap |
| Rate limit | Poza MVP | Prostszy start; ewentualnie w kolejnej iteracji | Plan |
| UI admina | Usuń na stronie eventu (`isAdmin`) | Wystarczy na MVP; osobna tabela w panelu – out of scope | Plan |
| SSR + island | Początkowa lista SSR, nowe przez POST + optimistic/refresh | Spójne z resztą Astro SSR | Plan |

## Scope

**In scope:**

- Migracja `event_comments` + RLS (SELECT public, INSERT auth, DELETE admin)
- Helper `authorLabelFromEmail` (współdzielony z profilem)
- Serwis `event-comments.ts` (list, create, delete)
- API: `GET/POST /api/events/[id]/comments`, `DELETE /api/admin/event-comments/[id]`
- React island `EventCommentsSection` na `events/[id].astro`
- Testy unit + integracja RLS
- Legal sync §2.8 + nowy § regulaminu; `public-roadmap.ts`

**Out of scope:**

- Edycja własnego komentarza
- Raportowanie komentarza przez użytkownika (jest §6 regulaminu e-mail)
- Filtr wulgaryzmów / AI moderacja
- Rate limiting / anty-spam w DB
- Usuwanie konta (S-16) – ale schema **przygotowana** (`author_id` nullable, `author_label`)
- Osobna sekcja komentarzy w panelu admina
- Powiadomienia e-mail o nowych komentarzach

## Architecture / Approach

```
/events/[id] (published)
  → SSR: listEventComments + resolve author labels
  → EventCommentsSection (React, client:visible)
      → gość: lista + „Zaloguj się, aby skomentować”
      → zalogowany: textarea + Wyślij → POST /api/events/[id]/comments
      → admin: przycisk Usuń → DELETE /api/admin/event-comments/[id]

event_comments
  id, event_id, author_id (nullable po S-16), author_label, body, created_at
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Schema | Tabela + RLS + indeksy | Policy SELECT musi wymagać `published` eventu |
| 2. Serwis + typy | CRUD, walidacja body | Spójność `author_label` z UI profilu |
| 3. API | GET public, POST auth, DELETE admin | Poprawne kody błędów (404 event, 401 gość) |
| 4. UI event page | Lista + formularz + admin delete | Hydratacja island bez migotania |
| 5. Testy + legal | CI green, dokumenty prawne | Tekst prawny – review właściciela |

**Prerequisites:** S-12 done; issue [#27](https://github.com/ematrejek/bassmap-pl/issues/27).

**Estimated effort:** ~2 sesje implementacji w 5 fazach.

## Open Risks & Assumptions

- Brak rate limitu – przy nadużyciu admin usuwa ręcznie (akceptowalne na start).
- `author_label` z e-maila to heurystyka (jak profil) – nie prawdziwe imię użytkownika.
- Komentarze na archiwalnych eventach mogą rosnąć bez moderacji proaktywnej – admin reaguje na zgłoszenia.

## Success Criteria (Summary)

- Gość widzi komentarze bez logowania.
- Fan dodaje komentarz → pojawia się na liście z etykietą autora.
- Admin usuwa komentarz → znika z listy.
- `npm run lint`, `npm run build`, testy komentarzy zielone.

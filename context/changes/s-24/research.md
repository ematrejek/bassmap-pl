---
date: 2026-06-25T22:15:00+02:00
researcher: Cursor Agent
git_commit: e9209214abc44c776d47084e08ee0fa2b8df579e
branch: main
repository: bassmap-pl
topic: "S-24 Moja ekipa (pełna funkcja) – stan kodu, zależności i wzorce do reużycia"
tags: [research, codebase, crew-teams, forum, friends, s-24]
status: complete
last_updated: 2026-06-25
last_updated_by: Cursor Agent
last_updated_note: "Resolved contact data decision – login + social links"
---

# Research: S-24 Moja ekipa (pełna funkcja)

**Date**: 2026-06-25T22:15:00+02:00  
**Researcher**: Cursor Agent  
**Git Commit**: `e9209214abc44c776d47084e08ee0fa2b8df579e`  
**Branch**: main  
**Repository**: [ematrejek/bassmap-pl](https://github.com/ematrejek/bassmap-pl)

## Research Question

Jaki jest aktualny stan kodu i produktu dla slice'a **S-24** (`crew-teams`, GitHub [#44](https://github.com/ematrejek/bassmap-pl/issues/44))? Co już istnieje (forum S-22, znajomi S-23), czego brakuje (ekipy, prośby o dołączenie, szablon forum, kontakt po akceptacji) i jakie wzorce architektoniczne należy skopiować przy planowaniu?

## Summary

**S-24** to największy slice społecznościowy Partii III. Fan ma móc utworzyć **ekipę** (nazwa, opcjonalnie miasto, podgatunki, opis), zobaczyć członków, opublikować wątek forum z szablonem **«Szukam ludzi do ekipy»** (z wyborem ekipy), a kandydat ma złożyć **prośbę o dołączenie** – właściciel akceptuje lub odrzuca, po czym udostępniane są **dane kontaktowe**.

**Stan kodu (2026-06-25):**

| Obszar | Stan | Uwagi |
|--------|------|-------|
| Strona `/team` | Częściowo zajęta przez S-23 | Renderuje `FriendsDashboard` – znajomi działają, ekipy nie |
| Model danych ekipy | Brak | Zero tabel `crews`/`teams`, zero API |
| Forum – kategorie ekipowe | Gotowe | `szukam_ekipy`, `jestesmy_ekipa` w DB i UI |
| Forum – szablon wątku | Brak | Formularz startuje z pustym `body` |
| Prośby o dołączenie | Brak | Świadomie odłożone z S-22 i S-23 |
| Powiadomienia ekipowe | Brak | CHECK typów zamknięty na 3 wartości S-23 |
| Udostępnianie kontaktu | Brak | Otwarta decyzja produktowa (blokuje planowanie) |

**Zależności S-22 i S-23 są spełnione** (`done`). Największy wzorzec do skopiowania to flow zaproszeń znajomych (tabela statusowa + RPC atomowe + powiadomienia). Największa luka net-new to **wymiana danych kontaktowych po akceptacji** – w S-23 celowo nie udostępniano prywatnych danych.

**Ważna rozbieżność roadmapy ze stanem kodu:** roadmap mówi „zastąp placeholder `/team`", ale S-23 już zamienił placeholder w działającą stronę znajomych. S-24 powinien **rozbudować** `/team` (zakładki: znajomi + ekipa), a nie usuwać funkcję znajomych.

## Detailed Findings

### 1. Produkt i zakres (roadmap, PRD, shaping)

**Outcome S-24** (`context/foundation/roadmap.md`):

- Fan tworzy ekipę: nazwa, opcjonalnie miasto, podgatunki, opis.
- Widzi członków ekipy.
- Publikuje wątek forum z szablonem «Szukam ludzi do ekipy» z wyborem konkretnej ekipy.
- Kandydat składa prośbę → właściciel akceptuje/odrzuca → udostępnienie danych kontaktowych.

**Prerequisites:** S-22 (forum), S-23 (znajomi) – oba `done`.

**Świadomie poza S-22** (`roadmap.md:542`): szablony ekip, prośby o dołączenie → S-24.

**Świadomie poza S-23** (`context/archive/2026-06-25-friends-and-recommendations/plan.md:42`): pełna funkcja ekipy.

**Partia III – kolejność** (`context/foundation/partia-iii-shaping.md`): S-22 → S-23 → **S-24** (forum → znajomi → pełna Moja ekipa).

**GitHub [#44](https://github.com/ematrejek/bassmap-pl/issues/44):** tytuł „Moja ekipa: pełna funkcja", status `OPEN`, label `roadmap`.

**Ryzyko:** największy slice społecznościowy Partii III – nie łączyć z S-22 (osobny change `crew-teams`).

### 2. Aktualna strona `/team` (most S-23 → S-24)

Plik: [`src/pages/team.astro`](https://github.com/ematrejek/bassmap-pl/blob/e9209214abc44c776d47084e08ee0fa2b8df579e/src/pages/team.astro)

- Tytuł i nagłówek: **„Znajomi i ekipa"**.
- Jedyny komponent: `FriendsDashboard` z `client:only="react"`.
- Trasa chroniona w middleware (`TEAM_PATH` w `PROTECTED_ROUTES`).
- Menu (`AppMenu.tsx`): link „Znajomi i ekipa" → `/team` (fan i admin).

**Wniosek:** S-23 zajął trasę `/team` funkcją znajomych. S-24 dodaje warstwę ekipową obok znajomych (np. zakładki lub sekcje), zamiast „zastępować placeholder".

### 3. Forum (S-22) – co jest gotowe, czego brakuje

**Migracja:** `supabase/migrations/20260624140000_forum_threads.sql`

- Tabele: `forum_threads`, `forum_comments`.
- Kategorie jako `CHECK` na `text` (nie enum Postgres): m.in. `szukam_ekipy`, `jestesmy_ekipa`.
- RLS: publiczny SELECT; INSERT dla zalogowanych; DELETE wątku tylko admin; DELETE komentarza autor lub admin.

**Metadane działów:** [`src/lib/forum/thread-schema.ts`](https://github.com/ematrejek/bassmap-pl/blob/e9209214abc44c776d47084e08ee0fa2b8df579e/src/lib/forum/thread-schema.ts)

- `szukam_ekipy` → label „Szukam ekipy" (violet).
- `jestesmy_ekipa` → label „Dołącz do nas" (green).

**Brak systemu szablonów:** `ForumCreateThreadForm.tsx` startuje z pustym polem `body`. Użytkownik pisze treść od zera. Roadmapowy „szablon «Szukam ludzi do ekipy»" to logika frontu (prefill + wybór ekipy), ewentualnie powiązanie wątku z rekordem ekipy (`crew_id` na `forum_threads`).

**Wzorzec pionu do skopiowania dla ekip:**

| Warstwa | Plik wzorcowy |
|---------|---------------|
| Migracja + RLS | `20260624140000_forum_threads.sql` |
| Schema Zod | `src/lib/forum/thread-schema.ts` |
| Serwis CRUD | `src/lib/services/forum-threads.ts` |
| API routes | `src/pages/api/forum/threads/` |
| UI island | `src/components/forum/ForumView.tsx`, `ForumCreateThreadForm.tsx` |

### 4. Znajomi (S-23) – wzorzec dla próśb o dołączenie

**Migracja:** `supabase/migrations/20260625100000_friends_recommendations_notifications.sql`

Kluczowe mechanizmy do skopiowania dla `crew_join_requests`:

1. **Tabela statusowa** – jedna tabela na zaproszenie i relację (`pending` / `accepted` / `declined`).
2. **Trigger immutable columns** – po utworzeniu zmienia się tylko `status`.
3. **RLS triada** – SELECT dla stron, INSERT dla inicjatora, UPDATE tylko dla odbiorcy (dla ekip: właściciel) gdy `pending`.
4. **RPC atomowe** – `create_*_with_notification` i `respond_*_with_notification` (mutacja + powiadomienie w jednej transakcji).
5. **Decline = DELETE** – para może ponowić prośbę (`20260625140000_friend_request_decline_delete.sql`).
6. **Serwis + API** – `src/lib/services/friends.ts`, `src/pages/api/fan/friends/requests/`.

**Różnica dla ekip:** unikalność `(crew_id, requester_id)` zamiast normalizacji pary LEAST/GREATEST (prośba jest kierunkowa: kandydat → ekipa).

**Powiadomienia – wymagane rozszerzenie:**

- Obecny CHECK: `friend_request`, `friend_request_accepted`, `event_recommendation`.
- S-24 potrzebuje nowych typów (np. `crew_join_request`, `crew_join_accepted`) i FK `crew_join_request_id` na tabeli `notifications`.
- Wstawianie wyłącznie przez RPC `create_notification` (brak szerokiej polityki INSERT).

### 5. Dane kontaktowe – decyzja produktowa

**Rozstrzygnięte 2026-06-25** (Owner: user): po akceptacji prośby o dołączenie do ekipy udostępniane są:

1. **Login** użytkownika (zawsze).
2. **Linki do social media** z profilu fana – tylko pola, które użytkownik uzupełnił:
   - Instagram (`instagram_url`)
   - SoundCloud (`soundcloud_url`)
   - Facebook (`facebook_url`)
   - Spotify (`spotify_url`)
   - Twitch (`twitch_url`)

**Świadomie poza zakresem:** e-mail konta (`auth.users`) – zgodnie z S-23, gdzie znajomi widzą tylko login, nie prywatny adres.

**Źródło danych:** `fan_profiles` przez `FAN_PROFILE_SELECT` w `src/lib/services/fan-profile.ts`. Profil publiczny pod `/u/{login}` już eksponuje te pola – kontakt po akceptacji to kontrolowane ujawnienie tych samych danych w kontekście ekipy (właściciel ↔ zaakceptowany kandydat, obustronnie po akceptacji).

**Implikacje dla planu:**

- API akceptacji zwraca snapshot kontaktu (login + niepuste URLe social), nie pełny profil.
- UI: sekcja „Kontakt" po akceptacji – login jako link do `/u/{login}` + ikony/linki social.
- Legal sync przy archiwizacji: doprecyzować w polityce/regulaminie, że dane kontaktowe w ekipie = login + social z profilu, udostępniane wyłącznie po akceptacji obu stron.

### 6. Legal / UGC

S-24 jest na liście slice'ów UGC wymagających **legal sync przy archiwizacji** (`roadmap.md:627`):

- `src/pages/privacy-policy.astro`
- `src/pages/terms.astro`
- `LEGAL_UPDATED_AT` w `src/lib/legal/paths.ts`

Regulamin już zapowiada stopniowe udostępnianie „Moja ekipa" (`terms.astro:48`). Przy wdrożeniu wymiany kontaktu trzeba doprecyzować: jakie dane, kiedy, komu, na jakiej podstawie prawnej.

### 7. Usuwanie konta

`src/lib/services/account-deletion.ts` anonimizuje `forum_threads` i `forum_comments`. Nowe tabele ekip i próśb trzeba dodać do tej samej ścieżki (wzorzec z archiwum forum-threads).

## Code References

- `src/pages/team.astro:10-15` – strona „Znajomi i ekipa" z `FriendsDashboard` (brak UI ekipy)
- `src/lib/routes.ts:20` – `TEAM_PATH = "/team"`
- `src/components/shell/AppMenu.tsx:50-62` – menu „Znajomi i ekipa"
- `src/middleware.ts:4-7` – `/team` w `PROTECTED_ROUTES`
- `src/lib/forum/thread-schema.ts:6-35` – kategorie `szukam_ekipy`, `jestesmy_ekipa`
- `supabase/migrations/20260624140000_forum_threads.sql` – model forum + RLS
- `supabase/migrations/20260625100000_friends_recommendations_notifications.sql:7-301` – `friend_requests`, `notifications`, RLS
- `supabase/migrations/20260625130000_atomic_friend_and_recommendation_writes.sql` – RPC atomowe
- `supabase/migrations/20260625140000_friend_request_decline_delete.sql` – decline=delete + accept=notify
- `src/lib/services/friends.ts:11-381` – serwis zaproszeń (wzorzec dla ekip)
- `src/lib/services/fan-profile.ts:7-8` – pola profilu dostępne jako potencjalny kontakt
- `src/pages/terms.astro:48` – zapowiedź pełnej funkcji Moja ekipa

## Architecture Insights

1. **SSR-first + React islands** – dane początkowe z `.astro`, mutacje przez `fetch` do API (`prerender = false`).
2. **Warstwa serwisowa** – `{ data } | { error }`, polskie stałe błędów, mapowanie kodów PG (`23505`, `42501`).
3. **RLS + jawne filtry** – polityki per operacja; helpery `SECURITY DEFINER` dla złożonej logiki.
4. **Atomowe RPC** – mutacja stanu + powiadomienie w jednej transakcji (wzorzec S-23).
5. **Radix / dialogi** – `client:only="react"` (lekcja z `lessons.md`).
6. **Synchronizacja kategorii** – CHECK w SQL, enum w `types.ts`, tablica w `thread-schema.ts` (trzy miejsca).

**Rekomendacja architektoniczna dla S-24:**

- Nowe tabele: `crews`, `crew_members`, `crew_join_requests`.
- Opcjonalne `crew_id` na `forum_threads` (powiązanie ogłoszenia rekrutacyjnego z ekipą).
- Szablon forum = wariant formularza `ForumCreateThreadForm` z prefill i selektorem ekipy (bez osobnej tabeli szablonów).
- Strona `/team` = zakładki lub sekcje: Znajomi (istniejące) + Moja ekipa (nowe).

## Historical Context (from prior changes)

- [`context/archive/2026-06-24-forum-threads/plan.md`](context/archive/2026-06-24-forum-threads/plan.md) – „Nie robimy ekip, szablonów ekip ani próśb o dołączenie – to S-24."
- [`context/archive/2026-06-24-forum-threads/research.md`](context/archive/2026-06-24-forum-threads/research.md) – mapowanie zależności S-22 → S-24; kategorie forum gotowe pod rekrutację.
- [`context/archive/2026-06-25-friends-and-recommendations/plan.md`](context/archive/2026-06-25-friends-and-recommendations/plan.md) – „No full crew/team feature from S-24"; `/team` jako miejsce na przyszłą ekipę przy zachowaniu znajomych.
- [`context/archive/2026-06-23-fan-profile-edit/plan.md`](context/archive/2026-06-23-fan-profile-edit/plan.md) – status ekipy świadomie odłożony do S-22/S-24.
- [`context/foundation/roadmap.md`](context/foundation/roadmap.md) – kanoniczny opis S-24 i Open Question #7.

## Related Research

- `context/archive/2026-06-24-forum-threads/research.md` – forum MVP, deferrals do S-24
- `context/archive/2026-06-25-friends-and-recommendations/` – znajomi, granice zakresu względem S-24

## Open Questions

1. ~~**Jakie dane kontaktowe po akceptacji?**~~ **Resolved 2026-06-25:** login + linki social z profilu (bez e-maila).
2. **Layout `/team`:** zakładki „Znajomi" | „Moja ekipa" vs jedna strona z sekcjami – do ustalenia w planie.
3. **Powiązanie forum–ekipa:** `crew_id` na wątku vs osobna encja linkująca – rekomendacja: `crew_id` nullable na `forum_threads`.
4. **Powiadomienie przy odrzuceniu prośby:** S-23 przy decline nie wysyła powiadomienia – czy ekipa ma ten sam wzorzec?
5. **Wiele ekip na użytkownika:** roadmap sugeruje tworzenie ekipy (liczba mnoga nieokreślona) – jedna vs wiele ekip na właściciela?
6. **GitHub board:** przy starcie planowania przenieść [#44](https://github.com/ematrejek/bassmap-pl/issues/44) na **In Progress**.

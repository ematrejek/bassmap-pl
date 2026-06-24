---
date: 2026-06-24T20:29:39+00:00
researcher: Cursor Agent
git_commit: 8e7f4322ff9465dc4a13ee11979a926e0a40bfbb
branch: main
repository: ematrejek/bassmap-pl
topic: "S-22 Forum MVP – wątki i komentarze (forum-threads)"
tags: [research, codebase, forum, ugc, event-comments, s-22]
status: complete
last_updated: 2026-06-24
last_updated_by: Cursor Agent
---

# Research: S-22 Forum MVP – wątki i komentarze (`forum-threads`)

**Date**: 2026-06-24T20:29:39+00:00  
**Researcher**: Cursor Agent  
**Git Commit**: [`8e7f432`](https://github.com/ematrejek/bassmap-pl/commit/8e7f4322ff9465dc4a13ee11979a926e0a40bfbb)  
**Branch**: main  
**Repository**: [ematrejek/bassmap-pl](https://github.com/ematrejek/bassmap-pl)

## Research Question

Jak zaimplementować slice **S-22 (Forum MVP)** w BassMap PL: wątki w trzech kategoriach, komentarze, moderacja admina, zastąpienie placeholdera `/forum` – w oparciu o istniejące wzorce w kodzie i dokumentacji produktowej.

## Summary

**S-22** to pierwszy „prawdziwy” slice społecznościowy Partii III. Produktowo: zalogowany fan tworzy **wątek** w jednej z trzech kategorii («Szukam ekipy», «Mamy ekipę – szukamy ludzi», «Ogólne»), czyta listę, wchodzi w wątek i **komentuje**; admin **usuwa** wątki i komentarze. Placeholder [`src/pages/forum.astro`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/pages/forum.astro) zostaje zastąpiony działającym forum.

**Najlepszy szablon techniczny:** slice **S-15 (event-comments)** – ta sama pionowa ścieżka: migracja + RLS → serwis → API (fan/admin) → Zod → React island → testy integracyjne RLS + unit API z `as unknown as APIContext`. Główna różnica: **dwie tabele** (`forum_threads` + `forum_comments`) zamiast jednej, plus **kategoria** i **tytuł** wątku.

**Infrastruktura gotowa:** `FORUM_PATH` (`/forum`), link w menu fana i admina, trasa chroniona w middleware (`PROTECTED_ROUTES`), `isAdmin` w `locals`. **Brakuje:** tabel DB, API, UI, testów E2E, sekcji prawnych dla forum w polityce prywatności.

**Prerequisity spełnione:** S-20 (profil publiczny, login) – done; S-21 – done (brak twardej zależności). Issue GitHub: **#42**.

## Detailed Findings

### 1. Zakres produktowy i granice slice'a

Z [`context/foundation/roadmap.md`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/context/foundation/roadmap.md) (S-22):

| W zakresie S-22 | Poza zakresem (świadomie) |
|-----------------|---------------------------|
| Tworzenie wątku (zalogowany fan) | Szablony ekipy, prośby o dołączenie → **S-24** |
| 3 kategorie + Ogólne (stałe, bez taksonomii) | Kategoria «Ogłoszenie wydarzenia» → **S-25** |
| Lista wątków, widok wątku, komentarze | Znajomi, powiadomienia → **S-23** |
| Admin usuwa wątki/komentarze | Zgłoszenia od użytkowników (opcjonalne; placeholder w copy admina wspomina „zgłoszenia”) |
| Legal sync przy archiwum (UGC) | Pełna moderacja w panelu admina (można MVP: usuwanie jak komentarze eventów) |

[`context/foundation/partia-iii-shaping.md`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/context/foundation/partia-iii-shaping.md): forum MVP = **wątki + komentarze**, bez ekip i szablonów.

**Ryzyko (roadmapa):** UGC – synchronizacja regulaminu i polityki; moderacja admina.

### 2. Stan obecny – placeholder `/forum`

[`src/pages/forum.astro`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/pages/forum.astro):

- `prerender = false` (SSR) – linia 7.
- Admin widzi copy o przyszłej moderacji + link do panelu admina (linie 18–30).
- Fan widzi „Wkrótce” + linki do Moje eventy / Profil (linie 32–44).
- **Brak** danych, API, formularzy.

**Nawigacja i auth (już skonfigurowane):**

- [`src/lib/routes.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/lib/routes.ts) – `FORUM_PATH = "/forum"`.
- [`src/middleware.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/middleware.ts) – `FORUM_PATH` w `PROTECTED_ROUTES`; `pathname.startsWith(route)` chroni też `/forum/[id]`.
- [`src/components/shell/AppMenu.tsx`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/components/shell/AppMenu.tsx) – link „Forum” w `fanLinks` i `adminLinks`.

**Testy:** tylko [`tests/unit/routes.test.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/tests/unit/routes.test.ts) sprawdza stałą `FORUM_PATH`. **Brak** E2E dla forum – przy zamknięciu slicu dodać scenariusz (lekcja: `verify` + `build` + `test:e2e`).

### 3. Wzorzec S-15 – event comments (szablon 1:1)

#### 3.1 Baza danych i RLS

[`supabase/migrations/20260619100000_event_comments.sql`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/supabase/migrations/20260619100000_event_comments.sql):

- `author_id` nullable + `ON DELETE SET NULL`, `author_label text NOT NULL` – anonimizacja po usunięciu konta.
- `CHECK` długości body 1–2000 znaków.
- Indeks `(event_id, created_at ASC)`.
- RLS: SELECT publiczny (z warunkiem `event.status = published`), INSERT authenticated (`author_id = auth.uid()`), DELETE admin (`is_admin()`).
- Osobna migracja [`20260619110000_event_comments_author_delete.sql`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/supabase/migrations/20260619110000_event_comments_author_delete.sql) – fan może usuwać **własny** komentarz.

**Dla forum – propozycja schematu:**

```
forum_threads
  id, category (enum/check: szukam_ekipy | mamy_ekipe | ogolne)
  title, author_id, author_label, created_at
  CHECK char_length(title) ...

forum_comments
  id, thread_id FK CASCADE, author_id, author_label, body, created_at
  CHECK char_length(body) 1..2000
  INDEX (thread_id, created_at ASC)
```

RLS threads: SELECT dla anon+authenticated (publiczne forum); INSERT authenticated (własny `author_id`); DELETE admin + opcjonalnie DELETE own (autor wątku).  
RLS comments: analogicznie do `event_comments`, bez warunku `events.published` – zamiast tego `EXISTS` na `forum_threads`.

#### 3.2 Serwis

[`src/lib/services/event-comments.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/lib/services/event-comments.ts):

- `ServiceResult<T> = { data } | { error }`.
- `mapEventCommentRow`, stała `EVENT_COMMENT_SELECT`.
- `authorLabelFromEmail` z [`src/lib/auth/display-name.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/lib/auth/display-name.ts).
- Mapowanie kodu Postgres `42501` → komunikat PL.

**Nowe pliki:** `src/lib/services/forum-threads.ts`, `src/lib/services/forum-comments.ts` (lub jeden moduł z dwoma grupami funkcji).

#### 3.3 API routes

| Event comments (S-15) | Forum (S-22 – propozycja) |
|----------------------|---------------------------|
| `GET/POST /api/events/[id]/comments` | `GET/POST /api/forum/threads` |
| – | `GET /api/forum/threads/[id]` (opcjonalnie, jeśli nie SSR-only) |
| `POST` komentarz pod eventem | `GET/POST /api/forum/threads/[id]/comments` |
| `DELETE /api/fan/event-comments/[id]` | `DELETE /api/fan/forum/threads/[id]`, `.../comments/[id]` |
| `DELETE /api/admin/event-comments/[id]` | `DELETE /api/admin/forum/threads/[id]`, `.../comments/[id]` |

Wzorzec fan DELETE **blokuje admina** (403 – admin używa panelu): [`src/pages/api/fan/event-comments/[id].ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/pages/api/fan/event-comments/[id].ts).

Guards: [`src/lib/auth/guards.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/lib/auth/guards.ts) – `requireAuth`, `requireAdmin`.

#### 3.4 Zod i typy

- [`src/lib/events/comment-schema.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/lib/events/comment-schema.ts) – `parseCommentBody`, max 2000, komunikaty PL.
- [`src/types.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/types.ts) – pary `*Row` / DTO camelCase.

**Nowe:** `src/lib/forum/thread-schema.ts` (kategoria enum + tytuł), reuse `comment-schema` lub `forum/comment-schema.ts`.

#### 3.5 UI React

[`src/components/events/EventCommentsSection.tsx`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/components/events/EventCommentsSection.tsx):

- SSR: dane początkowe z `.astro`, island `client:load`.
- `canDeleteComment` / `deleteCommentUrl` – rozgałęzienie admin vs fan.
- Optymistyczne dodanie/usunięcie, modal potwierdzenia, `maxLength={2000}`, link logowania z `redirect`.

**Forum UI (propozycja):**

- `src/pages/forum.astro` – lista wątków + filtr kategorii + formularz nowego wątku (React island).
- `src/pages/forum/[id].astro` – wątek + komentarze (wzorzec jak event detail + `EventCommentsSection`).
- Komponenty: `ForumThreadList.tsx`, `ForumThreadForm.tsx`, `ForumCommentsSection.tsx` (fork `EventCommentsSection`).

**Uwaga (lekcja Radix):** dialogi potwierdzenia – jeśli Radix AlertDialog, użyć `client:only="react"`.

#### 3.6 Testy

- Integracja: [`tests/integration/event-comments-rls.test.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/tests/integration/event-comments-rls.test.ts) – `describe.skipIf(!isSupabaseConfigured())`, helpery klientów, fixtury + cleanup.
- Unit API: [`tests/unit/event-comments-api.test.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/tests/unit/event-comments-api.test.ts) – `mockContext` + **`as unknown as APIContext`** (wymóg `astro check`).
- Schemat: [`tests/unit/comment-schema.test.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/tests/unit/comment-schema.test.ts).

### 4. Moderacja admina

Trzy warstwy (kopiować):

1. **Middleware** – `context.locals.isAdmin` ([`src/middleware.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/middleware.ts)).
2. **API** – `requireAdmin` ([`src/lib/auth/guards.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/lib/auth/guards.ts)).
3. **RLS** – `public.is_admin()` ([`supabase/migrations/20260611140000_fix_is_admin_use_uid.sql`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/supabase/migrations/20260611140000_fix_is_admin_use_uid.sql)).

**MVP (zgodnie z roadmapą):** admin **usuwa** wątki/komentarze – jak event comments. Opcjonalnie później: status `hidden`/`locked` (wzorzec change_suggestions).

**Panel admina:** [`src/pages/admin/index.astro`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/pages/admin/index.astro) – można dodać sekcję „Moderacja forum” lub moderować z widoku `/forum` (admin już ma inne copy na placeholderze).

### 5. Usuwanie konta i `author_label`

[`src/lib/services/account-deletion.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/lib/services/account-deletion.ts) – `anonymizeUserComments`: `author_id = null`, `author_label = "Usunięty użytkownik"`.

**Obowiązkowe w S-22:** rozszerzyć o `forum_threads` i `forum_comments` przed `auth.admin.deleteUser`.

**Decyzja do planu:** etykieta autora przy tworzeniu – e-mail (`authorLabelFromEmail`, jak komentarze) vs **login profilu** (`fan_profiles.login` z S-20). Login jest spójniejszy z tożsamością publiczną `/u/login`.

### 6. Legal sync (UGC)

Roadmapa i AGENTS.md: przy `/10x-archive` zaktualizować w **tej samej sesji**:

- [`src/pages/privacy-policy.astro`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/pages/privacy-policy.astro) – **brak** sekcji forum; wzorzec: istniejąca sekcja komentarzy pod wydarzeniami (~§ komentarze).
- [`src/pages/terms.astro`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/pages/terms.astro) – linia 47: forum jako „zapowiedź” → zmienić na działającą funkcję + zasady UGC (odpowiedzialność autora, moderacja).
- [`src/lib/legal/paths.ts`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/src/lib/legal/paths.ts) – `LEGAL_UPDATED_AT`.

### 7. Zależności i kolejność w roadmapie

```
S-20 (done) ──► S-22 (forum-threads) ──► S-23 (znajomi)
                        │
                        ├──► S-24 (ekipy + szablony forum)
                        └──► S-25 (organizator + ogłoszenia na forum)
```

North star Partii III po S-21: **S-22**.

## Code References

| Plik | Rola dla S-22 |
|------|----------------|
| `src/pages/forum.astro` | Placeholder do zastąpienia |
| `src/middleware.ts:7` | `FORUM_PATH` już chroniony |
| `src/components/shell/AppMenu.tsx` | Linki menu – OK |
| `supabase/migrations/20260619100000_event_comments.sql` | Szablon tabeli + RLS |
| `src/lib/services/event-comments.ts` | Szablon serwisu |
| `src/pages/api/events/[id]/comments.ts` | Szablon GET/POST listy |
| `src/pages/api/fan/event-comments/[id].ts` | Szablon DELETE fana |
| `src/pages/api/admin/event-comments/[id].ts` | Szablon DELETE admina |
| `src/components/events/EventCommentsSection.tsx` | Szablon UI komentarzy |
| `src/lib/services/account-deletion.ts` | Rozszerzyć anonimizację |
| `tests/integration/event-comments-rls.test.ts` | Szablon testów RLS |
| `tests/unit/event-comments-api.test.ts` | Szablon testów API |

## Architecture Insights

1. **SSR-first + React islands** – lista/komentarze załadowane na serwerze, mutacje przez `fetch` do API (bez pełnego SPA).
2. **RLS jako ostatnia linia obrony** – API waliduje auth, baza egzekwuje polityki per rola.
3. **Fan vs admin DELETE** – osobne endpointy; fan endpoint odrzuca admina.
4. **Zdenormalizowany `author_label`** – przetrwa usunięcie konta i unika JOIN do profilu przy każdym odczycie.
5. **Spójność z lessons.md** – `npm run verify` przed pushem; `as unknown as APIContext` w testach API; E2E przy zmianach UI; en dash w copy.

## Historical Context (from prior changes)

- [`context/archive/2026-06-19-event-comments/`](https://github.com/ematrejek/bassmap-pl/tree/8e7f432/context/archive/2026-06-19-event-comments) – bezpośredni poprzednik techniczny (plan, research, impl-review).
- [`context/archive/2026-06-15-fan-account-zone/`](https://github.com/ematrejek/bassmap-pl/tree/8e7f432/context/archive/2026-06-15-fan-account-zone) – wprowadzenie placeholderów `/forum`, `/team`.
- [`context/archive/2026-06-23-fan-profile-edit/`](https://github.com/ematrejek/bassmap-pl/tree/8e7f432/context/archive/2026-06-23-fan-profile-edit) – login publiczny `/u/login` (tożsamość autora).
- [`context/archive/2026-06-24-profile-spotify-embed/`](https://github.com/ematrejek/bassmap-pl/tree/8e7f432/context/archive/2026-06-24-profile-spotify-embed) – ostatni zamknięty slice; wzorzec legal sync przy UGC.

## Related Research

- [`context/archive/2026-06-19-event-comments/research.md`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/context/archive/2026-06-19-event-comments/research.md) – jeśli istnieje w archiwum.
- [`context/archive/2026-06-14-app-shell-navigation/research.md`](https://github.com/ematrejek/bassmap-pl/blob/8e7f432/context/archive/2026-06-14-app-shell-navigation/research.md) – nawigacja i placeholdery.

## Open Questions (do `/10x-plan`)

| # | Pytanie | Propozycja domyślna |
|---|---------|---------------------|
| 1 | Czy fan może **usuwać własne** wątki/komentarze? | Tak – jak event comments (własny DELETE + RLS); roadmap mówi tylko o adminie, ale S-15 ma delete own |
| 2 | **Etykieta autora** – e-mail czy login profilu? | Login z `fan_profiles` (fallback e-mail jeśli brak profilu) |
| 3 | **Limit tytułu** wątku? | 120–200 znaków (CHECK w DB + Zod) |
| 4 | **Limit treści** komentarza? | 2000 znaków (jak event comments) |
| 5 | Lista wątków – **filtrowanie** po kategorii na UI? | Tak – 3 zakładki lub select (MVP) |
| 6 | **Paginacja** listy wątków? | Na MVP: ostatnie N (np. 50) bez paginacji – jak komentarze pod eventem |
| 7 | Moderacja tylko z `/forum` czy też **panel admina**? | MVP: delete z widoku wątku (admin widzi przycisk) – bez osobnej kolejki |
| 8 | **Zgłoszenia** treści (reports)? | Poza MVP – copy placeholder admina wspomina; S-22 roadmap nie wymaga |

## Recommended Implementation Phases (szkic pod plan)

1. **DB** – migracja `forum_threads` + `forum_comments`, RLS, indeksy.
2. **Backend** – serwisy, schematy Zod, typy, API routes (threads + comments, fan/admin DELETE).
3. **UI** – `forum.astro` (lista + create), `forum/[id].astro` (wątek + komentarze).
4. **Account deletion** – anonimizacja forum w `account-deletion.ts`.
5. **Testy** – unit schematów + API, integracja RLS, E2E smoke ścieżki forum.
6. **Legal** – polityka + regulamin + `LEGAL_UPDATED_AT` (przy archiwum, ale zaplanować w planie).

# Forum Threads Implementation Plan

## Overview

Implementujemy **S-22 Forum MVP**: zalogowany fan tworzy wątek w jednym z sześciu stałych działów, dodaje treść pierwszego posta, komentuje wątki innych osób, a admin usuwa wątki i komentarze bezpośrednio w widoku forum. Obecny placeholder `/forum` zostanie zastąpiony działającym forum opartym o wzorzec S-15 `event-comments`.

Plan obejmuje bazę danych, RLS, serwisy, API, UI, testy oraz obowiązkowy legal sync dla UGC.

### Wygląd 1:1 z mockupem `bassmap-pl-ui`

Wizualnie forum ma być **identyczne** z referencyjnym projektem UI w katalogu `bassmap-pl-ui` (pliki `app/forum/page.tsx`, `components/forum/forum-hero.tsx`, `forum-board.tsx`, `thread-card.tsx`, dane `lib/forum.ts`). Główna aplikacja ma już ten sam system stylów (tokeny neonowe, `font-heading` Orbitron, `grid-backdrop`, `shadow-glow-violet`, komponenty `Equalizer` i `GenreBadge`), więc odwzorowujemy układ, a nie budujemy nowego designu.

**Jedyny wyjątek**: nagłówek hero zamiast „Gadaj z ekipą, dziel się basem” brzmi **„Share the bass!”**.

Decyzje zakresu po przeglądzie mockupu (potwierdzone z użytkownikiem):

- **6 działów** dokładnie jak w mockupie (zamiast wcześniejszych 3).
- **Karty wątków** odwzorowują wygląd mockupu, ale dane są realne tylko tam, gdzie to proste: autor, liczba odpowiedzi i czas są prawdziwe; **miasto** i **tagi gatunków** są opcjonalne (renderowane tylko gdy podane); liczba **wyświetleń** i znacznik **„Hot”** są w MVP ukryte lub uproszczone.
- **Pasek wyszukiwania** w hero jest obecny wizualnie, ale w MVP działa jako lokalny filtr po tytule (po stronie klienta) albo jest nieaktywny – bez backendu wyszukiwania.
- **Pasek statystyk** w hero (np. „6 działów”, „X wątków”, „ostatni post”) **nie jest** częścią MVP – pomijamy blok `dl` / `FORUM_STATS` z mockupu.
- **Podtytuł** pod nagłówkiem hero (akapit opisowy z mockupu) **pomijamy** – zostaje sam nagłówek „Share the bass!”.

## Current State Analysis

`/forum` istnieje jako chroniona strona Astro, ale jest tylko placeholderem. `FORUM_PATH` jest już w `PROTECTED_ROUTES`, więc także przyszłe `/forum/[id]` będzie wymagać logowania. Menu aplikacji ma już link „Forum” dla fana i admina.

Najbliższy techniczny wzorzec to `event-comments`: jedna tabela z `author_id`, zdenormalizowanym `author_label`, RLS, osobnymi endpointami fan/admin i UI z optymistycznymi mutacjami. Forum potrzebuje tego samego pionu, ale z dwiema tabelami: `forum_threads` oraz `forum_comments`.

## Desired End State

Po zakończeniu planu:

- Fan otwiera `/forum`, widzi hero „Share the bass!”, sześć działów ułożonych jak w mockupie, listę wątków w kartach i paginację.
- Fan tworzy wątek z działem, tytułem do 120 znaków, treścią do 2000 znaków oraz opcjonalnym miastem i tagami gatunków.
- Fan otwiera `/forum/[id]`, widzi treść wątku i komentarze, może dodać komentarz do 2000 znaków.
- Fan może usunąć własne komentarze, ale nie usuwa własnych wątków.
- Admin widzi przyciski usuwania wątków i komentarzy inline w widoku forum/wątku.
- Usunięcie konta anonimizuje wątki i komentarze forum przez `author_label = "Usunięty użytkownik"`.
- Polityka prywatności, regulamin i `LEGAL_UPDATED_AT` opisują forum jako działającą funkcję UGC.

### Key Discoveries:

- `src/pages/forum.astro` jest tylko placeholderem, ale ma już `prerender = false`.
- `src/middleware.ts` chroni `FORUM_PATH` przez `pathname.startsWith(route)`, więc nie trzeba dopisywać `/forum/[id]`.
- `supabase/migrations/20260619100000_event_comments.sql` jest szablonem RLS dla UGC.
- `src/lib/services/event-comments.ts` pokazuje wzorzec `ServiceResult`, mapowania row → DTO i obsługi błędu `42501`.
- `tests/unit/event-comments-api.test.ts` pokazuje wymagany wzorzec `as unknown as APIContext`.
- `context/foundation/lessons.md` wymaga `npm run verify`, a przy zmianie UI także `npm run build` i `npm run test:e2e`.

## What We're NOT Doing

- Nie robimy ekip, szablonów ekip ani próśb o dołączenie – to S-24.
- Nie robimy kategorii «Ogłoszenie wydarzenia» ani integracji organizatorów – to S-25.
- Nie robimy znajomych, poleceń ani powiadomień – to S-23.
- Nie robimy zgłaszania wątków/komentarzy przez użytkowników – poza MVP.
- Nie robimy osobnej kolejki moderacji w panelu admina – admin usuwa inline na forum.
- Nie robimy pełnego wyszukiwania forum po stronie serwera – pasek wyszukiwania w hero jest wizualny / lokalny filtr.
- Nie robimy licznika wyświetleń ani logiki znacznika „Hot” – te elementy karty są w MVP ukryte lub uproszczone.
- Nie robimy paska statystyk w hero (liczba działów, wątków, ostatni post) – pomijamy `FORUM_STATS` z mockupu.
- Nie robimy statusów `hidden` / `locked` dla wątku – w MVP admin twardo usuwa wątek.

## Implementation Approach

Budujemy pionowo, ale warstwami: najpierw trwały model danych i RLS, potem serwisy i walidacja, potem API, następnie UI i dopiero na końcu testy E2E oraz legal sync. Dzięki temu każda faza ma jasny kontrakt i da się ją zweryfikować przed przejściem dalej.

Forum będzie SSR-first: strony Astro pobierają dane początkowe na serwerze, a React islands obsługują formularze, zakładki, paginację oraz mutacje przez API. Autor publiczny będzie zapisywany jako login profilu (`fan_profiles.login`), z fallbackiem do etykiety z e-maila gdy profil nie istnieje.

## Critical Implementation Details

### User Experience Spec

Tworzenie wątku wymaga trzech pól: kategoria, tytuł i treść pierwszego posta. Treść startowa powinna być częścią `forum_threads.body`, nie automatycznie tworzonym komentarzem, bo wtedy lista i strona wątku mają jeden oczywisty „post otwierający”.

### Data Safety

Admin usuwa wątek twardo, a komentarze usuwają się przez `ON DELETE CASCADE`. Fan nie może usuwać własnego wątku, żeby nie kasować komentarzy innych osób.

### Author Labels

`author_label` zapisujemy w momencie tworzenia wątku/komentarza. Preferowany label to login profilu publicznego, nie e-mail, bo S-20 wprowadziło publiczną tożsamość `/u/login`.

### Działy forum (1:1 z mockupem)

Sześć stałych działów. Slug (wartość w bazie) → etykieta PL → kolor neonowy (do akcentów i `GenreBadge`):

| Slug (`category`)   | Etykieta UI                          | Kolor    |
| ------------------- | ------------------------------------ | -------- |
| `szukam_ekipy`      | Szukam ekipy                         | `violet` |
| `jestesmy_ekipa`    | Jesteśmy ekipą, szukamy ziomków      | `green`  |
| `podziel_sie_muzyka`| Podziel się muzyką                   | `cyan`   |
| `sprzet_produkcja`  | Sprzęt i produkcja                   | `orange` |
| `transport_noclegi` | Transport i noclegi                  | `violet` |
| `pozostale`         | Pozostałe wątki                      | `cyan`   |

Opisy działów (krótkie zdanie pod tytułem) przenosimy z `bassmap-pl-ui/lib/forum.ts` (pola `description`).

### Wygląd (mapowanie mockup → komponenty Astro/React)

- **Hero** (`forum-hero.tsx` → fragment w `forum.astro` lub osobny komponent): siatka `grid-backdrop opacity-50` + gradient, etykieta „Forum społeczności” z `Equalizer`, nagłówek **„Share the bass!”** (klasy jak w mockupie: `font-heading text-4xl ... font-black uppercase`, akcenty `text-glow-violet`/`text-glow-cyan`), pasek wyszukiwania (wizualny/lokalny), pigułki‑linki do działów (`#slug`). **Bez** podtytułu (akapitu `p` pod nagłówkiem) i **bez** bloku statystyk (`dl` / `FORUM_STATS`).
- **Dział** (`forum-board.tsx` → `ForumBoard`): nagłówek z `Equalizer` i etykietą „// N wątków”, `h2` z tytułem działu, opis, przycisk „Nowy wątek”, a pod spodem `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5` kart.
- **Karta wątku** (`thread-card.tsx` → `ThreadCard`): `article` z klasami hover (`hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow-violet`), `GenreBadge` dla tagów (gdy są), tytuł, fragment treści (`excerpt` = początek `body`), stopka z `@autor`, miastem (gdy jest), liczbą odpowiedzi (`MessageSquare`), datą ostatniej aktywności. Wyświetlenia i „Hot” pomijamy w MVP.

Ikony pochodzą z `lucide-react` (już używany w projekcie): `MessagesSquare`, `Search`, `Plus`, `MapPin`, `MessageSquare`.

## Phase 1: Database Schema and Contracts

### Overview

Ta faza dodaje trwały model danych forum: tabele, ograniczenia długości, indeksy i RLS. To fundament, bez którego API i UI nie mają bezpiecznego źródła danych.

### Changes Required:

#### 1. Forum migration

**File**: `supabase/migrations/YYYYMMDDHHmmss_forum_threads.sql`

**Intent**: Dodać dwie tabele forum oraz granularne polityki RLS dla odczytu, tworzenia i usuwania.

**Contract**:

- `forum_threads`:
  - `id uuid primary key default gen_random_uuid()`
  - `category text not null`
  - `title text not null`
  - `body text not null`
  - `city text` (nullable, opcjonalne miasto z karty)
  - `tags text[] not null default '{}'` (opcjonalne tagi gatunków, np. `{dnb,jungle}`)
  - `author_id uuid references auth.users(id) on delete set null`
  - `author_label text not null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - CHECK: `category in ('szukam_ekipy', 'jestesmy_ekipa', 'podziel_sie_muzyka', 'sprzet_produkcja', 'transport_noclegi', 'pozostale')`
  - CHECK: `char_length(title) between 1 and 120`
  - CHECK: `char_length(body) between 1 and 2000`
  - CHECK: `city is null or char_length(city) between 1 and 80`
  - CHECK: `cardinality(tags) <= 3` (maks. 3 tagi gatunków)
- `forum_comments`:
  - `id uuid primary key default gen_random_uuid()`
  - `thread_id uuid not null references public.forum_threads(id) on delete cascade`
  - `author_id uuid references auth.users(id) on delete set null`
  - `author_label text not null`
  - `body text not null`
  - `created_at timestamptz not null default now()`
  - CHECK: `char_length(body) between 1 and 2000`
- Indeksy:
  - `forum_threads_created_at_idx` na `created_at desc`
  - `forum_threads_category_created_at_idx` na `(category, created_at desc)`
  - `forum_threads_author_id_idx`
  - `forum_comments_thread_id_created_at_idx` na `(thread_id, created_at asc)`
  - `forum_comments_author_id_idx`
- RLS:
  - SELECT dla `anon, authenticated`
  - INSERT dla `authenticated` z `author_id = auth.uid()`
  - DELETE dla admina przez `public.is_admin()`
  - DELETE własnych komentarzy przez `author_id = auth.uid()`
  - Bez DELETE własnych wątków.

#### 2. Shared types

**File**: `src/types.ts`

**Intent**: Dodać typy DB row i DTO dla wątków oraz komentarzy forum.

**Contract**:

- `ForumThreadCategory = "szukam_ekipy" | "jestesmy_ekipa" | "podziel_sie_muzyka" | "sprzet_produkcja" | "transport_noclegi" | "pozostale"`
- `ForumThreadRow` i `ForumThread` (w tym opcjonalne `city: string | null` i `tags: string[]`)
- `ForumCommentRow` i `ForumComment`
- DTO w camelCase, row w snake_case.

### Success Criteria:

#### Automated Verification:

- Migracja lokalna przechodzi: `npx supabase migration up`
- Typy kompilują się: `npm run check`
- Brak em dash w aktywnych dokumentach: `npm run lint:docs`

#### Manual Verification:

- Schemat tabel w Supabase pokazuje `forum_threads` i `forum_comments`.
- RLS jest włączone na obu tabelach.

**Implementation Note**: Po tej fazie zatrzymaj się i sprawdź, czy migracja lokalna weszła czysto, zanim powstanie kod zależny od nowych tabel.

---

## Phase 2: Services, Validation, and Account Deletion

### Overview

Ta faza dodaje logikę backendową bez HTTP: walidację pól, mapowanie danych, pobieranie loginu autora, listowanie/tworzenie/usuwanie forum oraz anonimizację treści po usunięciu konta.

### Changes Required:

#### 1. Forum schemas

**File**: `src/lib/forum/thread-schema.ts`

**Intent**: Dodać Zod schema dla działu, tytułu, treści i opcjonalnych pól wątku.

**Contract**:

- Działy (6): `szukam_ekipy`, `jestesmy_ekipa`, `podziel_sie_muzyka`, `sprzet_produkcja`, `transport_noclegi`, `pozostale`.
- Publiczne etykiety i kolory działów dla UI (mapa slug → `{ label, color, description }`, zgodna z tabelą w „Critical Implementation Details”).
- Tytuł: trim, min 1, max 120, komunikaty PL.
- Treść: trim, min 1, max 2000, komunikaty PL.
- Miasto (opcjonalne): trim, max 80, puste → `null`.
- Tagi (opcjonalne): tablica do 3 wartości z dozwolonego zbioru gatunków (np. `dnb`, `jungle`, `dubstep`, `rave`, `hardcore`), każdy mapowany na kolor `NeonColor`.

#### 2. Forum comment schema

**File**: `src/lib/forum/comment-schema.ts`

**Intent**: Dodać schema komentarza forum, spójny z `src/lib/events/comment-schema.ts`.

**Contract**:

- Treść: trim, min 1, max 2000.
- Helper `parseForumCommentBody`.

#### 3. Forum services

**File**: `src/lib/services/forum-threads.ts`

**Intent**: Dodać operacje listowania, pobierania, tworzenia i usuwania wątków.

**Contract**:

- `listForumThreads(supabase, options)`:
  - `category?: ForumThreadCategory`
  - `limit: number`
  - `offset: number`
  - sortowanie `created_at desc`
- `getForumThreadById(supabase, id)`
- `createForumThread(supabase, input)`:
  - przyjmuje `authorId`, `authorEmail`, `category`, `title`, `body`, opcjonalnie `city`, `tags`
  - zapisuje `author_label` z loginu profilu, fallback: `authorLabelFromEmail`
- `deleteForumThread(supabase, id)`
- `mapForumThreadRow`.

**File**: `src/lib/services/forum-comments.ts`

**Intent**: Dodać operacje listowania, tworzenia i usuwania komentarzy wątku.

**Contract**:

- `listForumComments(supabase, threadId)` sortuje po `created_at asc`.
- `createForumComment(supabase, input)` zapisuje `author_label` tak samo jak wątki.
- `deleteForumComment(supabase, id)`.
- `mapForumCommentRow`.

#### 4. Author label helper

**File**: `src/lib/services/forum-authors.ts` lub wewnątrz serwisów forum

**Intent**: Centralnie ustalać publiczną etykietę autora dla forum.

**Contract**:

- Najpierw `getFanProfileByUserId`.
- Jeśli profil ma login, użyj loginu.
- Jeśli brak profilu albo błąd profilu nie powinien blokować publikacji, fallback do `authorLabelFromEmail(email)`.

#### 5. Account deletion anonymization

**File**: `src/lib/services/account-deletion.ts`

**Intent**: Przy usunięciu konta zanonimizować wątki i komentarze forum.

**Contract**:

- Dodać aktualizacje:
  - `forum_threads`: `author_id = null`, `author_label = DELETED_USER_AUTHOR_LABEL`
  - `forum_comments`: `author_id = null`, `author_label = DELETED_USER_AUTHOR_LABEL`
- Wywołać je przed `auth.admin.deleteUser`.
- Zachować istniejące zachowanie dla `event_comments`.

### Success Criteria:

#### Automated Verification:

- Testy schematów forum przechodzą: `npm test -- tests/unit/forum-schema.test.ts`
- Testy serwisów/anonimizacji przechodzą: `npm test -- tests/unit/account-deletion-service.test.ts`
- Type check przechodzi: `npm run check`

#### Manual Verification:

- Treści bez profilu publicznego nadal mogą zostać opublikowane z fallbackiem autora.
- Usunięcie konta nie usuwa wątków ani komentarzy forum, tylko zmienia autora na „Usunięty użytkownik”.

**Implementation Note**: Nie traktuj braku profilu jako błędu publikacji. Forum ma działać dla każdego zalogowanego użytkownika, a login profilu jest preferencją etykiety, nie twardym warunkiem.

---

## Phase 3: API Routes

### Overview

Ta faza wystawia kontrakt HTTP dla UI: listę i tworzenie wątków, listę i tworzenie komentarzy oraz osobne ścieżki usuwania dla fana i admina.

### Changes Required:

#### 1. Forum threads API

**File**: `src/pages/api/forum/threads/index.ts`

**Intent**: Obsłużyć listowanie i tworzenie wątków.

**Contract**:

- `export const prerender = false`
- `GET`:
  - query: `category`, `page`
  - limit: 20 elementów na stronę
  - offset: `(page - 1) * 20`
  - zwraca `{ threads, page, hasNextPage }`
- `POST`:
  - `requireAuth`
  - body: `{ category, title, body }`
  - walidacja Zod
  - tworzenie przez `createForumThread`
  - zwraca 201 + wątek.

#### 2. Forum comments API

**File**: `src/pages/api/forum/threads/[id]/comments.ts`

**Intent**: Obsłużyć listowanie i tworzenie komentarzy wątku.

**Contract**:

- `export const prerender = false`
- `GET`:
  - waliduje UUID wątku
  - zwraca komentarze w kolejności rosnącej.
- `POST`:
  - `requireAuth`
  - waliduje UUID wątku i treść komentarza
  - tworzy komentarz przez `createForumComment`
  - zwraca 201 + komentarz.

#### 3. Fan delete comment API

**File**: `src/pages/api/fan/forum-comments/[id].ts`

**Intent**: Pozwolić fanowi usunąć własny komentarz forum.

**Contract**:

- `DELETE`
- `requireAuth`
- Jeśli `context.locals.isAdmin`, zwrócić 403 z komunikatem, że admin usuwa treści w trybie moderacji.
- Usunięcie przez `deleteForumComment`; RLS pilnuje, czy to własny komentarz.

#### 4. Admin moderation APIs

**File**: `src/pages/api/admin/forum-threads/[id].ts`

**Intent**: Pozwolić adminowi usunąć dowolny wątek.

**Contract**:

- `DELETE`
- `requireAdmin`
- Twarde usunięcie wątku; komentarze spadają przez cascade.

**File**: `src/pages/api/admin/forum-comments/[id].ts`

**Intent**: Pozwolić adminowi usunąć dowolny komentarz.

**Contract**:

- `DELETE`
- `requireAdmin`
- Usunięcie przez `deleteForumComment`.

### Success Criteria:

#### Automated Verification:

- Testy API przechodzą: `npm test -- tests/unit/forum-api.test.ts`
- Type check przechodzi: `npm run check`
- Lint przechodzi: `npm run lint`

#### Manual Verification:

- Niezalogowany użytkownik nie może tworzyć wątku ani komentarza.
- Fan może usunąć własny komentarz.
- Fan nie może usunąć cudzego komentarza ani wątku.
- Admin może usunąć wątek i komentarz.

**Implementation Note**: W testach API używaj `as unknown as APIContext`, zgodnie z lekcją z `event-comments`.

---

## Phase 4: Forum UI

### Overview

Ta faza zastępuje placeholder `/forum` działającym forum **wyglądającym 1:1 z mockupem `bassmap-pl-ui`**, z wyjątkiem nagłówka „Share the bass!”. UI korzysta z danych SSR i React islands do interakcji: tworzenia, paginacji, komentowania, usuwania oraz lokalnego filtra wyszukiwania.

### Changes Required:

#### 1. Forum list page

**File**: `src/pages/forum.astro`

**Intent**: Zastąpić placeholder pełnym widokiem forum: hero + sześć działów z kartami wątków.

**Contract**:

- Pobiera po stronie serwera wątki pogrupowane po działach (dla każdego działu najnowsze wątki + licznik).
- Renderuje strukturę z mockupu:
  - **Hero** „Share the bass!” (etykieta z `Equalizer`, pasek wyszukiwania wizualny/lokalny, pigułki‑linki do działów; **bez** podtytułu i **bez** paska statystyk).
  - Kontener `mx-auto max-w-7xl flex flex-col gap-16 px-4 py-16` z jednym `ForumBoard` na dział.
- Przekazuje do wysp React:
  - `initialThreadsBySection`
  - `currentUserId`
  - `isAdmin`
- Wyspy z interakcją montujemy przez `client:only="react"` (formularz tworzenia / dialogi Radix); statyczne karty mogą być renderowane w Astro lub w lekkiej wyspie `client:load`.

#### 2. Forum hero component

**File**: `src/components/forum/ForumHero.astro` (lub `.tsx` jeśli potrzebny stan filtra)

**Intent**: Odwzorować hero z `forum-hero.tsx` z nagłówkiem „Share the bass!”.

**Contract**:

- Klasy i układ jak w `bassmap-pl-ui/components/forum/forum-hero.tsx`.
- Nagłówek `h1`: **„Share the bass!”** (z akcentami `text-glow-violet`/`text-glow-cyan`, dopuszczalne wyróżnienie słowa „bass”).
- **Nie renderujemy** podtytułu (akapitu `p` pod nagłówkiem z mockupu).
- Pasek wyszukiwania: pole `input` w UI; w MVP lokalny filtr po tytule (wyspa `client:load`) albo nieaktywne z dopiskiem „wkrótce”.
- Pigułki‑linki kotwiczące do `#slug` każdego działu.
- **Nie renderujemy** bloku statystyk z mockupu (`dl` z „6 działów”, „X wątków”, „ostatni post”).

#### 3. Forum board component

**File**: `src/components/forum/ForumBoard.tsx` (lub `.astro` + wyspa formularza)

**Intent**: Odwzorować `forum-board.tsx` – nagłówek działu, opis, przycisk „Nowy wątek”, siatka kart.

**Contract**:

- Nagłówek: `Equalizer` + „// N wątków”, `h2` z tytułem działu, opis, przycisk „Nowy wątek” (otwiera formularz tworzenia z domyślnym działem).
- Siatka: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5` z `ThreadCard`.
- `id={slug}` na sekcji dla kotwic z hero.

#### 4. Thread card component

**File**: `src/components/forum/ThreadCard.tsx` (lub `.astro`)

**Intent**: Odwzorować `thread-card.tsx`.

**Contract**:

- `article` z klasami hover jak w mockupie.
- `GenreBadge` dla `tags` (renderowane tylko gdy tagi istnieją).
- Tytuł = `thread.title`, link do `/forum/[id]`.
- Fragment = początek `body` (excerpt, np. pierwsze ~160 znaków).
- Stopka: `@author_label`, miasto z `MapPin` (gdy `city` istnieje), liczba odpowiedzi z `MessageSquare`, data ostatniej aktywności (`updated_at`/`created_at`).
- Wyświetlenia i „Hot” pomijamy.

#### 5. Forum thread create form

**File**: `src/components/forum/ForumCreateThreadForm.tsx`

**Intent**: Formularz tworzenia wątku, montowany w dialogu / sekcji, wyzwalany przyciskami „Nowy wątek” / „Załóż wątek”.

**Contract**:

- Pola: dział (select 6 opcji), tytuł max 120, treść max 2000, opcjonalnie miasto i tagi.
- Po utworzeniu: przejście na `/forum/[id]` nowego wątku.
- Walidacja po stronie klienta zgodna z Zod schema.

#### 6. Forum thread detail page

**File**: `src/pages/forum/[id].astro`

**Intent**: Pokazać pojedynczy wątek, jego treść i komentarze, w stylu spójnym z forum.

**Contract**:

- Waliduje UUID z parametru.
- Jeśli brak wątku, zwraca 404.
- Pokazuje tytuł, dział (jako `GenreBadge`/etykieta), tagi, miasto, autora i treść wątku jako „post otwierający”.
- Pobiera komentarze SSR.
- Przekazuje dane do `ForumCommentsSection`.

#### 7. Forum comments component

**File**: `src/components/forum/ForumCommentsSection.tsx`

**Intent**: Obsłużyć dodawanie komentarza, usuwanie własnego komentarza przez fana i usuwanie dowolnego komentarza przez admina.

**Contract**:

- Wzorzec z `EventCommentsSection`.
- `canDeleteComment`: admin albo autor.
- `deleteCommentUrl`: admin → `/api/admin/forum-comments/[id]`, fan → `/api/fan/forum-comments/[id]`.
- Formularz komentarza max 2000 znaków.
- Modal potwierdzenia usuwania.

### Success Criteria:

#### Automated Verification:

- Testy komponentów przechodzą: `npm test -- tests/unit/forum-*.test.tsx`
- Type check przechodzi: `npm run check`
- Lint przechodzi: `npm run lint`

#### Manual Verification:

- `/forum` wygląda 1:1 z mockupem `bassmap-pl-ui`: hero „Share the bass!”, sześć działów, karty wątków z hoverem i neonowymi akcentami.
- Pigułki‑linki w hero przewijają do odpowiedniego działu (`#slug`).
- Tworzenie wątku przenosi fana na stronę wątku.
- `/forum/[id]` pokazuje tytuł, dział, tagi, miasto, autora, treść i komentarze.
- Admin widzi przyciski usuwania; zwykły fan widzi tylko usuwanie własnych komentarzy.
- Pasek wyszukiwania jest widoczny i (jeśli aktywny) filtruje lokalnie po tytule.

**Implementation Note**: Jeśli komponenty użyją Radix AlertDialog, strona Astro powinna montować je przez `client:only="react"`, żeby uniknąć znanego problemu SSR z Radix.

---

## Phase 5: Tests, E2E, and Legal Sync

### Overview

Ta faza domyka slice jakościowo i prawnie: pełne testy unit/integration/e2e, dokumenty prawne i finalne komendy weryfikacyjne.

### Changes Required:

#### 1. Unit tests

**File**: `tests/unit/forum-schema.test.ts`

**Intent**: Pokryć walidację kategorii, tytułu, treści wątku i komentarza.

**Contract**:

- Puste wartości są odrzucane.
- Whitespace jest trimowany.
- Tytuł > 120 jest odrzucany.
- Body/komentarz > 2000 jest odrzucany.
- Nieznana kategoria jest odrzucana.

**File**: `tests/unit/forum-api.test.ts`

**Intent**: Pokryć statusy HTTP i wywołania serwisów dla API forum.

**Contract**:

- `GET /api/forum/threads`
- `POST /api/forum/threads`
- `GET/POST /api/forum/threads/[id]/comments`
- `DELETE /api/fan/forum-comments/[id]`
- `DELETE /api/admin/forum-comments/[id]`
- `DELETE /api/admin/forum-threads/[id]`
- Mock `APIContext` przez `as unknown as APIContext`.

#### 2. Integration tests

**File**: `tests/integration/forum-rls.test.ts`

**Intent**: Sprawdzić RLS na prawdziwym lokalnym Supabase.

**Contract**:

- Fan tworzy wątek i komentarz.
- Anon/authenticated może czytać wątki i komentarze.
- Fan może usunąć własny komentarz.
- Fan nie może usunąć cudzego komentarza ani wątku.
- Admin może usunąć komentarz i wątek.
- Usunięcie wątku usuwa komentarze przez cascade.

#### 3. E2E test

**File**: `tests/e2e/forum.spec.ts`

**Intent**: Dodać smoke ścieżkę forum w przeglądarce.

**Contract**:

- Zalogowany fan widzi `/forum`.
- Fan tworzy wątek.
- Fan otwiera wątek i dodaje komentarz.
- Admin usuwa komentarz lub wątek inline.

#### 4. Legal documents

**File**: `src/pages/privacy-policy.astro`

**Intent**: Dodać forum jako nowy cel przetwarzania danych UGC.

**Contract**:

- Opisać: tytuł wątku, treść wątku, komentarze, login/etykieta autora, identyfikator konta, daty publikacji.
- Opisać retencję: treści zostają do usunięcia przez admina lub autora komentarza; po usunięciu konta autor może zostać oznaczony jako „Usunięty użytkownik”.

**File**: `src/pages/terms.astro`

**Intent**: Zmienić forum z zapowiedzi na działającą funkcję i dodać zasady odpowiedzialności za treści.

**Contract**:

- Użytkownik odpowiada za zgodność treści z prawem i regulaminem.
- Admin może usuwać treści naruszające zasady.
- Forum nie obejmuje jeszcze ekip, próśb o dołączenie i ogłoszeń organizatorów.

**File**: `src/lib/legal/paths.ts`

**Intent**: Zaktualizować `LEGAL_UPDATED_AT`.

**Contract**:

- Data w formacie używanym już w pliku.

### Success Criteria:

#### Automated Verification:

- Pełna weryfikacja przechodzi: `npm run verify`
- Produkcyjny build przechodzi: `npm run build`
- Testy E2E przechodzą: `npm run test:e2e`
- Jeśli lokalny Supabase jest skonfigurowany, integracje przechodzą: `npm run test:ci`

#### Manual Verification:

- Forum wygląda 1:1 z mockupem `bassmap-pl-ui`, nagłówek to „Share the bass!”.
- Fan tworzy wątek w każdym z sześciu działów i widzi go w odpowiednim dziale.
- Paginacja / „Pokaż więcej” działa po przekroczeniu limitu wątków w dziale.
- Fan dodaje i usuwa własny komentarz.
- Admin usuwa komentarz i cały wątek.
- Po usunięciu konta treści forum pokazują „Usunięty użytkownik”.
- Dokumenty prawne widocznie opisują forum.

**Implementation Note**: To UI + RLS + legal, więc przed pushem wymagane jest `npm run verify`, `npm run build` i `npm run test:e2e`.

---

## Testing Strategy

### Unit Tests:

- Schemat kategorii, tytułu, body wątku i komentarza.
- Mapowanie row → DTO.
- API route statusy: 200, 201, 400, 401, 403, 404.
- Account deletion anonymization dla `forum_threads` i `forum_comments`.
- Komponenty UI: render listy, formularz, walidacja, delete URL admin/fan.

### Integration Tests:

- RLS dla `forum_threads`.
- RLS dla `forum_comments`.
- Cascade delete komentarzy po usunięciu wątku.
- Brak możliwości usunięcia cudzego komentarza przez fana.
- Możliwość usunięcia dowolnej treści przez admina.

### Manual Testing Steps:

1. Zaloguj się jako fan i otwórz `/forum`.
2. Utwórz wątek w kategorii „Szukam ekipy”.
3. Otwórz wątek i dodaj komentarz.
4. Usuń własny komentarz jako fan.
5. Zaloguj się jako admin i usuń komentarz oraz wątek.
6. Sprawdź wygląd 1:1 z mockupem: hero „Share the bass!”, sześć działów, karty wątków, pigułki‑linki.
7. Sprawdź dokumenty prawne.

## Performance Considerations

MVP przyjmuje paginację po 20 wątków na stronę i sortowanie po `created_at desc`. To wystarczy na start bez pełnego wyszukiwania. Dla większej skali można później dodać cursor-based pagination i licznik komentarzy jako denormalizowaną kolumnę lub widok SQL.

Komentarze wątku można pobierać bez paginacji w MVP, jak komentarze eventów. Jeśli wątki zaczną mieć setki komentarzy, trzeba dodać paginację komentarzy.

## Migration Notes

Migracja tworzy nowe tabele, więc nie wymaga transformacji istniejących danych. Rollback ręczny oznacza usunięcie tabel `forum_comments` i `forum_threads`, ale przed produkcją należy pamiętać, że po starcie forum tabele będą zawierać UGC i nie można ich usuwać bez decyzji produktowo-prawnej.

Na produkcji migrację trzeba wykonać przed deployem kodu, który czyta nowe tabele.

## References

- Related research: `context/changes/forum-threads/research.md`
- UI mockup (wygląd 1:1): `bassmap-pl-ui/app/forum/page.tsx`, `bassmap-pl-ui/components/forum/{forum-hero,forum-board,thread-card}.tsx`, `bassmap-pl-ui/lib/forum.ts`
- Istniejące komponenty stylu: `src/components/shell/Equalizer.tsx`, `src/components/fan/GenreBadge.tsx`, `src/lib/shell-styles.ts`
- Similar implementation: `context/archive/2026-06-19-event-comments/`
- Placeholder page: `src/pages/forum.astro`
- RLS template: `supabase/migrations/20260619100000_event_comments.sql`
- API template: `src/pages/api/events/[id]/comments.ts`
- Fan delete template: `src/pages/api/fan/event-comments/[id].ts`
- Admin delete template: `src/pages/api/admin/event-comments/[id].ts`
- UI template: `src/components/events/EventCommentsSection.tsx`
- Account deletion template: `src/lib/services/account-deletion.ts`
- Lessons: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` – <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Schema and Contracts

#### Automated

- [x] 1.1 Migration applies cleanly with `npx supabase migration up` – a2cd95c
- [x] 1.2 Type checking passes with `npm run check` – a2cd95c
- [x] 1.3 Documentation lint passes with `npm run lint:docs` – a2cd95c

#### Manual

- [x] 1.4 Supabase shows `forum_threads` and `forum_comments` – a2cd95c
- [x] 1.5 RLS is enabled on both forum tables – a2cd95c

### Phase 2: Services, Validation, and Account Deletion

#### Automated

- [x] 2.1 Forum schema tests pass with `npm test -- tests/unit/forum-schema.test.ts` – 959e7f5
- [x] 2.2 Account deletion service tests pass with `npm test -- tests/unit/account-deletion-service.test.ts` – 959e7f5
- [x] 2.3 Type checking passes with `npm run check` – 959e7f5

#### Manual

- [x] 2.4 Publishing works with profile login and fallback author label – 959e7f5
- [x] 2.5 Account deletion anonymizes forum authors instead of deleting content – 959e7f5

### Phase 3: API Routes

#### Automated

- [x] 3.1 Forum API tests pass with `npm test -- tests/unit/forum-api.test.ts` – 2948607
- [x] 3.2 Type checking passes with `npm run check` – 2948607
- [x] 3.3 Lint passes with `npm run lint` – 2948607

#### Manual

- [x] 3.4 Auth, fan delete, admin delete, and forbidden cases behave correctly through API calls – 2948607

### Phase 4: Forum UI

#### Automated

- [x] 4.1 Forum component tests pass with `npm test -- tests/unit/forum-*.test.tsx`
- [x] 4.2 Type checking passes with `npm run check`
- [x] 4.3 Lint passes with `npm run lint`

#### Manual

- [ ] 4.4 `/forum` matches `bassmap-pl-ui` 1:1 (hero "Share the bass!", six boards, thread cards)
- [ ] 4.5 Thread creation and detail view work end-to-end
- [ ] 4.6 Admin and fan delete actions show only where allowed

### Phase 5: Tests, E2E, and Legal Sync

#### Automated

- [ ] 5.1 Full verification passes with `npm run verify`
- [ ] 5.2 Production build passes with `npm run build`
- [ ] 5.3 E2E tests pass with `npm run test:e2e`
- [ ] 5.4 Supabase integration tests pass with `npm run test:ci` when `.env.test` is available

#### Manual

- [ ] 5.5 Fan forum flow works in browser
- [ ] 5.6 Admin moderation flow works in browser
- [ ] 5.7 Legal documents describe forum UGC

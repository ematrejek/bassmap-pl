# Komentarze pod wydarzeniami (S-15) Implementation Plan

## Overview

Slice roadmapy **S-15** (`change-id`: **`event-comments`**). Pod szczegółami **opublikowanego** wydarzenia (nadchodzącego lub archiwalnego) użytkownicy czytają komentarze publicznie. Tylko zalogowany użytkownik może dodać komentarz (1–2000 znaków). Administrator usuwa dowolny komentarz ze strony wydarzenia.

**PRD:** FR-021. **Issue:** [#27](https://github.com/ematrejek/bassmap-pl/issues/27).

## Current State Analysis

Partia II dostarczyła konta fanów (S-12), compliance okładek (S-17), duplikaty (S-13) i sugestie zmian (S-14). Strona szczegółów wydarzenia (`src/pages/events/[id].astro`) renderuje okładkę, opis, lineup, CTA biletowy i formularz sugestii (tylko nadchodzące, nie-admin). **Brak komentarzy** w UI, API i bazie.

### Key Discoveries:

- `getPublishedEventById` (`src/lib/services/events.ts:246`) – zwraca `published` nadchodzące **i** archiwalne (RLS `events_select_public` + `events_select_past_public`).
- `resolveSubmitterProfiles` + `loginFromEmail` (`src/lib/auth/submitter-profile.ts`) – wzorzec pobierania e-maila autora po `userId` (service role); **nie** nadaje się do publicznego odczytu komentarzy (ujawnienie e-maili).
- `profileFromEmail` w `ProfileSection.tsx` – heurystyka `displayName` z lokalnej części e-maila; do wyciągnięcia do współdzielonego helpera.
- Polityka prywatności §2.8 – placeholder „planowana funkcja”; §4 już wspomina komentarze po usunięciu konta (S-16).
- Regulamin – brak § o publicznych komentarzach (jest §5.10–5.12 o sugestiach).
- Wzorce API: `requireAuth` / `requireAdmin` (`src/lib/auth/guards.ts`), `jsonResponse`, Zod walidacja (`src/pages/api/fan/change-suggestions/index.ts`).

## Desired End State

1. Sekcja **Komentarze** na dole `/events/[id]` dla każdego opublikowanego wydarzenia.
2. Gość: lista komentarzy + tekst „Zaloguj się, aby skomentować” z linkiem `SIGN_IN_PATH?redirect=…`.
3. Zalogowany (fan lub admin): textarea + przycisk **Wyślij** → komentarz na liście z `author_label` i datą.
4. Zalogowany autor: przy własnym komentarzu **Usuń** → `DELETE` fan API → komentarz znika.
5. Admin: przy każdym komentarzu **Usuń** → `DELETE` admin API → komentarz znika.
6. RLS: SELECT dla `anon` + `authenticated` gdy event `published`; INSERT `authenticated` z `author_id = auth.uid()`; DELETE dla `is_admin()` lub własnego `author_id`.
7. Polityka §2.8 aktywna; regulamin §5.13+; `LEGAL_UPDATED_AT` zaktualizowany.

### Weryfikacja ręczna

- Wyloguj → otwórz event z komentarzami → widoczna lista, brak formularza.
- Zaloguj jako fan → dodaj komentarz → widoczny z etykietą autora.
- Zaloguj jako admin → usuń komentarz → znika po odświeżeniu.

## What We're NOT Doing

- Edycja komentarza przez autora
- Rate limiting / anty-spam w bazie
- Automatyczna moderacja treści (słowa wulgarne)
- Osobna tabela komentarzy w panelu admina
- Powiadomienia e-mail
- Usuwanie konta i anonimizacja (S-16) – schema tylko **przygotowana**
- Komentarze pod wydarzeniami `pending` / nieopublikowanymi

## Implementation Approach

Nowa tabela `event_comments` z snapshotem `author_label` przy INSERT (serwer liczy z e-maila sesji). Publiczne API zwraca wyłącznie `authorLabel`, nigdy e-mail. `author_id` z `ON DELETE SET NULL` pod przyszły S-16.

```
GET  /api/events/[id]/comments          → lista (public)
POST /api/events/[id]/comments          → create (auth)
DELETE /api/fan/event-comments/[id]     → hard delete (auth, own comment)
DELETE /api/admin/event-comments/[id]   → hard delete (admin, any comment)
```

> **Plan-review 2026-06-19:** parametr trasy to `[id]` (jak `admin/events/[id].ts`), nie `[eventId]`.

## Critical Implementation Details

**`author_label`:** Przy INSERT API ustawia `author_label = authorLabelFromEmail(user.email)` – ta sama heurystyka co profil (`Jan Kowalski` z `jan.kowalski@…`). Gdy `user.email` brak → **400** („Brak adresu e-mail na koncie”). Kolumna **NOT NULL** – po anonimizacji w S-16 wartość zmieni się na `Usunięty użytkownik`, `author_id` → NULL.

**Eligibility eventu:** INSERT i SELECT wymagają `EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published')`. Nie sprawdzamy `is_upcoming` – archiwalne eventy też mogą mieć komentarze.

**Body:** `char_length(body) BETWEEN 1 AND 2000`; trim po stronie API przed walidacją Zod; odrzuć pusty po trim.

**Kolejność:** `ORDER BY created_at ASC` – najstarsze na górze.

**Delete:** Hard `DELETE` (nie soft delete). RLS: `event_comments_delete_admin` (`is_admin()`) oraz `event_comments_delete_own` (`author_id = auth.uid()`). Fan API tylko dla nie-adminów; admin używa admin API.

## Phase 1: Schema – `event_comments` + RLS

### Overview

Utworzyć tabelę, indeksy i polityki RLS zgodne z wzorcem `change_suggestions`.

### Changes Required:

#### 1. Migracja SQL

**File**: `supabase/migrations/YYYYMMDDHHmmss_event_comments.sql`

**Intent**: Tabela komentarzy z RLS: public read, auth insert, admin delete.

**Contract**:

```sql
CREATE TABLE public.event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  author_label text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_comments_body_length CHECK (
    char_length(body) >= 1 AND char_length(body) <= 2000
  )
);

CREATE INDEX event_comments_event_id_created_at_idx
  ON public.event_comments (event_id, created_at ASC);

CREATE INDEX event_comments_author_id_idx
  ON public.event_comments (author_id);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: public when parent event is published
CREATE POLICY event_comments_select_public
  ON public.event_comments FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

-- INSERT: logged-in user, own author_id, published event
CREATE POLICY event_comments_insert_authenticated
  ON public.event_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

-- DELETE: admin only
CREATE POLICY event_comments_delete_admin
  ON public.event_comments FOR DELETE
  TO authenticated
  USING (public.is_admin());
```

Brak policy UPDATE – komentarze nie są edytowalne.

#### 2. Typy

**File**: `src/types.ts`

**Intent**: Dodać `EventComment` i `EventCommentRow` (snake_case DB → camelCase TS).

**Contract**:

```ts
export interface EventComment {
  id: string;
  eventId: string;
  authorId: string | null;
  authorLabel: string;
  body: string;
  createdAt: string;
}
```

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` stosuje migrację bez błędu
- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- W Supabase Studio: INSERT testowy (service role) + SELECT jako anon symulowany przez policy check

**Implementation Note**: Po fazie 1 – potwierdzenie manualne przed fazą 2.

---

## Phase 2: Serwis + walidacja + display name helper

### Overview

Logika biznesowa komentarzy i współdzielony helper etykiety autora.

### Changes Required:

#### 1. Display name helper

**File**: `src/lib/auth/display-name.ts` (nowy)

**Intent**: Jedna funkcja `authorLabelFromEmail(email: string): string` – logika z `ProfileSection.profileFromEmail` (bez `login`).

**Contract**: Eksport czystej funkcji; opcjonalnie zrefaktorować `ProfileSection.tsx` do importu (minimalny diff – jedna linia zamiany).

#### 2. Schema walidacji

**File**: `src/lib/events/comment-schema.ts` (nowy)

**Intent**: Zod dla body komentarza.

**Contract**: `commentBodySchema = z.string().trim().min(1, "…").max(2000, "…")`; eksport `parseCommentBody(input)`.

#### 3. Serwis

**File**: `src/lib/services/event-comments.ts` (nowy)

**Intent**: CRUD komentarzy przez Supabase client.

**Contract**:

- `mapEventCommentRow(row: EventCommentRow): EventComment`
- `listEventComments(supabase, eventId): Promise<ServiceResult<EventComment[]>>` – sort `created_at` ASC
- `createEventComment(supabase, userId, authorEmail, { eventId, body }): Promise<ServiceResult<EventComment>>` – ustaw `author_id`, `author_label` z helpera; zwrot błędu gdy event nie istnieje / RLS odrzuci
- `deleteEventComment(supabase, commentId): Promise<ServiceResult<{ id: string }>>` – admin context (RLS)

Typ `ServiceResult` jak w `change-suggestions.ts`.

### Success Criteria:

#### Automated Verification:

- Unit testy `comment-schema.test.ts` – trim, min/max length
- `npm run lint` i `npm run build`

#### Manual Verification:

- (Opcjonalnie) wywołanie serwisu w teście integracyjnym w fazie 5

---

## Phase 3: API routes

### Overview

Trzy endpointy REST zgodne z konwencją projektu (`prerender = false`, uppercase eksporty).

### Changes Required:

#### 1. Public list + create

**File**: `src/pages/api/events/[id]/comments.ts` (nowy)

**Intent**: GET lista; POST nowy komentarz.

**Contract**:

- `GET`: bez auth; `id` z `context.params` (uuid Zod); najpierw `getPublishedEventById` → **404** gdy brak eventu; inaczej `listEventComments` → **200** `{ comments }` (może być `[]`).
- `POST`: `requireAuth`; body `{ body: string }`; `parseCommentBody`; odrzuć gdy `!user.email` (400); `createEventComment` z e-mailem; 201 `{ comment }`; 400 walidacja; 401 brak sesji; 404 event.

#### 2. Admin delete

**File**: `src/pages/api/admin/event-comments/[id].ts` (nowy)

**Intent**: Trwałe usunięcie komentarza.

**Contract**: `DELETE`, `requireAdmin`, uuid `id` z params; `deleteEventComment`; 200 `{ id }`; 404 gdy brak wiersza.

### Success Criteria:

#### Automated Verification:

- `tests/unit/event-comments-api.test.ts` – GET public, POST 401 bez auth, POST happy path mock, DELETE 403 non-admin
- `npm run lint` i `npm run build`

#### Manual Verification:

- curl: GET komentarze; POST jako fan → 201; DELETE jako admin → 200

---

## Phase 4: UI – sekcja komentarzy na stronie wydarzenia

### Overview

React island z listą, formularzem i akcją admin delete.

### Changes Required:

#### 1. Komponent sekcji

**File**: `src/components/events/EventCommentsSection.tsx` (nowy)

**Intent**: Interaktywna sekcja komentarzy.

**Contract**:

- Props: `eventId: string`, `initialComments: EventComment[]`, `isLoggedIn: boolean`, `isAdmin: boolean`, `redirectPath: string`
- Render: `<h2>Komentarze</h2>`; gdy `comments.length === 0` – krótki tekst **„Brak komentarzy.”**; lista z `authorLabel`, `formatEventDate(createdAt)` (reuse z `@/lib/events/format`), `body` (`whitespace-pre-wrap`)
- Gdy `!isLoggedIn`: `<p>` + link do `/auth/signin?redirect=${encodeURIComponent(redirectPath)}`
- Gdy `isLoggedIn`: `<Textarea>` + **Wyślij** → POST API; po sukcesie dopisz do stanu lokalnego (lub `router` reload – preferowane append do listy bez pełnego reload)
- Gdy `isAdmin`: przy każdym wierszu **Usuń** z `AlertDialog` potwierdzeniem → DELETE API → usuń ze stanu
- Stany: `submitting`, `deletingId`, `error` – komunikaty po polsku
- Klasy przez `cn()` i `shell-*` jak w `EventSuggestChangesForm`

#### 2. Strona eventu

**File**: `src/pages/events/[id].astro`

**Intent**: SSR fetch komentarzy i osadzenie islandu.

**Contract**:

- Import `listEventComments` z serwisu
- Po `getPublishedEventById`: jeśli event, `commentsResult = await listEventComments(supabase, id)`
- Sekcja na dole `<article>`, **po** formularzu sugestii / bilecie (komentarze dla wszystkich published, nie tylko upcoming)
- `<EventCommentsSection client:visible … />` z `initialComments`, `isLoggedIn`, `isAdmin`, `redirectPath={eventPagePath}`

### Success Criteria:

#### Automated Verification:

- `npm run lint` i `npm run build`

#### Manual Verification:

- Gość: lista + link logowania
- Fan: dodaj komentarz → widoczny bez F5
- Admin: usuń komentarz innego użytkownika
- Event archiwalny: komentarze działają

---

## Phase 5: Testy integracyjne, legal, public roadmap

### Overview

RLS end-to-end, dokumenty prawne, homepage roadmap, sync `roadmap.md` przy implementacji/archive.

### Changes Required:

#### 1. Testy integracyjne

**File**: `tests/integration/event-comments-rls.test.ts` (nowy)

**Intent**: Weryfikacja RLS na lokalnym Supabase.

**Contract**:

- Fan INSERT na published event → sukces
- Anon SELECT widzi komentarze
- Fan INSERT na `pending` event → odrzucone (RLS)
- Non-admin DELETE → odrzucone
- Admin DELETE → sukces
- Fixture cleanup w `afterAll` (jak `change-suggestions-rls.test.ts`)

#### 2. Legal sync

**Files**: `src/pages/privacy-policy.astro`, `src/pages/terms.astro`, `src/lib/legal/paths.ts`

**Intent**: Aktywować §2.8 (treść komentarza, `author_label`, moderacja, retencja); dodać **§5.13** regulaminu (zasady komentarzy, odpowiedzialność, zakaz spamu, prawo admina do trwałego usunięcia).

**Contract**: `LEGAL_UPDATED_AT` = data wdrożenia (np. `19 czerwca 2026 r.`); usunąć sformułowanie „planowana funkcja” / „nie są zbierane” z §2.8; dopisać że komentarz usunięty przez Administratora nie podlega odzyskowi.

#### 3. Public roadmap (usunięte)

**Files**: `src/data/public-roadmap.ts`, `src/components/discovery/RoadmapTeaser.astro`

**Intent**: Relikt po wcześniejszej wersji strony głównej – sekcja „On the roadmap” nie jest już renderowana. Przy implementacji/archive **usunąć** oba pliki (nie utrzymywać wpisów S-15).

#### 4. Roadmap sync

**File**: `context/foundation/roadmap.md`

**Intent**: Status S-15 → `in progress` na `/10x-implement`; `done` + zamknięcie #27 przy archive.

### Success Criteria:

#### Automated Verification:

- `npm run test:ci` (lub `npm test` lokalnie)
- `npm run lint:all`
- `npm run build`

#### Manual Verification:

- Przeczytaj zaktualizowane sekcje polityki/regulaminu
- Pełna ścieżka gość → fan → admin delete w przeglądarce

---

## Testing Strategy

### Unit Tests:

- `parseCommentBody` – pusty, whitespace, max length
- API route handlers – status codes, auth gates (mock serwisu)

### Integration Tests:

- RLS INSERT/SELECT/DELETE matrix (anon, fan, admin)
- Odmowa INSERT na niepublished event

### Manual Testing Steps:

1. Wyloguj → `/events/[id]` → widoczne komentarze, brak textarea
2. Zaloguj fan → dodaj komentarz → etykieta autora zgodna z profilem
3. Zaloguj admin → usuń komentarz → znika
4. Otwórz archiwalny event → dodaj komentarz „po evencie”
5. Sprawdź politykę i regulamin w stopce

## Performance Considerations

- Indeks `(event_id, created_at)` wystarczy na MVP (dziesiątki komentarzy per event).
- SSR prefetch listy – jedno zapytanie na page load; POST nie wymaga przeładowania całej strony.
- Brak N+1 – `author_label` denormalizowany w wierszu.

## Migration Notes

- Deploy migracji przed kodem aplikacji (tabela pusta – backward compatible).
- Po deploy: sekcja komentarzy pojawia się na wszystkich stronach published eventów.

## S-16 Handoff (nie w tym slice)

Przy usuwaniu konta (S-16): `UPDATE event_comments SET author_id = NULL, author_label = 'Usunięty użytkownik' WHERE author_id = :userId`. Treść `body` bez zmian. UI już czyta `authorLabel` z wiersza.

## References

- S-14 plan: `context/archive/2026-06-19-change-suggestions/plan.md`
- RLS wzorzec: `supabase/migrations/20260616140000_duplicate_detection_and_suggestions.sql`
- Strona eventu: `src/pages/events/[id].astro`
- PRD FR-021, FR-022 (przygotowanie schema)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` – <commit sha>` when a step lands.

### Phase 1: Schema – event_comments + RLS

#### Automated

- [x] 1.1 `npx supabase db reset` stosuje migrację bez błędu
- [x] 1.2 `npm run lint` przechodzi
- [x] 1.3 `npm run build` przechodzi

#### Manual

- [x] 1.4 Policy SELECT/INSERT w Studio

### Phase 2: Serwis + walidacja

#### Automated

- [x] 2.1 Unit testy `comment-schema.test.ts` przechodzą
- [x] 2.2 `npm run lint` przechodzi
- [x] 2.3 `npm run build` przechodzi

### Phase 3: API routes

#### Automated

- [x] 3.1 `tests/unit/event-comments-api.test.ts` przechodzi
- [x] 3.2 `npm run lint` i `npm run build`

#### Manual

- [x] 3.3 curl POST/DELETE

### Phase 4: UI – sekcja komentarzy

#### Automated

- [x] 4.1 `npm run lint` przechodzi
- [x] 4.2 `npm run build` przechodzi

#### Manual

- [x] 4.3 Gość / fan / admin ścieżki w przeglądarce

### Phase 5: Testy integracyjne, legal, roadmap

#### Automated

- [x] 5.1 `npm run test:ci` przechodzi
- [x] 5.2 `npm run lint:all` przechodzi
- [x] 5.3 `npm run build` przechodzi

#### Manual

- [x] 5.4 Legal copy + pełna ścieżka w przeglądarce

## Plan Review

Szczegółowy przegląd: `reviews/plan-review.md` (2026-06-19). Werdykt: **zatwierdzony z poprawkami** – gotowy pod `/10x-implement`.

Poprawki wpisane w plan: `[id]` w ścieżce API, obsługa braku `user.email`, reuse `formatEventDate`, pusty stan listy, doprecyzowanie legal przy hard delete.

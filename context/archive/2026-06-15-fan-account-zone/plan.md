# Strefa zalogowanego fana – Implementation Plan

## Overview

Slice roadmapy **S-12** (`change-id`: **`fan-account-zone`**). Zalogowany fan (nie admin) dostaje własną nawigację w globalnym menu, stronę profilu, listę własnych zgłoszeń wydarzeń, formularz „Dodaj wydarzenie” (status **`pending`** – niewidoczne publicznie do akceptacji admina) oraz placeholdery „Moja ekipa” i „Forum”. Admin zachowuje Panel admina i dostaje minimalne akcje moderacji (opublikuj / odrzuć) dla zgłoszeń fanów.

**Adresy URL po angielsku** (konwencja z F-04); **etykiety UI po polsku**.

## Current State Analysis

- **`AppMenu.tsx`** – zalogowany użytkownik widzi tylko email, opcjonalnie Panel admina, link **Dashboard** (`/dashboard`) i Wyloguj (`src/components/shell/AppMenu.tsx` L80–96). Brak: profil, moje eventy, dodaj event, ekipa, forum.
- **`dashboard.astro`** – placeholder powitania + email (`src/pages/dashboard.astro` L9–23); jedyna chroniona strona poza `/admin`.
- **`middleware.ts`** – `PROTECTED_ROUTES = ["/dashboard"]` (L7); brak tras strefy fana.
- **`routes.ts`** – brak stałych dla `/profile`, `/my-events` itd.
- **Auth** – Supabase User + `isAdmin` przez RPC `is_admin()`; **brak tabeli `profiles`**, brak kolumny `created_by` na `events`.
- **RLS events** – INSERT/UPDATE/DELETE **tylko admin** (`20260610100000_create_events.sql` L159–176). Fan nie może nic zapisać (potwierdzone `tests/integration/auth-mutation-deny.test.ts`).
- **Enum status** – `pending` istnieje w DB, ale aplikacja **nigdy go nie ustawia**; admin create zawsze `published` (`src/lib/services/events.ts` L279).
- **AdminEventsTable** – etykiety UI dla `pending` / `rejected` już gotowe (L11–16); brak akcji „Opublikuj” / „Odrzuć”.
- **`EventForm.tsx`** + **`parseEventCreate`** – pełna walidacja pól wydarzenia; hardcoded URL `/api/admin/events` – do parametryzacji dla fana.
- **Okładki** – storage RLS admin-only; fan submit **bez uploadu okładki** w tym slice.
- **PRD** – Non-Goals nadal mówi „No fan accounts in MVP” (`context/foundation/prd.md` L163); Partia II świadomie to odblokowuje.

### Key Discoveries

- Największe reużycie: `schema.ts`, geokodowanie w `services/events.ts`, większość pól `EventForm.tsx`.
- Obowiązkowa migracja: `created_by` + polityki RLS fan INSERT (`status = pending`) + SELECT własnych wierszy.
- `requireAuth()` istnieje w `guards.ts`, ale **nie jest używany** w żadnym endpoincie – pierwsze użycie w tym slice.
- Placeholder `/dashboard` zastąpić `/profile` + redirect 301 dla starych linków.

## Desired End State

1. **Menu zalogowanego fana** (nie-admin): Lista eventów, Mój profil, Moje eventy, Dodaj wydarzenie, Moja ekipa, Forum, Wyloguj.
2. **Menu zalogowanego admina** – navLinks publiczne + Panel admina + Wyloguj (**bez** sekcji fan – roadmap S-12: zakładki fana tylko dla nie-admina).
3. **`/profile`** – email, krótki opis strefy konta, linki do Moje eventy / Dodaj wydarzenie, Wyloguj.
4. **`/my-events`** – lista wydarzeń gdzie `created_by = auth.uid()`, badge statusu (Oczekuje / Opublikowane / Odrzucone).
5. **`/my-events/new`** – formularz dodawania (reuse walidacji admin); sukces → redirect `/my-events` + komunikat „Wysłano do moderacji”.
6. **`/team`**, **`/forum`** – strony placeholder „Wkrótce” (zalogowany fan).
7. **API fan** – `POST /api/fan/events` → `requireAuth()`, `status: pending`, `created_by: user.id`.
8. **Admin moderacja** – w tabeli admina dla `pending`: przyciski Opublikuj / Odrzuć (PATCH status).
9. **`/dashboard`** → **301** `/profile`.
10. CI: `npm run lint`, `npm run build`, `npm test` zielone.

### Weryfikacja ręczna

- Niezalogowany na `/profile` → redirect `/auth/signin`.
- Fan wysyła wydarzenie → widzi je na `/my-events` ze statusem „Oczekuje”; **nie** widać na `/events`.
- Admin publikuje pending → wydarzenie pojawia się na `/events`.
- Admin odrzuca pending → fan widzi „Odrzucone” na `/my-events`.
- Menu – wszystkie pozycje S-12; admin ma dodatkowo Panel admina.
- Placeholdery `/team`, `/forum` – komunikat „Wkrótce”.
- Regresja: discovery, archiwum, auth, panel admina.

## What We're NOT Doing

- Wykrywanie duplikatów (S-13), sugestie zmian (S-14), komentarze (S-15), usuwanie konta (S-16).
- Upload okładki przez fana (admin dodaje przy moderacji).
- Edycja wydarzenia przez fana po wysłaniu (tylko podgląd listy).
- Tabela `profiles` / display name / avatar (MVP: email z auth).
- Forum i ekipa poza placeholderem.
- Aktualizacja `prd.md` (osobna decyzja produktowa).
- Turnstile / rate limit na fan submit (opcjonalnie kolejny slice).
- Zamknięcie issue #24 – dopiero przy `/10x-archive`.

## Implementation Approach

Pięć faz: (1) migracja DB + serwis, (2) API fan + moderacja admin, (3) routing + strony fan, (4) menu + admin UI moderacji, (5) testy i porządki. **Uwaga (plan-review):** `routes.ts` + `middleware.ts` w fazie 3 – przed stronami Astro, żeby trasy nie były publiczne.

## Critical Implementation Details

### Stałe tras

**File**: `src/lib/routes.ts` (rozszerzenie)

```typescript
export const PROFILE_PATH = "/profile";
export const MY_EVENTS_PATH = "/my-events";
export const MY_EVENTS_NEW_PATH = "/my-events/new";
export const TEAM_PATH = "/team";
export const FORUM_PATH = "/forum";
```

**Konwencja:** trasy publiczne po angielsku; etykiety menu po polsku.

### Migracja DB

**File**: `supabase/migrations/20260616120000_fan_event_submissions.sql`

```sql
-- Kolumna właściciela zgłoszenia
ALTER TABLE public.events
  ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX events_created_by_idx ON public.events (created_by)
  WHERE created_by IS NOT NULL;

-- Fan: INSERT tylko pending, created_by = siebie, nie-admin
CREATE POLICY events_insert_fan
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_admin()
    AND created_by = auth.uid()
    AND status = 'pending'
  );

-- Fan: SELECT własnych wierszy (dowolny status)
CREATE POLICY events_select_own
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    AND NOT public.is_admin()
  );
```

**Uwagi:**

- Admin INSERT nadal przez `events_insert_admin` (bez `created_by` lub z NULL – admin tworzy od razu `published`).
- Fan **nie** dostaje UPDATE/DELETE – tylko admin po moderacji.
- `ON DELETE SET NULL` – przy usunięciu konta (S-16) wydarzenia nie znikają; S-16 rozstrzygnie kaskadę.

### Serwis wydarzeń

**File**: `src/lib/services/events.ts`

1. **`createEvent`** – dodać opcjonalny parametr `options?: { status?: EventStatus; createdBy?: string }`. Domyślnie admin flow: `status: "published"`, `createdBy: undefined`.
2. **`createFanSubmittedEvent(supabase, userId, parsed)`** – wrapper: `createEvent(..., { status: "pending", createdBy: userId })`.
3. **`listEventsByCreator(supabase, userId)`** – `.eq("created_by", userId).order("created_at", { ascending: false })` + jawny filtr (lesson: nie polegać wyłącznie na RLS).
4. **`setEventStatus(supabase, id, status)`** – admin-only przez API; używane przy Opublikuj/Odrzuć.

**Mapper** – `toEventInsertRow` / `parsedCreateToInsert`: uwzględnić `createdBy` i parametryzowany `status`. Przy fan submit **`created_by` musi być w wierszu INSERT** (polityka RLS `WITH CHECK (created_by = auth.uid())` – DB nie wypełni pola sama).

### API fan

**File**: `src/pages/api/fan/events/index.ts`

```typescript
export const prerender = false;

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) return authError;
  if (context.locals.isAdmin) {
    return jsonResponse({ error: "Admin dodaje wydarzenia w panelu admina" }, 403);
  }
  // parseEventCreate(body) → createFanSubmittedEvent(supabase, user.id, parsed)
  // 201 { event }
};
```

**File**: `src/pages/api/admin/events/[id]/status.ts` (nowy)

- `PATCH` body: `{ status: "published" | "rejected" }`
- `requireAdmin()` + `setEventStatus`
- Walidacja: tylko z `pending` → `published` | `rejected`; inne przejścia → 400 (MVP)
- **Pierwszy endpoint PATCH w repo** – Astro obsługuje `export const PATCH` jak POST/PUT

### Formularz fana (reuse EventForm)

**Opcja (minimalna):** nowy komponent `FanEventForm.tsx` importujący wspólne pola z `EventForm` **lub** props na `EventForm`:

```typescript
interface EventFormProps {
  mode: "create" | "edit";
  variant?: "admin" | "fan"; // default admin
  submitUrl?: string;
  successRedirect?: string;
  showCoverUpload?: boolean;
}
```

Dla `variant="fan"`:

- `submitUrl = "/api/fan/events"`
- `successRedirect = MY_EVENTS_PATH + "?submitted=1"`
- `showCoverUpload = false`
- Copy przycisku: „Wyślij do moderacji”

### Strony Astro

| Plik                              | Opis                                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| `src/pages/profile.astro`         | Profil – email, CTA do my-events/new                                 |
| `src/pages/my-events/index.astro` | Lista + `FanEventsTable.tsx` (reuse badge styles z AdminEventsTable) |
| `src/pages/my-events/new.astro`   | `FanEventForm`                                                       |
| `src/pages/team.astro`            | Placeholder „Moja ekipa – wkrótce”                                   |
| `src/pages/forum.astro`           | Placeholder „Forum – wkrótce”                                        |

Wszystkie owinięte `AppShell`; chronione przez middleware.

### AppMenu – menu zalogowanego

**File**: `src/components/shell/AppMenu.tsx`

Sekcja zalogowanego (zamiast Dashboard):

```typescript
const fanLinks: MenuLink[] = [
  { label: "Mój profil", href: PROFILE_PATH },
  { label: "Moje eventy", href: MY_EVENTS_PATH },
  { label: "Dodaj wydarzenie", href: MY_EVENTS_NEW_PATH },
  { label: "Moja ekipa", href: TEAM_PATH },
  { label: "Forum", href: FORUM_PATH },
];
```

Kolejność w Sheet:

- **Niezalogowany:** `navLinks` → auth (Zaloguj / Zarejestruj)
- **Fan (`!isAdmin`):** `navLinks` → separator → `fanLinks` → Wyloguj
- **Admin:** `navLinks` → Panel admina → Wyloguj (bez `fanLinks`)

Usunąć link Dashboard. Zastąpić `DASHBOARD_PATH` → `PROFILE_PATH` w `routes.ts` (grep: 3 miejsca dziś).

### Middleware

**File**: `src/middleware.ts`

```typescript
const PROTECTED_ROUTES = [
  PROFILE_PATH,
  MY_EVENTS_PATH, // .startsWith() obejmuje też /my-events/new
  TEAM_PATH,
  FORUM_PATH,
];

// Redirect legacy dashboard
if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
  return context.redirect(PROFILE_PATH, 301);
}
```

Import stałych z `routes.ts`.

### Admin moderacja UI

**File**: `src/components/admin/AdminEventsTable.tsx`

Dla wierszy ze `status === "pending"` – kolumna Akcje:

- **Opublikuj** → `PATCH /api/admin/events/{id}/status` `{ status: "published" }`
- **Odrzuć** → `{ status: "rejected" }`
- Zachować link Edytuj (admin może poprawić dane przed publikacją)

Opcjonalnie: sort/filter pending na górze listy (MVP: badge wystarczy).

---

## Phase 1: Migracja DB, typy i serwis

### Overview

Kolumna `created_by`, polityki RLS fana, funkcje serwisu z parametrem status.

### Changes Required

#### 1. Migracja Supabase

**File**: `supabase/migrations/20260616120000_fan_event_submissions.sql`

**Intent**: Fan może INSERT `pending` z `created_by`; fan SELECT własnych; admin bez zmian.

#### 2. Typy

**File**: `src/types.ts` – pole `createdBy: string | null` na typie `Event`.

**File**: `src/lib/events/mapper.ts` – mapowanie `created_by` ↔ `createdBy`.

#### 3. Serwis

**Files**: `src/lib/services/events.ts`

- Parametryzacja `createEvent` (status, createdBy)
- `listEventsByCreator`
- `setEventStatus`

#### 4. Test integracyjny RLS

**File**: `tests/integration/fan-event-submit.test.ts`

- Non-admin: INSERT pending OK, INSERT published FAIL
- Non-admin: SELECT own pending OK, SELECT cudzy pending FAIL
- Anon: INSERT FAIL

### Success Criteria

#### Automated

- [ ] 1.1 `npm run lint` / `build`
- [ ] 1.2 Test `fan-event-submit.test.ts` (wymaga `supabase db push`)

#### Manual

- [ ] 1.3 Supabase Studio – polityki widoczne po migracji

---

## Phase 2: API fan i moderacja admin

### Overview

Endpoint fan submit + admin status patch; `requireAuth` w produkcji.

### Changes Required

#### 1. Fan API

**File**: `src/pages/api/fan/events/index.ts` – POST create pending.

#### 2. Admin status API

**File**: `src/pages/api/admin/events/[id]/status.ts` – PATCH publish/reject.

#### 3. Testy jednostkowe guards

**File**: `tests/unit/fan-events-api.test.ts` – mock locals; admin POST fan API → 403.

#### 4. Test integracyjny E2E submit

Rozszerzenie `fan-event-submit.test.ts` – pełny flow create przez serwis/API.

### Success Criteria

#### Automated

- [ ] 2.1 `npm run lint` / `build` / `test`

#### Manual

- [ ] 2.2 curl/Postman – fan POST tworzy pending (lokalnie)

---

## Phase 3: Routing, middleware i strony fan

### Overview

Stałe tras + chronione middleware (przed stronami), potem profil, lista, formularz, placeholdery.

### Changes Required

#### 0. routes.ts + middleware (najpierw)

**Files**: `src/lib/routes.ts`, `src/middleware.ts`

- Nowe stałe `PROFILE_PATH`, `MY_EVENTS_*`, `TEAM_PATH`, `FORUM_PATH`
- `PROTECTED_ROUTES` + redirect `/dashboard` → `/profile` (301)
- Usunąć / zastąpić `DASHBOARD_PATH`

#### 1. Wspólne etykiety statusów

**File**: `src/lib/events/status-labels.ts` – `STATUS_LABELS` + `statusBadgeClass` (współdzielone admin + fan).

#### 2. FanEventsTable

**File**: `src/components/fan/FanEventsTable.tsx` – import z `status-labels.ts`.

#### 3. FanEventForm

**File**: `src/components/fan/FanEventForm.tsx` – props `variant="fan"` na `EventForm` (preferowane) lub cienki wrapper – **nie** kopiować ~800 linii.

#### 4. Strony Astro

**Files**: `profile.astro`, `my-events/index.astro`, `my-events/new.astro`, `team.astro`, `forum.astro`

#### 5. Usunięcie dashboard

**File**: `src/pages/dashboard.astro` – delete po redirect w middleware (lub cienki redirect astro).

### Success Criteria

#### Automated

- [ ] 3.1 `npm run lint` / `build`

#### Manual

- [ ] 3.2 Fan submit end-to-end w przeglądarce
- [ ] 3.3 Placeholdery team/forum widoczne

---

## Phase 4: Menu i admin UI moderacji

### Overview

AppMenu z sekcją fan (`!isAdmin` only), AdminEventsTable publish/reject.

### Changes Required

#### 1. routes.test.ts

Test `buildDiscoverySearchUrl` + nowe stałe tras.

#### 2. AppMenu.tsx

`fanLinks` tylko gdy `!isAdmin`; admin: Panel admina bez sekcji fan.

#### 3. AdminEventsTable + PublishRejectButtons

**File**: `src/components/admin/EventModerationActions.tsx` (React island lub inline fetch).

#### 4. AdminEventsTable – import status-labels

Refactor `AdminEventsTable.tsx` – użyć współdzielonego `status-labels.ts` zamiast lokalnych kopii.

### Success Criteria

#### Automated

- [ ] 4.1 `npm run lint` / `build` / `test`
- [ ] 4.2 Brak importów `DASHBOARD_PATH` poza middleware redirect/test

#### Manual

- [ ] 4.3 Menu – wszystkie pozycje S-12
- [ ] 4.4 Admin publikuje pending z tabeli

---

## Phase 5: Testy regresji i porządki

### Overview

Pełna regresja, dokumentacja w change.md, brak zmiany public-roadmap (S-12 nadal „nadchodzące” do archive).

### Changes Required

#### 1. Testy

- `tests/unit/routes.test.ts` – nowe ścieżki
- **`auth-mutation-deny.test.ts` bez zmian** – `createEvent()` nadal deny dla non-admin (published)
- Nowy `fan-event-submit.test.ts` – allow pending przez `createFanSubmittedEvent()`
- Fixture `buildMutationCreatePayload` – wariant z `created_by` jeśli potrzeba

#### 2. AGENTS.md / lessons (opcjonalnie przy archive)

Lesson: fan submit zawsze `pending` + jawny `created_by`; public read bez zmian.

#### 3. Weryfikacja regresji

Discovery, archive, admin CRUD, auth flow.

### Success Criteria

#### Automated

- [ ] 5.1 `npm run lint` / `build` / `test` – pełna regresja

#### Manual

- [ ] 5.2 Scenariusz: rejestracja → dodaj event → admin publish → widać na /events
- [ ] 5.3 `/dashboard` → `/profile`

---

## Risks and Mitigations

| Ryzyko                                | Mitygacja                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Fan widzi cudze pending przez RLS bug | Test integracyjny SELECT deny; jawny filtr `created_by` w serwisie                             |
| Spam zgłoszeń                         | MVP bez Turnstile; walidacja Zod + sensowne limity długości; rate limit w S-13+                |
| Admin nie widzi kto zgłosił           | Kolumna `created_by`; opcjonalnie email w admin table (join auth – tylko service role lub RPC) |
| PRD rozjechany z produktem            | Notatka w archive; aktualizacja PRD osobno                                                     |
| Duplikacja kodu EventForm             | Wspólny hook / props `variant`; nie kopiować 800 linii                                         |
| Okładka bez fan upload                | Admin dodaje przy edycji przed publish – OK dla MVP                                            |

## Deploy Notes

1. `npx supabase db push` – migracja `20260616120000`.
2. Deploy: `npx wrangler deploy` po merge.
3. Po deploy: test fan submit + admin publish na produkcji.

## Plan Review

Szczegółowy przegląd: `plan-review.md` (2026-06-14). Werdykt: **zatwierdzony z poprawkami** – gotowy pod `/10x-implement`.

## References

- Plan review: `context/archive/2026-06-15-fan-account-zone/plan-review.md`
- Roadmap S-12: `context/foundation/roadmap.md`
- App shell menu wzorzec: `context/archive/2026-06-14-app-shell-navigation/plan.md`
- RLS baseline: `supabase/migrations/20260610100000_create_events.sql`
- Lesson fan read: `context/foundation/lessons.md`
- Issue: [#24](https://github.com/ematrejek/bassmap-pl/issues/24)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` – <commit sha>` when a step lands.

### Phase 1: Migracja DB, typy i serwis

#### Automated

- [x] 1.1 Migracja + mapper + serwis
- [x] 1.2 Test integracyjny fan RLS
- [x] 1.3 `npm run lint` / `build`

#### Manual

- [ ] 1.4 Migracja na remote Supabase

### Phase 2: API fan i moderacja admin

#### Automated

- [x] 2.1 Fan + admin status API
- [x] 2.2 Testy API
- [x] 2.3 `npm run lint` / `build` / `test`

#### Manual

- [ ] 2.4 Lokalny test POST fan

### Phase 3: Routing, middleware i strony fan

#### Automated

- [x] 3.1 routes.ts + middleware + status-labels
- [x] 3.2 Komponenty fan + strony Astro
- [x] 3.3 `npm run lint` / `build`

#### Manual

- [ ] 3.4 E2E fan submit w przeglądarce

### Phase 4: Menu i admin UI moderacji

#### Automated

- [x] 4.1 AppMenu (fanLinks tylko !isAdmin)
- [x] 4.2 Admin moderation UI + refactor status-labels
- [x] 4.3 `npm run lint` / `build` / `test`

#### Manual

- [ ] 4.4 Menu i publish flow

### Phase 5: Testy regresji i porządki

#### Automated

- [x] 5.1 Pełna regresja CI
- [x] 5.2 Nowy test `fan-event-submit.test.ts` (nie zmieniać deny testu)

#### Manual

- [ ] 5.3 Scenariusz rejestracja → publish → discovery

## Archive addendum (2026-06-15)

- **Status:** archived → `context/archive/2026-06-15-fan-account-zone/`
- **Merge:** PR #29 (`5106171`); impl-review **APPROVED** (`reviews/impl-review.md`)
- **Legal follow-up:** audyt prawny w tej samej sesji (`ad53a46`–`76d8d7d`) — checkbox praw autorskich przy zgłoszeniu; pełny **S-17** (dropdown źródła + zapis audytu) pozostaje osobnym slice.
- **Manual QA pending:** migracja remote (`db push`), E2E fan submit w przeglądarce, pełny flow publish → discovery — nie blokuje archive (CI + deploy zielone).

# «Idę» i «Interesuję się» (S-19) Implementation Plan

## Overview

Slice roadmapy **S-19** (`change-id`: **`event-attendance`**). Zalogowany fan na stronie **nadchodzącego** opublikowanego wydarzenia oznacza «Idę» lub «Interesuję się»; wszyscy widzą **dokładne** liczniki; wydarzenia trafiają do sekcji **Moje eventy** (`#ide`, `#interesuje-sie`) i skrótu «Idę» na profilu. Placeholdery z S-12/S-18 zostają podłączone do prawdziwych danych.

**Issue:** [#39](https://github.com/ematrejek/bassmap-pl/issues/39). **PRD (propozycja):** FR-026.

## Current State Analysis

S-18 dostarczył kafelki z placeholderem `GOING_COUNT_PLACEHOLDER = 0` (`src/lib/events/rsvp-placeholder.ts`). S-12 przygotował sekcje «Idę» / «Obserwuję» w `MyEventsPage` i skrót na `ProfileSection` – z pustymi tablicami. Strona `/events/[id]` ma komentarze i sugestie, **bez UI RSVP**. Brak tabeli, serwisu i API attendance.

### Key Discoveries:

- Wzorzec UGC: `event_comments` – migracja + RLS, `src/lib/services/event-comments.ts`, `GET/POST /api/events/[id]/comments`, island `EventCommentsSection` z SSR prefetch (`src/pages/events/[id].astro:39-40,147-155`).
- `getPublishedEventById` zwraca nadchodzące i archiwalne `published` – jak komentarze (read); mutacje RSVP ograniczamy do **nadchodzących** (jak `EventSuggestChangesForm` + `isUpcomingEvent`).
- `listPublishedEvents` zwraca tylko nadchodzące – batch countów dotyczy listy odkrywania bez archiwum.
- Copy debt: «Obserwuję» / `#obserwuje` w kodzie vs «Interesuję się» / `#interesuje-sie` w roadmapie.
- Usuwanie konta: `account-deletion.ts` anonimizuje komentarze; attendance bez publicznej tożsamości – **CASCADE** na `user_id` wystarczy, bez zmian w `account-deletion.ts`.
- Lesson: jawne filtry `published` w serwisie; `npm run verify` przed pushem; mocki API `as unknown as APIContext`.

## Desired End State

1. Na `/events/[id]` (nadchodzące, published): przyciski «Idę» / «Interesuję się», liczniki obu statusów, toggle (ponowne kliknięcie aktywnego = rezygnacja).
2. Gość: widzi liczniki; link „Zaloguj się, aby oznaczyć udział” (`SIGN_IN_PATH?redirect=…`).
3. Zalogowany fan/admin: klik zmienia status; drugi przycisk przełącza status; liczniki aktualizują się bez pełnego reloadu.
4. Kafelek na `/events`: prawdziwy licznik «Idzie» (bez «Interesuję się» – decyzja S-18).
5. `/my-events`: sekcje «Idę» i «Interesuję się» z kafelkami nadchodzących eventów; anchor `#interesuje-sie`.
6. `/profile`: skrót do 6 kafelków «Idę» z SSR.
7. Tabela `event_attendance` + RLS; testy unit API + integracja RLS.
8. Polityka prywatności §2.9 (RSVP); `LEGAL_UPDATED_AT` zaktualizowany.

### Weryfikacja ręczna

- Gość na evencie → liczniki widoczne, brak przycisków akcji (tylko logowanie).
- Fan → «Idę» → licznik +1, event w Moje eventy `#ide` i na profilu.
- Fan → «Interesuję się» na tym samym evencie → przełączenie statusu, jeden wiersz w DB.
- Fan → ponowne «Idę» → rezygnacja, licznik -1.
- Archiwalny published event → liczniki na stronie szczegółów (jeśli były), brak przycisków RSVP.

## What We're NOT Doing

- Zaokrąglanie liczników („10+”) – dokładne liczby w MVP
- Licznik «Interesuję się» na kafelku listy odkrywania
- RSVP na wydarzeniach `pending` / nieopublikowanych
- Mutacje RSVP na przeszłych wydarzeniach (tylko odczyt liczników historycznych)
- Powiadomienia e-mail / push o RSVP
- Lista „kto idzie” z imionami użytkowników (tylko agregaty)
- Edycja profilu (S-20), znajomi (S-23)
- Zmiana middleware / nowych tras chronionych

## Implementation Approach

Nowa tabela `event_attendance` z unikalnym `(user_id, event_id)` i kolumną `status` (`going` | `interested`). Jeden wiersz na parę user+event – zmiana statusu przez `UPDATE`, rezygnacja przez `DELETE`.

```
GET    /api/events/[id]/attendance  → { goingCount, interestedCount, userStatus: null | "going" | "interested" }
PUT    /api/events/[id]/attendance  → body { status: "going" | "interested" }  (auth, upcoming published only)
DELETE /api/events/[id]/attendance  → usuń RSVP użytkownika (auth)
```

Serwis: `getAttendanceSummary`, `setAttendanceStatus`, `clearAttendance`, `listEventsForUserAttendance`, `getGoingCountsByEventIds`.

UI: nowy island `EventAttendanceSection` – wzorzec `EventCommentsSection` (`useState`, `fetch`, `readApiError`).

## Critical Implementation Details

**Eligibility mutacji:** API `PUT`/`DELETE` wymaga `getPublishedEventById` **oraz** `isUpcomingEvent(event.startsAt)`. `GET` liczników – tylko `published` (w tym archiwum na stronie szczegółów). RLS parent: `events.status = 'published'` (bez filtra daty – spójne z komentarzami).

**Toggle UX:** Jeśli `userStatus === requestedStatus` → `DELETE` (rezygnacja). Jeśli inny status lub brak → `PUT` z nowym statusem (upsert przez serwis: `insert … on conflict update` lub select + update/insert).

**Batch counts:** `getGoingCountsByEventIds` – jedno zapytanie z `.in('event_id', ids)` + agregacja w TS (lub RPC/count per id – przy MVP <100 eventów na liście wystarczy grupowanie wyników). Brak N+1 w pętli kafelków.

**Listy Moje eventy / profil:** `listEventsForUserAttendance(userId, status)` – join/logika: attendance rows → `event_id` → `getPublishedEventById` lub batch fetch events z filtrem `isUpcomingEvent` w serwisie. Sort: `starts_at ASC`.

**`EventWithCoverUrl`:** rozszerzyć opcjonalnie o `goingCount?: number` dla listy odkrywania; domyślnie `0` w kafelku gdy brak.

## Phase 1: Schema, typy i serwis

### Overview

Migracja Supabase, typy TS, serwis `event-attendance.ts` – fundament pod API i UI.

### Changes Required:

#### 1. Migracja SQL

**File**: `supabase/migrations/YYYYMMDDHHmmss_event_attendance.sql`

**Intent**: Tabela RSVP z RLS: public read na published parent, auth write tylko własne wiersze.

**Contract**:

- Tabela `event_attendance`: `id uuid PK`, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE`, `status text NOT NULL CHECK (status IN ('going', 'interested'))`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`, `UNIQUE (user_id, event_id)`.
- Indeksy: `(event_id, status)`, `(user_id, status)`.
- RLS enabled.
- `SELECT` → `anon, authenticated` gdy parent `published`.
- `INSERT` → `authenticated`, `user_id = auth.uid()`, parent `published`.
- `UPDATE` → `authenticated`, `user_id = auth.uid()`, parent `published`.
- `DELETE` → `authenticated`, `user_id = auth.uid()`.

#### 2. Typy

**File**: `src/types.ts`

**Intent**: Typy domenowe attendance zgodne z mapperem serwisu.

**Contract**: `AttendanceStatus = "going" | "interested"`; `EventAttendanceRow` (snake_case DB); `EventAttendanceSummary` (`goingCount`, `interestedCount`, `userStatus`); opcjonalnie `goingCount?: number` na `EventWithCoverUrl`.

#### 3. Serwis

**File**: `src/lib/services/event-attendance.ts`

**Intent**: Warstwa dostępu do danych – wzorzec `event-comments.ts` (`ServiceResult`, mapowanie row, błąd `42501`).

**Contract**:

- `getAttendanceSummary(supabase, eventId, userId?)` → counts + opcjonalny status zalogowanego.
- `setAttendanceStatus(supabase, userId, eventId, status)` → upsert / update.
- `clearAttendance(supabase, userId, eventId)` → delete własnego wiersza.
- `listEventsForUserAttendance(supabase, userId, status)` → `Event[]` nadchodzące published posortowane po `starts_at`.
- `getGoingCountsByEventIds(supabase, eventIds)` → `Record<string, number>`.

#### 4. Schemat Zod (opcjonalny helper)

**File**: `src/lib/events/attendance-schema.ts`

**Intent**: Walidacja body API `PUT`.

**Contract**: `status` enum `going` | `interested`.

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` (lokalnie) – migracja bez błędów
- `npm run check` – typy OK
- `npm run lint` – bez błędów w nowych plikach

#### Manual Verification:

- W Supabase Studio widać tabelę `event_attendance` z politykami RLS

**Implementation Note**: Po fazie 1 i przejściu automated verification – potwierdzenie manualne przed fazą 2.

---

## Phase 2: API i testy automatyczne

### Overview

Trasa `/api/events/[id]/attendance` + testy unit i integracja RLS.

### Changes Required:

#### 1. API route

**File**: `src/pages/api/events/[id]/attendance.ts`

**Intent**: Publiczny odczyt liczników; mutacje tylko dla zalogowanych na nadchodzących eventach.

**Contract**:

- `export const prerender = false`
- Zod UUID na `params.id`
- `GET` → `getAttendanceSummary` (user opcjonalny z `context.locals.user`)
- `PUT` → `requireAuth`, body Zod, `getPublishedEventById` + `isUpcomingEvent`, `setAttendanceStatus`
- `DELETE` → `requireAuth`, te same guardy eligibility, `clearAttendance`
- Odpowiedzi przez `jsonResponse`

#### 2. Testy unit API

**File**: `tests/unit/event-attendance-api.test.ts`

**Intent**: Pokrycie happy path i błędów – wzorzec `event-comments-api.test.ts`.

**Contract**: Mock serwisu + `as unknown as APIContext`; scenariusze: GET 200, PUT 401 bez usera, PUT 404 niepublished/przeszły, PUT 200, DELETE 200, DELETE 401.

#### 3. Testy integracji RLS

**File**: `tests/integration/event-attendance-rls.test.ts`

**Intent**: Weryfikacja polityk na żywej Supabase – wzorzec `event-comments-rls.test.ts`.

**Contract**: `describe.skipIf(!isSupabaseConfigured())`; fan INSERT/UPDATE/DELETE own; anon SELECT counts; deny na `pending` event; unique constraint user+event.

### Success Criteria:

#### Automated Verification:

- `npm test` – unit + integration (gdy Docker + `.env.test`)
- `npm run verify`

#### Manual Verification:

- `curl` lub DevTools: GET `/api/events/{id}/attendance` zwraca JSON z licznikami

**Implementation Note**: Po fazie 2 – manualne smoke API przed UI.

---

## Phase 3: UI – strona eventu, lista, Moje eventy, profil

### Overview

Podłączenie placeholderów do danych; nowy island RSVP; batch countów na liście odkrywania; rename copy.

### Changes Required:

#### 1. Island RSVP na stronie wydarzenia

**File**: `src/components/events/EventAttendanceSection.tsx` (nowy)

**Intent**: Przyciski «Idę» / «Interesuję się», liczniki, obsługa gościa i toggle.

**Contract**: Props: `eventId`, `isUpcoming`, `initialGoingCount`, `initialInterestedCount`, `initialUserStatus`, `isLoggedIn`, `redirectPath`. Fetch `PUT`/`DELETE` na `/api/events/${eventId}/attendance`. Stylowanie spójne z `shellBtnPrimary` / `shellBtnOutline`.

#### 2. Strona szczegółów

**File**: `src/pages/events/[id].astro`

**Intent**: SSR prefetch attendance + render sekcji po nagłówku (przed opisem).

**Contract**: Wywołanie `getAttendanceSummary`; przekazanie props do `EventAttendanceSection` z `client:load`; `isUpcoming={showSuggestionForm}` lub osobny boolean.

#### 3. Lista odkrywania – liczniki na kafelkach

**Files**: `src/pages/events.astro`, `src/components/discovery/EventDiscoveryCard.tsx`, `src/types.ts`

**Intent**: Zastąpić `GOING_COUNT_PLACEHOLDER` prawdziwym `goingCount` z batch query.

**Contract**: Po `listPublishedEvents` – `getGoingCountsByEventIds`; mapowanie na `events` z `goingCount`; kafelek czyta `event.goingCount ?? 0`.

#### 4. Usunięcie placeholdera

**File**: `src/lib/events/rsvp-placeholder.ts`

**Intent**: Plik niepotrzebny po podłączeniu danych.

**Contract**: Usunąć plik i importy; zaktualizować `tests/unit/event-discovery-card.test.tsx`.

#### 5. Moje eventy

**Files**: `src/pages/my-events/index.astro`, `src/components/fan/MyEventsPage.tsx`

**Intent**: SSR list «Idę» / «Interesuję się»; rename sekcji i anchorów.

**Contract**: Props `goingEvents`, `interestedEvents`; tytuł «Interesuję się»; `id="interesuje-sie"`; zaktualizować copy (linia 62 index.astro, empty states w `MyEventsPage`).

#### 6. Profil

**Files**: `src/pages/profile.astro`, ewentualnie `ProfileSection.tsx` (tylko jeśli potrzebny fetch cover URL)

**Intent**: Przekazać `goingEvents` z SSR (`listEventsForUserAttendance` + `enrichEventWithCoverUrl`).

**Contract**: Max 6 na profilu – bez zmian layoutu.

### Success Criteria:

#### Automated Verification:

- `npm run verify`
- `tests/unit/event-discovery-card.test.tsx` – asercja realnego `goingCount` z props

#### Manual Verification:

- Pełna ścieżka fan: oznacz «Idę» → Moje eventy → profil → lista z licznikiem
- Gość widzi liczniki bez przycisków akcji
- Przeszły published event: liczniki bez przycisków mutacji
- Anchor `#interesuje-sie` działa z profilu/linków

**Implementation Note**: Po fazie 3 – pełne manual QA UI przed legal.

---

## Phase 4: Dokumenty prawne i domknięcie

### Overview

Aktualizacja polityki prywatności o przetwarzanie RSVP; sync roadmap/issue.

### Changes Required:

#### 1. Polityka prywatności

**File**: `src/pages/privacy-policy.astro`

**Intent**: Nowy §2.9 – oznaczenia «Idę» / «Interesuję się» (co zbieramy, po co, podstawa prawna art. 6 ust. 1 pkt b RODO).

**Contract**: Sekcja po §2.8; bez ujawniania tożsamości innych użytkowników poza licznikami; informacja o usunięciu wierszy przy usunięciu konta (CASCADE).

#### 2. Data aktualizacji dokumentów

**File**: `src/lib/legal/paths.ts`

**Intent**: `LEGAL_UPDATED_AT` na datę wdrożenia S-19.

**Contract**: Jedna zmiana daty – regulamin bez nowego § (brak obowiązków UGC po stronie fanów poza własnym oznaczeniem).

#### 3. Roadmap / GitHub (przy implementacji)

**Intent**: Issue #39 → In Progress na start implementacji; PR `Refs #39`.

**Contract**: Zgodnie z AGENTS.md §Roadmap sync.

### Success Criteria:

#### Automated Verification:

- `npm run lint:all` – brak em dash w docs
- `npm run verify`

#### Manual Verification:

- Polityka §2.9 czytelna po polsku; data w stopce dokumentów prawnych zaktualizowana

---

## Testing Strategy

### Unit Tests:

- `event-attendance-api.test.ts` – wszystkie metody HTTP, 401/404/400
- `event-discovery-card.test.tsx` – `goingCount` z props eventu
- Opcjonalnie: test serwisu z mockowanym Supabase (jeśli wzorzec w repo)

### Integration Tests:

- `event-attendance-rls.test.ts` – SELECT anon, INSERT fan, UPDATE toggle, DELETE, deny pending event

### Manual Testing Steps:

1. Jako gość – otwórz nadchodzący event – liczniki 0/0, link do logowania.
2. Zaloguj – «Idę» – licznik Idzie = 1, przycisk aktywny.
3. «Interesuję się» – Idzie = 0, Interesuję się = 1.
4. Ponowne «Interesuję się» – oba 0, brak wiersza w Moje eventy.
5. Oznacz «Idę» – sprawdź `/my-events#ide` i `/profile`.
6. Lista `/events` – kafelek pokazuje ten sam licznik Idzie.
7. Archiwalny event (jeśli dostępny) – liczniki read-only.

## Performance Considerations

- Jedno zapytanie batch dla countów na liście (typowo <50 eventów MVP).
- Indeksy `(event_id, status)` i `(user_id, status)` na tabeli attendance.
- Brak paginacji RSVP w MVP – listy Moje eventy ograniczone do nadchodzących (naturalny limit).

## Migration Notes

- Greenfield tabela – brak migracji danych historycznych.
- Deploy: `supabase db push` na produkcję **przed** kodem z API/UI (jak S-16 FK note).
- Rollback: usunięcie trasy API + revert UI; tabela może zostać (harmless) lub migracja DROP w razie potrzeby.

## References

- Research: `context/changes/event-attendance/research.md`
- Wzorzec API: `src/pages/api/events/[id]/comments.ts`
- Wzorzec serwisu: `src/lib/services/event-comments.ts`
- Wzorzec planu: `context/archive/2026-06-19-event-comments/plan.md`
- Shaping: `context/foundation/partia-iii-shaping.md`
- Roadmap S-19: `context/foundation/roadmap.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` – <commit sha>` when a step lands.

### Phase 1: Schema, typy i serwis

#### Automated

- [x] 1.1 Migracja `event_attendance` stosuje się lokalnie (`npx supabase db reset`) – 0438d4e
- [x] 1.2 `npm run check` przechodzi – 0438d4e
- [x] 1.3 `npm run lint` przechodzi – 0438d4e

#### Manual

- [x] 1.4 Tabela i polityki RLS widoczne w Supabase Studio – 0438d4e

### Phase 2: API i testy automatyczne

#### Automated

- [x] 2.1 `npm test` – unit `event-attendance-api.test.ts` – c9df77a
- [x] 2.2 `npm test` – integration `event-attendance-rls.test.ts` (gdy Supabase lokalna) – c9df77a
- [x] 2.3 `npm run verify` – c9df77a

#### Manual

- [x] 2.4 GET `/api/events/{id}/attendance` zwraca poprawny JSON – c9df77a

### Phase 3: UI – strona eventu, lista, Moje eventy, profil

#### Automated

- [ ] 3.1 `npm run verify`
- [ ] 3.2 `event-discovery-card.test.tsx` zaktualizowany

#### Manual

- [ ] 3.3 Pełna ścieżka fan: RSVP → Moje eventy → profil → licznik na liście
- [ ] 3.4 Gość i archiwalny event – zachowanie zgodne z planem
- [ ] 3.5 Anchor `#interesuje-sie` i copy «Interesuję się»

### Phase 4: Dokumenty prawne i domknięcie

#### Automated

- [ ] 4.1 `npm run lint:all`
- [ ] 4.2 `npm run verify`

#### Manual

- [ ] 4.3 Polityka §2.9 i `LEGAL_UPDATED_AT` poprawne

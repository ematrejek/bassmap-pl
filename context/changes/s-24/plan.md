# Moja ekipa (pełna funkcja) Implementation Plan

## Overview

S-24 dodaje pełną funkcję „Moja ekipa” na istniejącej stronie `/team`. Fan może utworzyć jedną własną ekipę, zarządzać członkami, przyjmować lub odrzucać prośby o dołączenie, a rekrutacja działa także przez forum z edytowalnym szablonem wątku.

Plan rozbudowuje istniejący panel znajomych z S-23, zamiast go zastępować. Kontakt po akceptacji to login i uzupełnione linki social z profilu, bez e-maila konta.

## Current State Analysis

`/team` jest obecnie działającą stroną „Znajomi i ekipa”, ale renderuje tylko `FriendsDashboard`. Forum ma kategorie ekipowe `szukam_ekipy` i `jestesmy_ekipa`, ale nie ma szablonu wątku ani powiązania z ekipą. Backend ma dobry wzorzec w S-23: zaproszenia do znajomych używają tabeli statusowej, RLS, atomowych funkcji SQL i powiadomień.

Nie istnieją jeszcze tabele ekip, członków, próśb o dołączenie, serwisy `crews`, API ekip ani UI ekip. Powiadomienia mają zamknięty CHECK typów i trzeba go rozszerzyć o typy ekipowe.

## Desired End State

Po wdrożeniu S-24 zalogowany fan widzi na `/team` dwie zakładki: „Znajomi” i „Moja ekipa”. Zakładka znajomych zachowuje istniejące zachowanie S-23, a zakładka ekipy pozwala utworzyć jedną ekipę, edytować ją, usunąć, zarządzać członkami i obsłużyć prośby kandydatów.

Zalogowani użytkownicy mogą zobaczyć podstawowy profil ekipy, ale lista członków jest widoczna tylko członkom tej ekipy. Kandydat może wysłać prośbę z widoku ekipy lub z wątku forum powiązanego z ekipą. Właściciel akceptuje lub odrzuca prośbę. Odrzucenie jest ciche, a akceptacja dodaje członka i pokazuje obu stronom kontakt: login oraz uzupełnione linki social.

### Key Discoveries:

- `src/pages/team.astro:10-15` renderuje `FriendsDashboard` na stronie `/team`; S-24 musi go zachować.
- `src/components/hooks/useFriends.ts:19-183` zawiera gotowy wzorzec hooka dla ładowania, mutacji i `pendingAction`.
- `src/lib/forum/thread-schema.ts:6-35` ma już kategorie `szukam_ekipy` i `jestesmy_ekipa`.
- `supabase/migrations/20260625100000_friends_recommendations_notifications.sql:278-301` pokazuje wzorzec RLS dla requestów.
- `supabase/migrations/20260625130000_atomic_friend_and_recommendation_writes.sql` pokazuje wzorzec atomowych RPC z powiadomieniami.
- `context/changes/s-24/change.md:12` rozstrzyga kontakt: login + social linki, bez e-maila.

## What We're NOT Doing

- Nie dodajemy e-maila do kontaktów ekipowych.
- Nie dodajemy wielu własnych ekip na jednego użytkownika w MVP.
- Nie dodajemy ról adminów ekipy. Są tylko właściciel i członek.
- Nie dodajemy publicznych stron ekip dla niezalogowanych.
- Nie przebudowujemy funkcji znajomych ani polecania eventów.
- Nie dodajemy osobnego systemu tabel szablonów forum. Szablon to prefill formularza.
- Nie dodajemy płatnego promowania ekip ani funkcji organizatorów.

## Implementation Approach

Najpierw powstaje bezpieczny fundament danych: `crews`, `crew_members`, `crew_join_requests`, rozszerzone `notifications` i opcjonalne `crew_id` na `forum_threads`. Potem serwisy i API kopiują wzorzec S-23: walidacja Zod, serwis `{ data } | { error }`, RPC dla operacji złożonych, mapowanie błędów na statusy HTTP.

UI powstaje jako nowy moduł obok znajomych: `TeamDashboard` opakowuje istniejący `FriendsDashboard` i nowy `CrewDashboard`. Integracja forum jest osobną fazą, żeby najpierw mieć gotowe ekipy i prośby. Na końcu plan domyka usuwanie konta, legal sync i testy pełnego przepływu.

## Critical Implementation Details

### Access Model

Ekipy są widoczne tylko dla zalogowanych użytkowników. Lista członków i dane kontaktowe są węższe: członków widzą tylko członkowie tej ekipy, a kontakt pojawia się dopiero po zaakceptowaniu prośby. Nie polegaj wyłącznie na RLS dla kształtu odpowiedzi API – serwis ma jawnie zwracać tylko pola dozwolone dla danego widza.

### Request Lifecycle

`declined` ma zachowywać się jak w znajomych: odrzucenie usuwa prośbę, nie wysyła powiadomienia i pozwala kandydatowi spróbować ponownie później. Akceptacja tworzy członkostwo, aktualizuje prośbę albo ją domyka w tej samej transakcji i wysyła powiadomienie.

### UI Islands

Nowe Reactowe dashboardy, dialogi i formularze montuj przez `client:only="react"`, zgodnie z lekcją Radix UI. Nie używaj `client:load` dla ciężkich islandów.

## Phase 1: Database Schema And Domain Types

### Overview

Ta faza tworzy model ekip i rozszerza istniejące tabele pod rekrutację oraz powiadomienia. Po tej fazie baza potrafi przechować ekipy, członków, prośby i link wątku forum do ekipy, ale UI i API mogą jeszcze nie istnieć.

### Changes Required:

#### 1. Crew teams migration

**File**: `supabase/migrations/YYYYMMDDHHmmss_crew_teams.sql`

**Intent**: Dodać tabele ekip, członków i próśb o dołączenie z RLS. Model ma wspierać jedną własną ekipę na użytkownika, role `owner` i `member`, oraz bezpieczny cykl `pending` → `accepted` albo ciche odrzucenie.

**Contract**: Migracja dodaje:

- `crews`: `id`, `owner_id`, `name`, `city`, `subgenres`, `description`, `created_at`, `updated_at`.
- `crew_members`: `crew_id`, `user_id`, `role`, `joined_at`; role tylko `owner` i `member`.
- `crew_join_requests`: `id`, `crew_id`, `requester_id`, `status`, `created_at`, `updated_at`; unikalność aktywnej prośby per `(crew_id, requester_id)`.
- CHECK długości: nazwa, miasto, opis, maksymalna liczba podgatunków zgodna z lokalnym stylem.
- Jeden owner może mieć tylko jedną ekipę.
- Owner jest automatycznie członkiem swojej ekipy.
- RLS: zalogowani widzą podstawowe ekipy; członkostwa widzą członkowie tej ekipy; prośby widzi kandydat i owner.

#### 2. Crew request RPC and notification types

**File**: `supabase/migrations/YYYYMMDDHHmmss_crew_team_requests.sql`

**Intent**: Dodać funkcje SQL do atomowego tworzenia prośby i odpowiedzi ownera. Dzięki temu zapis prośby, członkostwa i powiadomienia nie rozjadą się między sobą.

**Contract**: Migracja dodaje lub aktualizuje:

- typy powiadomień `crew_join_request` i `crew_join_accepted`;
- opcjonalne `crew_join_request_id` w `notifications`;
- RPC `create_crew_join_request_with_notification(...)`;
- RPC `respond_crew_join_request_with_notification(...)`;
- logikę `decline = delete + no notification`;
- logikę `accept = create member + accepted notification`.

#### 3. Forum thread crew link

**File**: `supabase/migrations/YYYYMMDDHHmmss_forum_threads_crew_link.sql`

**Intent**: Powiązać rekrutacyjny wątek forum z konkretną ekipą bez migracji istniejących wątków.

**Contract**: Migracja dodaje nullable `crew_id uuid references crews(id) on delete set null` do `forum_threads` oraz indeks po `crew_id`. Stare wątki bez ekipy nadal działają.

#### 4. Shared TypeScript types

**File**: `src/types.ts`

**Intent**: Dodać typy wierszy bazy i DTO dla ekip, członków, próśb i powiadomień ekipowych.

**Contract**: Nowe typy obejmują co najmniej `CrewRow`, `Crew`, `CrewMemberRow`, `CrewMember`, `CrewJoinRequestRow`, `CrewJoinRequest`, `CrewContact`, `CrewOverview` i rozszerzenie typu powiadomień o warianty ekipowe.

### Success Criteria:

#### Automated Verification:

- Migracje Supabase stosują się lokalnie bez błędów.
- `npm run check` przechodzi po aktualizacji typów.
- Test integracyjny RLS potwierdza podstawowe reguły widoczności ekip, członków i próśb.

#### Manual Verification:

- W lokalnej bazie można utworzyć ekipę i ownera jako członka.
- Stare wątki forum bez `crew_id` nadal są czytelne.
- Powiadomienia istniejących typów nadal działają.

**Implementation Note**: Po tej fazie zatrzymaj się na ręczne potwierdzenie migracji i braku regresji powiadomień przed przejściem dalej.

---

## Phase 2: Services And Fan API

### Overview

Ta faza dodaje backend aplikacyjny: walidację wejścia, serwis ekip i endpointy API. Po niej funkcję da się obsłużyć przez API, nawet jeśli UI nie jest jeszcze gotowe.

### Changes Required:

#### 1. Crew schemas

**File**: `src/lib/fan/crew-schema.ts`

**Intent**: Walidować dane wejściowe dla tworzenia/edycji ekipy, tworzenia prośby i odpowiedzi ownera.

**Contract**: Schema obejmuje:

- `createCrewSchema`;
- `updateCrewSchema`;
- `createCrewJoinRequestSchema`;
- `respondCrewJoinRequestSchema` z `status: "accepted" | "declined"`;
- walidację URL-i kontaktowych tylko po stronie profilu, nie w requestach ekip.

#### 2. Crew service

**File**: `src/lib/services/crews.ts`

**Intent**: Skupić całą logikę ekip w jednej warstwie usługowej, tak jak `friends.ts` robi to dla znajomych.

**Contract**: Serwis eksportuje funkcje:

- `getCrewOverview(userId)`;
- `createCrew(userId, input)`;
- `updateCrew(userId, crewId, input)`;
- `deleteCrew(userId, crewId)`;
- `listJoinableCrews(userId)` albo `getCrewByIdForViewer(userId, crewId)`;
- `createCrewJoinRequest(userId, crewId)`;
- `respondCrewJoinRequest(userId, requestId, status)`;
- `leaveCrew(userId, crewId)`;
- `removeCrewMember(ownerId, crewId, memberUserId)`;
- `getCrewContactForAcceptedPair(userId, crewId, targetUserId)`.

Serwis zwraca `{ data } | { error }`, używa polskich komunikatów błędów i mapuje błędy SQL/RPC na stałe błędów.

#### 3. Fan crew API routes

**Files**:

- `src/pages/api/fan/crews/index.ts`
- `src/pages/api/fan/crews/[id].ts`
- `src/pages/api/fan/crews/[id]/requests.ts`
- `src/pages/api/fan/crews/requests/[id].ts`
- `src/pages/api/fan/crews/[id]/members/[userId].ts`
- `src/pages/api/fan/crews/[id]/leave.ts`

**Intent**: Udostępnić frontendowi komplet bezpiecznych operacji ekipowych.

**Contract**: Każda trasa eksportuje `prerender = false`, używa `requireAuth`, `createClient`, walidacji Zod i `jsonResponse`. Endpointy nie zwracają e-maila. Kontakt zwracany jest tylko po akceptacji i tylko jako login + niepuste linki social.

#### 4. Notification service compatibility

**File**: `src/lib/services/notifications.ts`

**Intent**: Upewnić się, że nowe typy powiadomień ekipowych są poprawnie listowane i oznaczane jako przeczytane.

**Contract**: `listNotifications` i DTO obsługują `crew_join_request` oraz `crew_join_accepted`, bez zmiany działania istniejących typów S-23.

### Success Criteria:

#### Automated Verification:

- `tests/unit/crews-api.test.ts` pokrywa auth, walidację, tworzenie/edycję/usuwanie ekipy, prośby i odpowiedzi.
- `tests/unit/crews-notifications-service.test.ts` potwierdza treści i typy powiadomień.
- `tests/integration/crew-teams-rls.test.ts` potwierdza brak spoofingu i owner-only accept.
- `npm run check` i `npm run lint` przechodzą.

#### Manual Verification:

- Przez API można utworzyć ekipę, wysłać prośbę, zaakceptować ją i zobaczyć kontakt.
- Odrzucenie prośby nie tworzy powiadomienia.
- Kandydat może ponowić prośbę po odrzuceniu.

**Implementation Note**: Po tej fazie zatrzymaj się na ręczne sprawdzenie przepływu API, zanim UI zacznie zależeć od kontraktów.

---

## Phase 3: Team Page UI

### Overview

Ta faza rozbudowuje `/team` o zakładki i nowy dashboard ekipy, zachowując istniejący panel znajomych. Po niej użytkownik obsłuży większość funkcji ekip bez forum.

### Changes Required:

#### 1. Team dashboard shell

**Files**:

- `src/pages/team.astro`
- `src/components/fan/TeamDashboard.tsx`

**Intent**: Zastąpić bezpośrednie renderowanie `FriendsDashboard` kontenerem, który pokazuje zakładki „Znajomi” i „Moja ekipa”.

**Contract**: `FriendsDashboard` zostaje bez zmian jako zawartość zakładki „Znajomi”. `TeamDashboard` montowany jest przez `client:only="react"` i zarządza tylko lokalnym stanem aktywnej zakładki.

#### 2. Crew hook

**File**: `src/components/hooks/useCrews.ts`

**Intent**: Dodać hook analogiczny do `useFriends`, który ładuje overview ekipy i obsługuje mutacje z `pendingAction`.

**Contract**: Hook obsługuje stan `isLoading`, `error`, `overview`, `pendingAction`, `refresh`, `createCrew`, `updateCrew`, `deleteCrew`, `requestJoin`, `respondRequest`, `leaveCrew`, `removeMember`.

#### 3. Crew dashboard components

**Files**:

- `src/components/fan/CrewDashboard.tsx`
- `src/components/fan/CrewForm.tsx`
- `src/components/fan/CrewMembersList.tsx`
- `src/components/fan/CrewRequestsList.tsx`
- `src/components/fan/CrewContactCard.tsx`

**Intent**: Udostępnić UI dla tworzenia ekipy, edycji, członków, próśb i kontaktu.

**Contract**:

- Użytkownik bez własnej ekipy widzi formularz tworzenia.
- Owner widzi edycję, listę członków, prośby, usuwanie członków i usunięcie ekipy.
- Członek widzi listę członków, kontakt i opcję opuszczenia.
- Lista członków nie jest widoczna dla zalogowanych nie-członków.
- Usunięcie ekipy przez ownera usuwa członków i prośby zgodnie z migracją/API.

#### 4. UI copy and empty states

**Files**:

- `src/components/fan/CrewDashboard.tsx`
- `src/components/fan/FriendsDashboard.tsx` only if needed for shared empty state extraction

**Intent**: Dodać proste polskie komunikaty dla pustych stanów, błędów i sukcesów bez przebudowy istniejącego panelu znajomych.

**Contract**: Copy używa en dash, nie em dash. Komunikaty techniczne tłumaczą prosto: „Nie udało się wysłać prośby” zamiast surowego błędu SQL.

### Success Criteria:

#### Automated Verification:

- `npm run check` przechodzi dla nowych komponentów i hooka.
- `npm run lint` przechodzi bez błędów React hooks.
- Test jednostkowy hooka lub API mocków pokrywa podstawowe mutacje UI, jeśli istniejący setup Vitest to wspiera bez dużego narzutu.

#### Manual Verification:

- `/team` pokazuje zakładki „Znajomi” i „Moja ekipa”.
- Zakładka „Znajomi” działa jak przed S-24.
- Fan tworzy ekipę, edytuje ją, widzi własną rolę ownera i usuwa ekipę.
- Owner akceptuje prośbę i widzi nowego członka.
- Członek może opuścić ekipę.

**Implementation Note**: Po tej fazie zatrzymaj się na ręczne sprawdzenie `/team`, bo to pierwsza faza z istotnym UI.

---

## Phase 4: Forum Recruitment Integration

### Overview

Ta faza łączy ekipy z forum. Owner może stworzyć wątek rekrutacyjny z edytowalnym szablonem i wyborem ekipy, a kandydat może wysłać prośbę z wątku.

### Changes Required:

#### 1. Forum schemas and services

**Files**:

- `src/lib/forum/thread-schema.ts`
- `src/lib/services/forum-threads.ts`
- `src/types.ts`

**Intent**: Rozszerzyć tworzenie wątku o opcjonalne `crewId`, bez psucia zwykłych wątków forum.

**Contract**: `crewId` jest dozwolone tylko dla kategorii ekipowych. Serwis zapisuje `crew_id` tylko wtedy, gdy użytkownik jest ownerem tej ekipy. Odczyt wątku może zwrócić podstawowe dane ekipy dla zalogowanych.

#### 2. Forum API

**Files**:

- `src/pages/api/forum/threads/index.ts`
- `src/pages/api/forum/threads/[id]/...` if detail endpoint needs crew context

**Intent**: Przyjąć `crewId` przy tworzeniu wątku i walidować własność ekipy.

**Contract**: API odrzuca `crewId`, jeśli użytkownik nie jest ownerem wskazanej ekipy. Istniejące tworzenie zwykłych wątków działa bez zmian.

#### 3. Forum create form template

**File**: `src/components/forum/ForumCreateThreadForm.tsx`

**Intent**: Dodać edytowalny prefill „Szukam ludzi do ekipy” oraz selektor własnej ekipy.

**Contract**:

- Gdy owner wybierze kategorię `szukam_ekipy` albo `jestesmy_ekipa`, formularz pokazuje wybór ekipy.
- Treść startowa jest wypełniana szablonem, ale użytkownik może ją edytować.
- Bez własnej ekipy formularz pokazuje prostą informację z linkiem do `/team`.

#### 4. Thread detail join action

**Files**:

- `src/pages/forum/[id].astro`
- `src/components/forum/ThreadCrewJoinPanel.tsx`

**Intent**: Pokazać przy powiązanym wątku forum panel ekipy i przycisk „Poproś o dołączenie”.

**Contract**: Panel widzi tylko zalogowany użytkownik. Owner i obecni członkowie nie widzą przycisku składania prośby. Kandydat z pending request widzi status oczekiwania.

### Success Criteria:

#### Automated Verification:

- Test API forum potwierdza, że `crewId` można dodać tylko do własnej ekipy.
- Test API potwierdza, że zwykłe wątki bez `crewId` nadal działają.
- `npm run check` i `npm run lint` przechodzą.

#### Manual Verification:

- Owner tworzy wątek rekrutacyjny z prefill’em i edytuje treść.
- Wątek pokazuje powiązaną ekipę.
- Kandydat wysyła prośbę z wątku.
- Prośba pojawia się ownerowi na `/team`.

**Implementation Note**: Po tej fazie zatrzymaj się na ręczne potwierdzenie pełnej ścieżki forum → prośba → akceptacja.

---

## Phase 5: Account Deletion, Legal Sync, And Full Verification

### Overview

Ta faza domyka zachowanie przy usunięciu konta, dokumenty prawne i pełne testy. Po niej S-24 jest gotowe do archiwizacji i PR.

### Changes Required:

#### 1. Account deletion handling

**Files**:

- `src/lib/services/account-deletion.ts`
- `tests/unit/account-deletion-service.test.ts`

**Intent**: Upewnić się, że usunięcie konta nie zostawia martwych referencji ani prywatnych danych w ekipach.

**Contract**: Planowana polityka MVP:

- Jeśli owner usuwa konto, jego ekipy są usuwane razem z członkami, prośbami i linkami z forum ustawionymi na `null`.
- Jeśli członek usuwa konto, członkostwo i prośby są usuwane.
- Forum nadal zachowuje własną anonimizację autora wątków i komentarzy.

#### 2. Legal pages

**Files**:

- `src/pages/privacy-policy.astro`
- `src/pages/terms.astro`
- `src/lib/legal/paths.ts`

**Intent**: Zaktualizować dokumenty prawne, bo S-24 dodaje treści użytkowników i kontrolowane udostępnianie kontaktu.

**Contract**: Dokumenty mówią prostym językiem, że w ekipach mogą być przetwarzane nazwa/opis ekipy, członkostwo, prośby o dołączenie, login i linki social z profilu po akceptacji. `LEGAL_UPDATED_AT` dostaje datę wdrożenia.

#### 3. Full test coverage

**Files**:

- `tests/e2e/crew-teams.spec.ts`
- `tests/unit/crews-api.test.ts`
- `tests/unit/crews-notifications-service.test.ts`
- `tests/integration/crew-teams-rls.test.ts`

**Intent**: Pokryć najważniejsze ścieżki automatycznie.

**Contract**: E2E obejmuje utworzenie ekipy, wysłanie prośby przez drugiego użytkownika, akceptację, kontakt i panel forum, jeśli fixture pozwala. Unit/integration pokrywają reguły dostępu i błędy.

#### 4. Roadmap and GitHub sync

**Files**:

- `context/foundation/roadmap.md`
- GitHub issue `#44`

**Intent**: Utrzymać roadmapę, issue i board w sync zgodnie z regułami repo.

**Contract**: Podczas implementacji issue `#44` jest w In Progress. Przy archiwizacji status S-24 zmienia się na `done`, issue zostaje zamknięte, a board trafia do Done.

### Success Criteria:

#### Automated Verification:

- `npm run verify` przechodzi.
- `npm run build` przechodzi.
- `npm run test:e2e` przechodzi po zmianach UI.
- `npm run verify:full` przechodzi, jeśli środowisko lokalne pozwala.

#### Manual Verification:

- Nowy użytkownik tworzy ekipę.
- Drugi użytkownik prosi o dołączenie z `/team`.
- Owner akceptuje i obie strony widzą kontakt bez e-maila.
- Owner tworzy wątek rekrutacyjny na forum.
- Drugi użytkownik prosi o dołączenie z forum.
- Odrzucenie jest ciche i pozwala ponowić prośbę.
- Usunięcie ekipy przez ownera usuwa ekipę, członków i prośby.
- Zakładka znajomych na `/team` nadal działa.

**Implementation Note**: Po tej fazie można przejść do `/10x-archive s-24`, ale tylko po ręcznym potwierdzeniu legal sync i pełnego smoke testu.

---

## Testing Strategy

### Unit Tests:

- API ekip: auth required, walidacja wejścia, tworzenie jednej własnej ekipy, edycja, usuwanie.
- API próśb: kandydat wysyła, owner akceptuje/odrzuca, nie-owner dostaje 403.
- Powiadomienia: request do ownera, accepted do kandydata, brak powiadomienia przy decline.
- Kontakt: login + social linki tylko po akceptacji, bez e-maila.
- Account deletion: owner deletion, member deletion, pending request cleanup.

### Integration Tests:

- RLS dla `crews`, `crew_members`, `crew_join_requests`.
- RPC `create_crew_join_request_with_notification`.
- RPC `respond_crew_join_request_with_notification`.
- Forum `crew_id`: owner może powiązać własną ekipę, nie-owner nie może.

### Manual Testing Steps:

1. Zaloguj użytkownika A i utwórz ekipę.
2. Sprawdź, że A nie może utworzyć drugiej własnej ekipy.
3. Zaloguj użytkownika B i zobacz podstawowy opis ekipy jako zalogowany.
4. Sprawdź, że B nie widzi listy członków przed akceptacją.
5. Wyślij prośbę B → ekipa A.
6. Jako A zaakceptuj prośbę.
7. Sprawdź, że A i B widzą kontakt: login + linki social, bez e-maila.
8. Jako B opuść ekipę.
9. Jako A usuń ekipę.
10. Utwórz nową ekipę i wątek forum z szablonem.
11. Jako B wyślij prośbę z wątku forum.
12. Odrzuć prośbę i sprawdź, że nie ma powiadomienia o odrzuceniu.
13. Sprawdź, że zakładka znajomych nadal działa.

## Performance Considerations

MVP może korzystać z prostych list i limitów podobnych do forum/znajomych. Nie pobieraj wszystkich rekordów bez potrzeby: overview `/team` powinien pobierać tylko ekipę użytkownika, członków własnej ekipy, własne prośby i ewentualne prośby do własnej ekipy. Przy większej skali można dodać paginację członków i prośb.

## Migration Notes

- Dodanie nullable `crew_id` do `forum_threads` jest kompatybilne wstecz.
- Rozszerzenie CHECK `notifications.type` musi zachować istniejące typy S-23.
- Funkcje RPC używają `CREATE OR REPLACE FUNCTION`, więc rollback musi odtworzyć poprzednią wersję funkcji, jeśli migracja zostanie wycofana.
- Usunięcie ekipy przez ownera usuwa zależne członkostwa i prośby; wątki forum dostają `crew_id = null`.

## References

- Research: `context/changes/s-24/research.md`
- Decision note: `context/changes/s-24/change.md`
- Roadmap: `context/foundation/roadmap.md`
- Friends request pattern: `src/lib/services/friends.ts`
- Friends hook pattern: `src/components/hooks/useFriends.ts`
- Forum schema pattern: `src/lib/forum/thread-schema.ts`
- Forum service pattern: `src/lib/services/forum-threads.ts`
- Notifications migration: `supabase/migrations/20260625100000_friends_recommendations_notifications.sql`
- Atomic RPC migration: `supabase/migrations/20260625130000_atomic_friend_and_recommendation_writes.sql`
- Decline delete migration: `supabase/migrations/20260625140000_friend_request_decline_delete.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` – <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database Schema And Domain Types

#### Automated

- [x] 1.1 Migracje Supabase stosują się lokalnie bez błędów.
- [x] 1.2 `npm run check` przechodzi po aktualizacji typów.
- [x] 1.3 Test integracyjny RLS potwierdza podstawowe reguły widoczności ekip, członków i próśb.

#### Manual

- [x] 1.4 W lokalnej bazie można utworzyć ekipę i ownera jako członka.
- [x] 1.5 Stare wątki forum bez `crew_id` nadal są czytelne.
- [x] 1.6 Powiadomienia istniejących typów nadal działają.

### Phase 2: Services And Fan API

#### Automated

- [ ] 2.1 `tests/unit/crews-api.test.ts` pokrywa auth, walidację, tworzenie/edycję/usuwanie ekipy, prośby i odpowiedzi.
- [ ] 2.2 `tests/unit/crews-notifications-service.test.ts` potwierdza treści i typy powiadomień.
- [ ] 2.3 `tests/integration/crew-teams-rls.test.ts` potwierdza brak spoofingu i owner-only accept.
- [ ] 2.4 `npm run check` i `npm run lint` przechodzą.

#### Manual

- [ ] 2.5 Przez API można utworzyć ekipę, wysłać prośbę, zaakceptować ją i zobaczyć kontakt.
- [ ] 2.6 Odrzucenie prośby nie tworzy powiadomienia.
- [ ] 2.7 Kandydat może ponowić prośbę po odrzuceniu.

### Phase 3: Team Page UI

#### Automated

- [ ] 3.1 `npm run check` przechodzi dla nowych komponentów i hooka.
- [ ] 3.2 `npm run lint` przechodzi bez błędów React hooks.
- [ ] 3.3 Test jednostkowy hooka lub API mocków pokrywa podstawowe mutacje UI, jeśli istniejący setup Vitest to wspiera bez dużego narzutu.

#### Manual

- [ ] 3.4 `/team` pokazuje zakładki „Znajomi” i „Moja ekipa”.
- [ ] 3.5 Zakładka „Znajomi” działa jak przed S-24.
- [ ] 3.6 Fan tworzy ekipę, edytuje ją, widzi własną rolę ownera i usuwa ekipę.
- [ ] 3.7 Owner akceptuje prośbę i widzi nowego członka.
- [ ] 3.8 Członek może opuścić ekipę.

### Phase 4: Forum Recruitment Integration

#### Automated

- [ ] 4.1 Test API forum potwierdza, że `crewId` można dodać tylko do własnej ekipy.
- [ ] 4.2 Test API potwierdza, że zwykłe wątki bez `crewId` nadal działają.
- [ ] 4.3 `npm run check` i `npm run lint` przechodzą.

#### Manual

- [ ] 4.4 Owner tworzy wątek rekrutacyjny z prefill’em i edytuje treść.
- [ ] 4.5 Wątek pokazuje powiązaną ekipę.
- [ ] 4.6 Kandydat wysyła prośbę z wątku.
- [ ] 4.7 Prośba pojawia się ownerowi na `/team`.

### Phase 5: Account Deletion, Legal Sync, And Full Verification

#### Automated

- [ ] 5.1 `npm run verify` przechodzi.
- [ ] 5.2 `npm run build` przechodzi.
- [ ] 5.3 `npm run test:e2e` przechodzi po zmianach UI.
- [ ] 5.4 `npm run verify:full` przechodzi, jeśli środowisko lokalne pozwala.

#### Manual

- [ ] 5.5 Nowy użytkownik tworzy ekipę.
- [ ] 5.6 Drugi użytkownik prosi o dołączenie z `/team`.
- [ ] 5.7 Owner akceptuje i obie strony widzą kontakt bez e-maila.
- [ ] 5.8 Owner tworzy wątek rekrutacyjny na forum.
- [ ] 5.9 Drugi użytkownik prosi o dołączenie z forum.
- [ ] 5.10 Odrzucenie jest ciche i pozwala ponowić prośbę.
- [ ] 5.11 Usunięcie ekipy przez ownera usuwa ekipę, członków i prośby.
- [ ] 5.12 Zakładka znajomych na `/team` nadal działa.

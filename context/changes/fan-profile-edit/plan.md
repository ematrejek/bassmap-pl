# Edycja profilu fana (S-20) Implementation Plan

## Overview

Slice roadmapy **S-20** (`change-id`: **`fan-profile-edit`**). Zalogowany fan edytuje **login publiczny**, **bio**, **miasto**, **ulubione podgatunki** (max 5 z katalogu) i **linki social** (Instagram, SoundCloud, Facebook, Spotify, Twitch) w **trybie edycji inline** na `/profile` (wzorzec `bassmap-pl-ui`). Własny profil pokazuje też **e-mail** (tylko dla właściciela). **Publiczny** profil dowolnego fana dostępny pod `/u/@login` – widoczny login i pola profilowe, **bez e-maila**.

**Issue:** [#40](https://github.com/ematrejek/bassmap-pl/issues/40). **PRD:** FR-017 (strefa konta), propozycja **FR-027**.

## Current State Analysis

S-12 (`fan-account-zone`) dostarczył `/profile` + `ProfileSection` z placeholderami (bio, miasto, podgatunki, social, wyłączony «Edytuj profil»). Login i nagłówek pochodzą z heurystyki e-maila (`loginFromEmailLocalPart`, `authorLabelFromEmail`). S-19 podłączył sekcję «Idę» z SSR (`listEventsForUserAttendance`). **Brak** tabeli profilu, API i trasy publicznej.

### Key Discoveries:

- Placeholdery social w produkcji: Instagram, **YouTube**, **Twitch** – roadmapa S-20 + decyzja planu: **SoundCloud, Facebook, Spotify, Twitch** (bez YouTube); układ kart social jak w `bassmap-pl-ui`.
- **Design reference (lokalny, gitignored):** `bassmap-pl-ui/components/profile-section.tsx` + `profile-editor.tsx` + `lib/profile.ts` – edycja **inline** (`editing` state), nie dialog; siatka `lg:grid-cols-3` (karta tożsamości + panel podgatunków/social); formularz w sekcjach `Fieldset`; podgatunki jako toggle chips; social jako klikalne linki tylko gdy wypełnione.
- Katalog podgatunków: `Subgenre` enum + `SUBGENRES` / `SUBGENRE_LABELS` w `src/types.ts` (26 wartości); w UI mocku jest uproszczona lista 12 – **w produkcji używamy pełnego katalogu** z kolorami mapowanymi na `GenreBadge`.
- Wzorzec fan API: `requireAuth`, blokada admina, zod, `jsonResponse` – `src/pages/api/fan/change-suggestions/index.ts`, `src/pages/api/fan/account/delete.ts`.
- Wzorzec tabeli per-user + RLS: `event_attendance` (`user_id` FK CASCADE, SELECT publiczny, mutacje tylko własne).
- Polityka §2.1 zapowiada dobrowolny profil – wymaga rozwinięcia przy archive S-20 (`AGENTS.md` legal sync).
- `/profile` w `PROTECTED_ROUTES` (`middleware.ts`); `/u/*` pozostaje publiczne (bez dopisywania do protected).
- Usuwanie konta (S-16): `ON DELETE CASCADE` na `user_id` wystarczy – profil znika z kontem; bez anonimizacji loginu na publicznych śladach w MVP.

## Desired End State

1. `/profile` (zalogowany fan, nie admin): sekcja profilu w układzie jak **bassmap-pl-ui** – karta tożsamości (lewa kolumna) + podgatunki i social (prawa); przycisk «Edytuj profil» przełącza **tryb edycji inline** (cała sekcja pod nagłówkiem zamienia się w formularz).
2. Tryb edycji: formularz `ProfileEditor` – sekcje `Fieldset` (Dane podstawowe: login + miasto; Krótki opis; Ulubione podgatunki; Social media); przyciski Anuluj / Zapisz na dole; `PATCH /api/fan/profile`.
3. `/u/@login` (gość lub zalogowany): ten sam **widok** co tryb podglądu (bez przycisku edycji, bez e-maila, bez «Moje eventy»); 404 gdy login nie istnieje.
4. Tabela `fan_profiles` + RLS; `GET`/`PATCH` `/api/fan/profile` dla właściciela.
5. Polityka prywatności §2.1 rozwinięta o pola profilu; `LEGAL_UPDATED_AT` zaktualizowany.

### Weryfikacja ręczna

- Fan: pierwsze wejście → ustawia login → zapis → dane widoczne na `/profile` i `/u/@login`.
- Fan: zmiana loginu (wolny) → stary URL `/u/stary` → 404; nowy URL działa.
- Fan: zajęty login → komunikat błędu w trybie edycji (pod formularzem).
- Gość: `/u/@login` bez e-maila; linki social otwierają się w nowej karcie.
- Admin: brak trybu edycji / brak fan profile API (403 jak inne endpointy fana).

## What We're NOT Doing

- Upload avatara / zdjęcia profilowego
- Pola **imię/nazwisko** i **status ekipy** z UI mocka (`bassmap-pl-ui`) – poza S-20 (decyzja produktowa: identyfikacja przez @login; status → S-22/S-24)
- Sekcja **«Ulubiony kawałek / set»** z UI mocka – tylko placeholder wizualny do S-21 (bez zapisu w S-20)
- Publiczne wyświetlanie e-maila
- Spotify embed utworu/playlisty (S-21)
- Przełącznik „profil prywatny”
- Lista znajomych, forum, ekipa (S-22–S-24)
- Pełna migracja `authorLabelFromEmail` / `submitter-profile` na login z profilu (opcjonalny follow-up)
- YouTube w social (zastąpione roadmapą + Twitch)

## Implementation Approach

Tabela `fan_profiles` 1:1 z `auth.users` (`user_id` PK, `login` UNIQUE). Lazy upsert przy pierwszym `GET` własnego profilu: jeśli brak wiersza, serwis proponuje login z `loginFromEmailLocalPart(email)` gdy wolny; inaczej `login` null do wymuszenia w trybie edycji.

```
GET   /api/fan/profile           → własny profil (auth, fan only)
PATCH /api/fan/profile           → aktualizacja pól (auth, fan only, zod body)
```

Publiczny odczyt: SSR na `src/pages/u/[login].astro` przez `getFanProfileByLogin(supabase, login)` – bez osobnego public API w MVP.

UI: port wzorca **`bassmap-pl-ui`** – `ProfileSection` (stan `editing` + widok) + `ProfileEditor` (formularz inline) + współdzielony `ProfileView` (układ siatki podglądu); fetch jak `DeleteAccountSection` (`PATCH` + `readApiError`).

### Rozjazdy względem `bassmap-pl-ui` (świadome)

| Element UI mock | S-20 w produkcji |
| --------------- | ---------------- |
| `firstName` / `lastName` w nagłówku | **Brak** – `h3` = `@login` (lub sam login bez duplikatu) |
| `status` («Szukam ekipy») | **Poza S-20** – forum/ekipa (S-22+) |
| `favouriteTrack` + embed iframe | **Placeholder** «wkrótce» – implementacja S-21 |
| Bio max **280** znaków | **200** znaków (decyzja planowania) |
| Social: 4 platformy | **5**: Instagram, Facebook, Spotify, SoundCloud + **Twitch** |
| Podgatunki: 12 etykiet mock | Pełny katalog **`SUBGENRE_LABELS`** (26) |
| Edycja: inline w sekcji | **Tak** – adoptujemy ten wzorzec (nie dialog shadcn) |

## Critical Implementation Details

**Login normalization:** Zapis w DB jako lowercase; walidacja regex `^[a-z0-9_]{3,30}$`; URL `/u/[login]` bez `@` w ścieżce (wyświetlanie z `@` w UI). Konflikt UNIQUE → API `409` z komunikatem po polsku.

**Podgatunki:** Kolumna `favorite_subgenres subgenre[]` lub `text[]` z CHECK – max 5 elementów, każdy z enum Postgres `subgenre` (jak `events.subgenres`).

**Social URL:** Walidacja zod – opcjonalne pola; dozwolone hosty per platforma (np. `instagram.com`, `soundcloud.com`, `facebook.com`, `open.spotify.com` dla profilu, `twitch.tv`). Puste stringi → `null`.

**Admin guard:** `PATCH /api/fan/profile` i tryb edycji – ten sam wzorzec `403` co `DeleteAccountSection` / fan submit.

**Tryb edycji UX:** `useState(editing)` w `ProfileSection` – jak `bassmap-pl-ui` L54–55. Gdy `editing === true`: nagłówek «Edytuj profil», podtytuł z instrukcją, render `ProfileEditor`; po `onSave` → `setEditing(false)` + aktualizacja lokalnego stanu profilu z odpowiedzi API. `onCancel` → przywrócenie draftu i `setEditing(false)`.

**Social linki (widok):** Helper `formatSocialHref(platform, value)` – jak `SOCIAL_HREF` w UI mock: akceptuje pełny URL lub handle (`@nick` → instagram.com); renderuj tylko niepuste pola w siatce `sm:grid-cols-2`.

**Sekcja «Idę»:** Bez zmian logiki S-19 – `profile.astro` nadal ładuje `goingEvents` osobno; tylko karta profilu czyta `fan_profiles`.

## Phase 1: Schema, typy i serwis

### Overview

Migracja `fan_profiles`, typy TS, zod schema, serwis `fan-profile.ts`.

### Changes Required:

#### 1. Migracja SQL

**File**: `supabase/migrations/YYYYMMDDHHmmss_fan_profiles.sql`

**Intent**: Tabela profilu fana z publicznym odczytem i zapisem tylko własnego wiersza.

**Contract**:

- `fan_profiles`: `user_id uuid PK REFERENCES auth.users(id) ON DELETE CASCADE`, `login text NOT NULL UNIQUE`, `bio text`, `city text`, `favorite_subgenres subgenre[] NOT NULL DEFAULT '{}'`, `instagram_url text`, `soundcloud_url text`, `facebook_url text`, `spotify_url text`, `twitch_url text`, `created_at timestamptz`, `updated_at timestamptz`.
- CHECK: `char_length(bio) <= 200`, `cardinality(favorite_subgenres) <= 5`, `login ~ '^[a-z0-9_]{3,30}$'`.
- Indeks UNIQUE na `lower(login)` jeśli potrzebny case-insensitive (login zawsze lowercase w app).
- RLS enabled; `SELECT` → `anon, authenticated`; `INSERT`/`UPDATE`/`DELETE` → `authenticated`, `user_id = auth.uid()`.

#### 2. Typy

**File**: `src/types.ts`

**Intent**: Typy domenowe profilu.

**Contract**: `FanProfileRow` (snake_case DB); `FanProfile` (camelCase DTO); `FanProfileUpdate` (pola edytowalne).

#### 3. Schema Zod

**File**: `src/lib/fan/profile-schema.ts`

**Intent**: Walidacja body `PATCH` i helpery URL social.

**Contract**: `login`, `bio`, `city`, `favoriteSubgenres` (max 5, enum), opcjonalne URL-e per platforma.

#### 4. Serwis

**File**: `src/lib/services/fan-profile.ts`

**Intent**: Warstwa danych – wzorzec `event-attendance.ts`.

**Contract**:

- `getFanProfileByUserId(supabase, userId)` → profil lub null.
- `getFanProfileByLogin(supabase, login)` → profil publiczny lub null.
- `ensureFanProfile(supabase, userId, suggestedLogin?)` → lazy insert z proponowanym loginem gdy wolny.
- `updateFanProfile(supabase, userId, patch)` → update; mapowanie błędu unique violation na czytelny komunikat.

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` (lokalnie) – migracja bez błędów
- `npm run check`
- `npm run lint`

#### Manual Verification:

- W Supabase Studio: tabela `fan_profiles` z politykami RLS

**Implementation Note**: Po fazie 1 i automated verification – potwierdzenie manualne przed fazą 2.

---

## Phase 2: API i testy automatyczne

### Overview

Trasa `/api/fan/profile` + testy unit i integracja RLS.

### Changes Required:

#### 1. API route

**File**: `src/pages/api/fan/profile.ts`

**Intent**: Odczyt i aktualizacja własnego profilu fana.

**Contract**:

- `export const prerender = false`
- `GET` → `requireAuth`, blokada admina, `ensureFanProfile` + `getFanProfileByUserId`, `jsonResponse`
- `PATCH` → `requireAuth`, blokada admina, zod body, `updateFanProfile`; `409` na zajęty login; `200` z zaktualizowanym profilem

#### 2. Testy unit API

**File**: `tests/unit/fan-profile-api.test.ts`

**Intent**: Happy path i błędy – wzorzec `event-attendance-api.test.ts`.

**Contract**: Mock serwisu + `as unknown as APIContext`; scenariusze: GET 200, GET 401, PATCH 200, PATCH 409 login zajęty, PATCH 400 zły login, PATCH 403 admin.

#### 3. Testy integracji RLS

**File**: `tests/integration/fan-profile-rls.test.ts`

**Intent**: RLS na żywej Supabase – wzorzec `event-attendance-rls.test.ts`.

**Contract**: `describe.skipIf(!isSupabaseConfigured())`; fan INSERT/UPDATE own; anon SELECT by login; deny UPDATE cudzego wiersza; UNIQUE login.

### Success Criteria:

#### Automated Verification:

- `npm test` – unit + integration (gdy Docker + `.env.test`)
- `npm run verify`

#### Manual Verification:

- DevTools: `GET`/`PATCH` `/api/fan/profile` zwraca poprawny JSON

**Implementation Note**: Po fazie 2 – smoke API przed UI.

---

## Phase 3: UI własnego profilu (`/profile`)

### Overview

Podłączenie danych do `ProfileSection`; **tryb edycji inline** po «Edytuj profil» (wzorzec `bassmap-pl-ui`); SSR na `profile.astro`. Sekcja «Moje eventy» / «Idę» pozostaje pod siatką profilu (już z S-19).

### Changes Required:

#### 1. Helper wyświetlania profilu

**File**: `src/lib/fan/profile-display.ts` (nowy)

**Intent**: Współdzielone metadane social i budowanie href (port logiki `SOCIAL_HREF` + `SOCIAL_META` z `bassmap-pl-ui/lib/profile.ts`).

**Contract**: Eksport `SOCIAL_PLATFORMS` (instagram, facebook, spotify, soundcloud, twitch), `formatSocialHref(platform, raw)`, `getSocialMeta(platform)` (label, ikona lucide); walidacja/normalizacja handle vs URL.

#### 2. Komponent widoku profilu (tryb podglądu)

**File**: `src/components/fan/ProfileView.tsx` (nowy)

**Intent**: Wydzielony layout podglądu – port widoku z `bassmap-pl-ui/components/profile-section.tsx` (L ~120–220): siatka `mt-10 grid gap-6 lg:grid-cols-3`.

**Contract**:
- **Lewa kolumna** (`lg:col-span-1`): karta `rounded-2xl border` – avatar placeholder (statyczny obrazek / inicjały – bez uploadu S-20), `h3` z `@login`, miasto, bio, opcjonalnie e-mail (tylko gdy `showEmail`), przycisk «Edytuj profil» (tylko gdy `onEdit`).
- **Prawa kolumna** (`lg:col-span-2`): panel «Ulubione podgatunki» z `GenreBadge` (puste → copy «Nie wybrano»); panel «Social media» – tylko wypełnione linki jako `<a target="_blank" rel="noopener noreferrer">`; slot **«Ulubiony kawałek / set»** – placeholder «wkrótce» (S-21), bez danych z API.
- Props: `profile: FanProfile`, `showEmail?: boolean`, `email?: string`, `onEdit?: () => void`.

#### 3. Formularz edycji inline

**File**: `src/components/fan/ProfileEditor.tsx` (nowy)

**Intent**: Port `bassmap-pl-ui/components/profile-editor.tsx` – formularz w sekcjach `Fieldset` (lokalny subkomponent w pliku lub `src/components/ui/fieldset.tsx` jeśli brak).

**Contract**:
- Sekcje formularza: **Dane podstawowe** (login z hintem `[a-z0-9_]`, miasto); **Krótki opis** (textarea, max 200, licznik znaków); **Ulubione podgatunki** (toggle chips z `SUBGENRE_LABELS`, max 5, `aria-pressed`, ikona Check); **Social media** (siatka inputów – Instagram, Facebook, Spotify, SoundCloud, Twitch).
- **Bez** pól: firstName, lastName, status ekipy, favouriteTrack (zgodnie z tabelą rozjazdów).
- Props: `initialProfile`, `onSave(profile)`, `onCancel()`, `isSaving`, `error?: string`.
- Walidacja klienta (mirror zod): login, bio length, max 5 subgenres; błędy API (409 login) w `error` prop.

#### 4. ProfileSection – orchestracja

**File**: `src/components/fan/ProfileSection.tsx`

**Intent**: Zastąpić placeholdery; dodać stan `editing` i przełączanie widok ↔ edytor jak w UI mock.

**Contract**:
- Props: `email`, `initialProfile: FanProfile`, `goingEvents` (S-19).
- Gdy `!editing`: nagłówek sekcji «Profil», podtytuł; `ProfileView` z `showEmail`, `onEdit={() => setEditing(true)}`; poniżej siatki – istniejąca sekcja «Idę» / «Moje eventy».
- Gdy `editing`: nagłówek «Edytuj profil»; `ProfileEditor` z `onSave` → `PATCH /api/fan/profile` + `readApiError`; sukces → aktualizacja stanu profilu + `setEditing(false)`; `onCancel` → `setEditing(false)`.
- Usunąć placeholdery YouTube; social zgodne z roadmapą + Twitch.

#### 5. Strona własnego profilu

**File**: `src/pages/profile.astro`

**Intent**: SSR `getFanProfileByUserId` + `ensureFanProfile`; przekazanie do `ProfileSection`.

**Contract**: Ładowanie profilu i `goingEvents` (S-19); banner błędu przy awarii serwisu; island `ProfileSection` z `client:load` (interaktywność edycji).

### Success Criteria:

#### Automated Verification:

- `npm run verify`
- `tests/unit/profile-editor.test.tsx` – toggle podgatunków (max 5), licznik bio
- `tests/unit/profile-section.test.tsx` – przełączenie editing, render `ProfileView` vs `ProfileEditor`

#### Manual Verification:

- Fan klika «Edytuj profil» → sekcja przechodzi w formularz inline (bez dialogu)
- Zapis → powrót do widoku z nowymi danymi
- Anuluj → powrót bez zapisu
- Zajęty login → komunikat w trybie edycji
- Admin nie widzi przycisku edycji / sekcji fana

**Implementation Note**: Po fazie 3 – manual QA własnego profilu przed publicznym widokiem.

---

## Phase 4: Profil publiczny `/u/@login`

### Overview

Publiczna strona profilu innego fana (i podgląd własnego przez ten sam layout bez e-maila).

### Changes Required:

#### 1. Trasa publiczna

**File**: `src/pages/u/[login].astro`

**Intent**: SSR profilu po `login` z URL; 404 gdy brak.

**Contract**: `getFanProfileByLogin`; normalizacja `login` z params (lowercase); layout jak karta profilu bez sekcji prywatnych; **bez e-maila**; opcjonalny link «Edytuj profil» tylko gdy `Astro.locals.user` jest właścicielem i login się zgadza → `/profile`.

#### 2. Komponent widoku publicznego

**File**: reuse `ProfileView.tsx` z `showEmail={false}`, bez `onEdit`

**Intent**: Ten sam layout kart co własny profil (spójność z `bassmap-pl-ui`), bez pól prywatnych.

**Contract**: Props: `profile: FanProfile`; bez sekcji «Moje eventy» na publicznym widoku MVP – sekcja «Idę» wyłącznie na `/profile`.

#### 3. Routing

**File**: `src/lib/routes.ts`

**Intent**: Helper `fanPublicProfilePath(login: string)` → `/u/${login}`.

**Contract**: Eksport stałej / funkcji; użycie w linkach przyszłych (S-23) – w S-20 minimum dokumentacja w planie.

### Success Criteria:

#### Automated Verification:

- `npm run verify`

#### Manual Verification:

- Gość: `/u/@istniejacy_login` – dane bez e-maila
- Gość: `/u/@nieistnieje` – 404
- Fan A nie widzi e-maila fan B na `/u/@fan_b`

**Implementation Note**: Po fazie 4 – pełna ścieżka własny + obcy profil przed legal.

---

## Phase 5: Dokumenty prawne i domknięcie

### Overview

Rozwinięcie polityki prywatności; sync roadmap/issue.

### Changes Required:

#### 1. Polityka prywatności

**File**: `src/pages/privacy-policy.astro`

**Intent**: Rozwinąć §2.1 – konkretne pola profilu (login, bio, miasto, podgatunki, linki social), cel (publiczny profil społecznościowy), dobrowolność, widoczność publiczna na `/u/@login`, brak publikacji e-maila.

**Contract**: Zastąpić ogólną zapowiedź konkretnym opisem; podstawa art. 6 ust. 1 pkt b RODO; informacja o usunięciu przy usunięciu konta (CASCADE).

#### 2. Data aktualizacji

**File**: `src/lib/legal/paths.ts`

**Intent**: `LEGAL_UPDATED_AT` na datę wdrożenia S-20.

#### 3. Roadmap / GitHub

**Intent**: Issue #40 → In Progress na start `/10x-implement`; PR `Refs #40`.

### Success Criteria:

#### Automated Verification:

- `npm run lint:all`
- `npm run verify`

#### Manual Verification:

- §2.1 czytelny po polsku; data w stopce prawnej zaktualizowana

---

## Testing Strategy

### Unit Tests:

- `fan-profile-api.test.ts` – GET/PATCH, 401/403/409/400
- `profile-schema.test.ts` (opcjonalnie) – login regex, max podgatunków, URL hosty

### Integration Tests:

- `fan-profile-rls.test.ts` – SELECT anon, UPDATE own, deny other user

### Manual Testing Steps:

1. Nowy fan – wejdź na `/profile` – kliknij «Edytuj profil» – ustaw unikalny login i bio – Zapisz (tryb inline).
2. Otwórz `/u/@ten_login` w oknie incognito – brak e-maila, poprawne social.
3. Zmień login na wolny – stary URL 404, nowy działa.
4. Próba loginu `AB` lub `user!` – błąd walidacji.
5. Wybierz 6 podgatunków – błąd (max 5).
6. Admin na `/profile` – komunikat / brak edycji fana.

## Performance Considerations

- Pojedynczy wiersz per user – brak paginacji; lookup po `login` przez UNIQUE index.
- Publiczny SSR `/u/[login]` – jedno zapytanie `getFanProfileByLogin`.

## Migration Notes

- Greenfield tabela – brak migracji danych historycznych.
- Deploy: `supabase db push` **przed** kodem API/UI.
- Istniejący fan bez profilu: lazy create przy pierwszym GET (nie wymaga batch backfill).

## References

- Roadmap S-20: `context/foundation/roadmap.md`
- Shaping: `context/foundation/partia-iii-shaping.md`
- Wzorzec planu: `context/archive/2026-06-23-event-attendance/plan.md`
- Wzorzec API: `src/pages/api/fan/change-suggestions/index.ts`
- Wzorzec serwisu: `src/lib/services/event-attendance.ts`
- UI profilu (produkcja): `src/components/fan/ProfileSection.tsx`
- **Design reference (gitignored):** `bassmap-pl-ui/components/profile-section.tsx`, `bassmap-pl-ui/components/profile-editor.tsx`, `bassmap-pl-ui/lib/profile.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` – <commit sha>` when a step lands.

### Phase 1: Schema, typy i serwis

#### Automated

- [x] 1.1 Migracja `fan_profiles` stosuje się lokalnie (`npx supabase db reset`) – d258756
- [x] 1.2 `npm run check` przechodzi – d258756
- [x] 1.3 `npm run lint` przechodzi – d258756

#### Manual

- [x] 1.4 Tabela i polityki RLS widoczne w Supabase Studio – d258756

### Phase 2: API i testy automatyczne

#### Automated

- [x] 2.1 `npm test` – unit `fan-profile-api.test.ts`
- [x] 2.2 `npm test` – integration `fan-profile-rls.test.ts` (gdy Supabase lokalna)
- [x] 2.3 `npm run verify`

#### Manual

- [x] 2.4 GET/PATCH `/api/fan/profile` zwraca poprawny JSON

### Phase 3: UI własnego profilu (`/profile`)

#### Automated

- [ ] 3.1 `npm run verify`
- [ ] 3.2 Testy unit `profile-editor.test.tsx` / `profile-section.test.tsx` (jeśli dodane)

#### Manual

- [ ] 3.3 «Edytuj profil» przełącza tryb inline; Zapisz / Anuluj działają
- [ ] 3.4 Walidacja loginu i zajęty login w formularzu
- [ ] 3.5 E-mail widoczny tylko na własnym `/profile`; layout siatki jak `bassmap-pl-ui`

### Phase 4: Profil publiczny `/u/@login`

#### Automated

- [ ] 4.1 `npm run verify`

#### Manual

- [ ] 4.2 Gość widzi `/u/@login` bez e-maila
- [ ] 4.3 Nieistniejący login → 404
- [ ] 4.4 Fan otwiera profil innej osoby

### Phase 5: Dokumenty prawne i domknięcie

#### Automated

- [ ] 5.1 `npm run lint:all`
- [ ] 5.2 `npm run verify`

#### Manual

- [ ] 5.3 Polityka §2.1 i `LEGAL_UPDATED_AT` poprawne

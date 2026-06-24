<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Edycja profilu fana (S-20)

- **Plan**: context/changes/fan-profile-edit/plan.md
- **Scope**: All 5 phases (complete)
- **Date**: 2026-06-24
- **Verdict**: APPROVED (post-triage)
- **Findings**: 0 critical, 5 warnings (all fixed), 2 observations (all fixed)

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Automated Verification

| Command | Result |
|---------|--------|
| `npm run verify` | PASS – 244 tests passed, 0 astro check errors |
| `fan-profile-api.test.ts` | PASS – 6 tests |
| `fan-profile-rls.test.ts` | PASS – 4 integration tests |
| `profile-editor.test.tsx` | PASS – 3 tests |
| `profile-section.test.tsx` | PASS – 3 tests |

## Findings

### F1 – Facebook social akceptuje zewnętrzne domeny jako „profil”

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/fan/profile-social.ts:57, 149–150
- **Detail**: Walidacja Facebooka dopuszcza dowolny tekst z kropką (`^@?[a-zA-Z0-9.]{2,50}$`), np. `evil.com`. `formatSocialHref` dla wartości z kropką buduje `https://{wartość}` bez sprawdzenia domeny. Link w UI jest pod etykietą „Facebook”, ale może prowadzić na złośliwą stronę (phishing). Testy nie obejmują Facebooka.
- **Fix**: Dla Facebooka wymagaj `facebook.com`/`fb.com` w URL albo nicka bez kropki; w `formatSocialHref` nigdy nie buduj URL wyłącznie z `includes(".")` – zawsze weryfikuj dozwoloną domenę. Dodaj testy na `evil.com` i `facebook.com.evil.com`.
- **Decision**: FIXED

### F2 – Pusty widok po Anuluj gdy brak zapisanego profilu

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/fan/ProfileSection.tsx:110–113, 148–157
- **Detail**: Gdy `initialProfile` jest `null`, komponent startuje w trybie edycji (`editing = true`). Po Anuluj `handleCancel` ustawia `editing = false`, ale `profile` nadal `null` – nie renderuje się ani `ProfileEditor`, ani `ProfileView`. Użytkownik widzi tylko nagłówek sekcji bez treści. Plan zakłada powrót do widoku podglądu po Anuluj.
- **Fix**: W `handleCancel` przy `profile === null` zostaw `editing = true` albo pokaż `ProfileView` z draftem / komunikat zachęcający do ustawienia loginu.
- **Decision**: FIXED

### F3 – Sugerowany login w edytorze niezgodny z serwerem

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/fan/ProfileSection.tsx:31
- **Detail**: `createDraftProfile` używa `loginFromEmailLocalPart(email)` (zachowuje kropki), podczas gdy serwer (`normalizeSuggestedLogin` w `fan-profile.ts`) zamienia kropki na `_`. Fan bez profilu widzi w formularzu login z kropkami, który nie przejdzie walidacji regex `^[a-z0-9_]{3,30}$`.
- **Fix**: Użyj `normalizeSuggestedLogin(loginFromEmailLocalPart(email))` w `createDraftProfile` (ten sam helper co na serwerze).
- **Decision**: FIXED

### F4 – `isLoginAvailable` maskuje błędy bazy jako „login zajęty”

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/fan-profile.ts:96–98
- **Detail**: Przy `response.error` z Supabase funkcja zwraca `false` zamiast propagować błąd. Przejściowy problem DB wygląda jak zajęty login (`LOGIN_TAKEN_ERROR`) lub cichy brak auto-profilu w `ensureFanProfile`.
- **Fix**: Przy `response.error` zwracaj `{ error: response.error.message }` i propaguj w górę; `false` tylko gdy wiersz istnieje.
- **Decision**: FIXED

### F5 – Brak CHECK na długość `city` w migracji

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260624100000_fan_profiles.sql:7
- **Detail**: Zod ogranicza `city` do 100 znaków (`profile-schema.ts:45`), ale tabela DB nie ma odpowiadającego CHECK. Ominięcie walidacji API (np. service role) pozwala na bardzo długie wartości.
- **Fix**: Dodaj `CONSTRAINT fan_profiles_city_length_check CHECK (city IS NULL OR char_length(city) <= 100)` w nowej migracji.
- **Decision**: FIXED

### F6 – `userId` w propsach publicznego profilu

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/u/[login].astro:59
- **Detail**: Pełny obiekt `FanProfile` (z `userId`) trafia do islanda `PublicProfileView` z `client:only`. UUID jest widoczny w HTML/JS strony publicznej. `isOwner` jest już liczony po stronie serwera – klient nie potrzebuje `userId`.
- **Fix**: Wprowadź typ `PublicFanProfile` bez `userId` i mapuj w `[login].astro` przed przekazaniem do islanda.
- **Decision**: FIXED

### F7 – Plan mówi `client:load`, kod używa `client:only` (świadome)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/profile.astro:77
- **Detail**: Plan Phase 3 wymaga `client:load`, implementacja używa `client:only="react"`. To jest **poprawne** względem `context/foundation/lessons.md` (Radix w `DeleteAccountSection` na tej samej stronie). Odchylenie od planu, ale zgodne z regułą projektu.
- **Fix**: Zaktualizuj plan Phase 3 na `client:only="react"` – nie zmieniaj kodu.
- **Decision**: FIXED

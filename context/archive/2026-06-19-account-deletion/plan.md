# Usuwanie konta użytkownika (S-16) Implementation Plan

## Overview

Slice roadmapy **S-16** (`change-id`: **`account-deletion`**). Zalogowany fan (nie-admin) trwale usuwa swoje konto z profilu po ponownym wpisaniu hasła. Dane uwierzytelniania (e-mail, hasło) są usuwane z Supabase Auth. Publiczne komentarze pozostają z etykietą „Usunięty użytkownik”. Zgłoszenia wydarzeń i sugestie zmian tracą powiązanie z kontem (`created_by` / `submitted_by` → `NULL`), treść zostaje zgodnie z polityką prywatności §4.

**PRD:** FR-022, NFR Privacy. **Issue:** [#28](https://github.com/ematrejek/bassmap-pl/issues/28).

## Current State Analysis

Partia II dostarczyła konta fanów (S-12), komentarze (S-15) i pełny UGC. Użytkownik może się zalogować, zgłaszać wydarzenia, sugerować zmiany i komentować – ale **nie może sam usunąć konta**. Polityka prywatności §5.1 kieruje do e-maila administratora.

### Key Discoveries:

- `ProfileSection.tsx` – profil fana na `/profile`; brak strefy „Usuń konto”.
- `createServiceRoleClient()` (`src/lib/supabase-service.ts`) – gotowy klient service role; używany przy upload okładek (`SUPABASE_SERVICE_ROLE_KEY` w `astro.config.mjs`).
- `event_comments` – `author_id` `ON DELETE SET NULL`, ale `author_label` to snapshot NOT NULL ustawiany przy INSERT (`src/lib/auth/display-name.ts`). Po samym `deleteUser` FK wyzeruje `author_id`, **nie** zmieni etykiety – wymagany jawny `UPDATE` (S-15 handoff).
- `events.created_by` – już `ON DELETE SET NULL` (`20260616120000_fan_event_submissions.sql`).
- `change_suggestions.submitted_by` – `NOT NULL` + `ON DELETE CASCADE` (`20260616140000_duplicate_detection_and_suggestions.sql`). CASCADE **kasowałby** wiersze sugestii przy usunięciu użytkownika – sprzeczne z polityką §4 (retencja dokumentacji moderacji). Wymaga migracji S-16.
- Wzorzec API fan: `requireAuth`, odrzucenie admina 403, Zod, `jsonResponse` (`src/pages/api/fan/change-suggestions/index.ts`).
- Wzorzec potwierdzenia UI: `AlertDialog` w `DeleteEventButton.tsx`.
- Polityka §4 – opisuje anonimizację komentarzy i odłączenie zgłoszeń; §5.1 – placeholder „do czasu udostępnienia funkcji”.
- Regulamin §3.6 – analogiczny placeholder.

## Desired End State

1. Fan na `/profile` widzi sekcję **Strefa konta** z przyciskiem **Usuń konto** (czerwony, na dole profilu).
2. Klik otwiera `AlertDialog`: wyjaśnienie skutków + pole **hasło** + przycisk **Trwale usuń konto**.
3. `POST /api/fan/account/delete` z `{ password }` → weryfikacja hasła → anonimizacja komentarzy → `auth.admin.deleteUser` → `signOut` → redirect `/?accountDeleted=1`.
4. Komentarze autora: `author_label = 'Usunięty użytkownik'`, `author_id = NULL`, `body` bez zmian – widoczne publicznie na `/events/[id]`.
5. Zgłoszenia wydarzeń i sugestie: `created_by` / `submitted_by` = `NULL` (automatycznie przez FK po migracji).
6. Admin na `/profile` **nie** widzi sekcji usuwania (lub widzi informację o kontakcie e-mailem).
7. Polityka §5.1 i regulamin §3.6 opisują samodzielne usuwanie; `LEGAL_UPDATED_AT` zaktualizowany przy archive.

### Weryfikacja ręczna

- Zaloguj fan → dodaj komentarz na evencie → usuń konto z profilu (poprawne hasło) → redirect na `/` z komunikatem.
- Otwórz ten sam event jako gość → komentarz z „Usunięty użytkownik”.
- Próba logowania starym e-mailem → błąd.
- Złe hasło w dialogu → komunikat błędu, konto nietknięte.
- Zaloguj admin → brak przycisku usuwania konta (lub komunikat o e-mailu).

## What We're NOT Doing

- Usuwanie konta administratora przez UI (ryzyko utraty jedynego admina).
- Okres karencji / soft delete / przywracanie konta.
- Automatyczne usuwanie komentarzy przy usunięciu konta.
- Eksport danych (JSON/CSV) – nadal na wniosek e-mail §5.1.
- Panel admina do usuwania kont innych użytkowników.
- Powiadomienie e-mail po usunięciu.
- Rate limiting na endpoint delete (opcjonalnie kolejna iteracja).

## Implementation Approach

Pięć faz: (1) migracja FK sugestii, (2) serwis + stała etykiety, (3) API, (4) UI profilu, (5) testy + legal + roadmap sync.

**Krytyczna kolejność w serwisie** (nie polegać wyłącznie na FK):

```
1. verifyPassword(email, password)     // sesja użytkownika
2. anonymizeUserComments(userId)       // service role UPDATE event_comments
3. auth.admin.deleteUser(userId)       // service role – FK SET NULL na events/suggestions
4. signOut()                           // wyczyść cookies
```

## Critical Implementation Details

### Stała etykiety

**File**: `src/lib/auth/display-name.ts` (rozszerzenie)

```typescript
export const DELETED_USER_AUTHOR_LABEL = "Usunięty użytkownik";
```

Używana w serwisie anonimizacji i testach integracyjnych. UI komentarzy już czyta `authorLabel` z API – bez zmian w `EventCommentsSection`.

### Serwis usuwania konta

**File**: `src/lib/services/account-deletion.ts`

```typescript
export type DeleteAccountResult =
  | { success: true }
  | { error: string };

export async function anonymizeUserComments(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<{ error?: string }>;

export async function deleteUserAccount(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<DeleteAccountResult>;
```

**`anonymizeUserComments`:** `.from('event_comments').update({ author_id: null, author_label: DELETED_USER_AUTHOR_LABEL }).eq('author_id', userId)`. Zwróć błąd DB jeśli update fail.

**`deleteUserAccount`:** wywołaj `anonymizeUserComments`, potem `serviceClient.auth.admin.deleteUser(userId)`. Jeśli deleteUser fail po anonimizacji – zwróć błąd (komentarze już anonimowe; rzadki edge case – log + komunikat „skontaktuj się z administratorem”).

### Weryfikacja hasła

W endpoincie API **przed** service role:

```typescript
const { error } = await supabase.auth.signInWithPassword({
  email: user.email,
  password: parsed.password,
});
if (error) return jsonResponse({ error: "Nieprawidłowe hasło" }, 401);
```

Użyj istniejącego cookie clienta (`createClient`) – nie twórz osobnej sesji service role do weryfikacji.

### Admin guard

```typescript
if (context.locals.isAdmin) {
  return jsonResponse(
    { error: "Administrator usuwa konto na wniosek e-mail – zobacz regulamin §3.6" },
    403,
  );
}
```

### Brak e-maila na koncie

Jeśli `!user.email` → `400` „Brak adresu e-mail na koncie – skontaktuj się z administratorem” (ten sam wzorzec co komentarze S-15).

### Response API

- Sukces: `204 No Content` lub `200 { success: true }` – UI robi `window.location.href = '/?accountDeleted=1'`.
- Błędy: `401` złe hasło, `403` admin, `500` brak service role / błąd delete.

---

## Phase 1: Schema – `change_suggestions` FK

### Overview

Zmienić `submitted_by` z `ON DELETE CASCADE` na `ON DELETE SET NULL`, żeby sugestie zmian nie były kasowane przy usunięciu konta.

### Changes Required:

#### 1. Migracja SQL

**File**: `supabase/migrations/20260620100000_account_deletion_suggestions_set_null.sql`

**Intent**: Zachować wiersze sugestii po usunięciu użytkownika; odłączyć tożsamość zgłaszającego.

**Contract**:

```sql
-- S-16: Keep change_suggestions rows when fan account is deleted (privacy §4).

ALTER TABLE public.change_suggestions
  DROP CONSTRAINT IF EXISTS change_suggestions_submitted_by_fkey;

ALTER TABLE public.change_suggestions
  ALTER COLUMN submitted_by DROP NOT NULL;

ALTER TABLE public.change_suggestions
  ADD CONSTRAINT change_suggestions_submitted_by_fkey
  FOREIGN KEY (submitted_by)
  REFERENCES auth.users (id)
  ON DELETE SET NULL;
```

**Uwagi:**

- RLS INSERT fan nadal wymaga `submitted_by = auth.uid()` – bez zmian.
- RLS SELECT own (`submitted_by = auth.uid()`) – bez zmian; po usunięciu konta użytkownik i tak nie istnieje.
- Admin SELECT wszystkich sugestii – bez zmian; wiersze z `submitted_by IS NULL` nadal widoczne.
- `events.created_by` – **bez migracji** (już `SET NULL`).
- **Plan-review:** po migracji zaktualizować typy (`submittedBy: string | null`) w `types.ts`, `suggestion-mapper.ts`, `change-suggestions.ts`; w `admin/index.astro` filtrować `null` przed `resolveSubmitterProfiles`.

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` stosuje migrację bez błędu
- `npm run build`

#### Manual Verification:

- W Studio: usuń testowego użytkownika z sugestią → wiersz sugestii zostaje, `submitted_by` = NULL

---

## Phase 2: Serwis + walidacja

### Overview

Logika biznesowa anonimizacji komentarzy i usunięcia użytkownika; schemat Zod dla body API.

### Changes Required:

#### 1. Stała + serwis

**Files**:

- `src/lib/auth/display-name.ts` – `DELETED_USER_AUTHOR_LABEL`
- `src/lib/services/account-deletion.ts` – `anonymizeUserComments`, `deleteUserAccount`

#### 2. Schemat Zod

**File**: `src/lib/account-deletion/schema.ts`

```typescript
import { z } from "zod";

export const deleteAccountBodySchema = z.object({
  password: z.string().min(1, "Podaj hasło"),
});

export type DeleteAccountBody = z.infer<typeof deleteAccountBodySchema>;
```

#### 3. Unit testy

**File**: `tests/unit/account-deletion-schema.test.ts`

- Pusty password → błąd Zod
- Poprawny obiekt → pass

### Success Criteria:

#### Automated Verification:

- `tests/unit/account-deletion-schema.test.ts` przechodzi
- `npm run lint` i `npm run build`

---

## Phase 3: API – `POST /api/fan/account/delete`

### Overview

Endpoint chroniony auth; weryfikacja hasła; delegacja do serwisu service role.

### Changes Required:

#### 1. Route

**File**: `src/pages/api/fan/account/delete.ts`

```typescript
export const prerender = false;

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) return authError;

  if (context.locals.isAdmin) { /* 403 */ }

  const user = context.locals.user!;
  if (!user.email) { /* 400 */ }

  // parse JSON body → deleteAccountBodySchema
  // verify password via createClient signInWithPassword
  // createServiceRoleClient() → deleteUserAccount(serviceClient, user.id)
  // supabase.auth.signOut()
  // return 204 or redirect response
};
```

**Konwencja:** ścieżka `/api/fan/account/delete` (nie `/api/fan/account` DELETE – body z hasłem wymaga POST).

#### 2. Unit testy API

**File**: `tests/unit/account-delete-api.test.ts`

Mock `locals`, serwisu i supabase; asercje: 401 bez usera, 403 admin, 401 złe hasło, 204 sukces.

### Success Criteria:

#### Automated Verification:

- `tests/unit/account-delete-api.test.ts` przechodzi
- `npm run lint` i `npm run build`

#### Manual Verification:

- `curl -X POST` z cookie sesji fan + JSON password (lokalnie)

---

## Phase 4: UI – sekcja na profilu

### Overview

React island z dialogiem potwierdzenia i polem hasła; komunikat sukcesu na stronie głównej.

### Changes Required:

#### 1. Komponent

**File**: `src/components/fan/DeleteAccountSection.tsx`

- Props: `email: string` (opcjonalnie do wyświetlenia w opisie)
- `AlertDialog` jak `DeleteEventButton.tsx`
- W dialogu: lista skutków (konto zniknie, komentarze zostaną anonimowe, operacja nieodwracalna)
- `<Input type="password">` – hasło
- Submit → `fetch('/api/fan/account/delete', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })`
- Sukces → `window.location.href = '/?accountDeleted=1'`
- Błąd → `ServerError` w dialogu

Stylowanie: czerwony akcent spójny z `DeleteEventButton`; klasy przez `cn()`.

#### 2. Integracja profilu

**File**: `src/pages/profile.astro`

Warunek na `Astro.locals.isAdmin`:

- **Fan:** istniejący `<ProfileSection>` + pod spodem `<DeleteAccountSection client:load />` (osobny island – nie wewnątrz `ProfileSection`, który nie ma dziś propa `isAdmin`).
- **Admin:** tylko `<ProfileSection>` + krótki akapit z linkiem do polityki §5.1 (usuwanie konta admina na wniosek e-mail).

#### 3. Kolejka moderacji – pending po usunięciu konta

**File**: `src/pages/admin/index.astro`

**Plan-review (krytyczne):** dziś `isFanSubmission` wymaga `createdBy !== null`. Po `deleteUser` pending zgłoszenie ma `created_by = NULL` i **wypada** z sekcji „Do moderacji” (bez Opublikuj/Odrzuć).

Zmienić na:

```typescript
function isFanSubmission(event: Event): boolean {
  return event.status === "pending";
}
```

(W aplikacji tylko fan tworzy `pending`.) Kolumna Zgłaszający: istniejący fallback „Nieznany użytkownik” w `AdminEventsTable` gdy brak profilu.

#### 4. Komunikat po usunięciu

**File**: `src/pages/index.astro` (lub wspólny banner w `AppShell`)

Gdy `Astro.url.searchParams.get('accountDeleted') === '1'` → zielony banner „Twoje konto zostało trwale usunięte.” (jednorazowy, bez persist).

### Success Criteria:

#### Automated Verification:

- `npm run lint` i `npm run build`

#### Manual Verification:

- Pełna ścieżka fan: profil → dialog → hasło → redirect → komunikat
- Admin na profilu – brak przycisku delete

---

## Phase 5: Testy integracyjne, legal, roadmap

### Overview

Test E2E na lokalnym Supabase; aktualizacja dokumentów prawnych; sync roadmapy i issue #28.

### Changes Required:

#### 1. Test integracyjny

**File**: `tests/integration/account-deletion.test.ts`

Scenariusz (jednorazowy użytkownik testowy – **nie** `INTEGRATION_NON_ADMIN_EMAIL`):

1. `serviceClient.auth.admin.createUser` z unikalnym e-mailem `integration-delete-{uuid}@example.com`
2. Wstaw komentarz z `author_id` = ten user (service role) na published evencie
3. Opcjonalnie: wstaw `change_suggestion` z `submitted_by` = user
4. Wywołaj logikę serwisu `deleteUserAccount` (lub symuluj API z authenticated client + password)
5. **Osobny test:** złe hasło → użytkownik nadal w Auth, komentarz bez anonimizacji
6. Asercje (scenariusz sukcesu):
   - `auth.admin.getUserById` → user not found
   - komentarz: `author_label === DELETED_USER_AUTHOR_LABEL`, `author_id === null`
   - sugestia: `submitted_by === null` (wiersz istnieje)
7. Cleanup: usuń komentarz/fixture event jeśli został

Wzorzec: `tests/integration/event-comments-rls.test.ts`, `createServiceClient`.

#### 2. Legal sync (**ta sama sesja co kod – przed deployem na produkcję**)

**Files**:

- `src/pages/privacy-policy.astro` §5.1 – zastąpić „do czasu udostępnienia funkcji…” opisem: „Możesz trwale usunąć konto w sekcji Mój profil → Usuń konto, po potwierdzeniu hasłem.” Zachować alternatywę e-mail.
- `src/pages/terms.astro` §3.6 – analogiczna aktualizacja (usuń zdanie „Gdy w Serwisie zostanie udostępniona funkcja…”).
- `src/lib/legal/paths.ts` – `LEGAL_UPDATED_AT` = data wdrożenia.

> Archive (`/10x-archive`) tylko potwierdza zamknięcie slice’a – legal musi być zsynchronizowany **przed** pierwszym deployem funkcji.

#### 3. Roadmap sync

**File**: `context/foundation/roadmap.md`

- Status S-16 → `in progress` na `/10x-implement`; `done` przy archive.
- Zamknij issue #28 przy archive.

### Success Criteria:

#### Automated Verification:

- `npm run verify` (lub `npm run test:ci` z Docker)
- `npm run lint:all`
- `npm run build`

#### Manual Verification:

- Przeczytaj zaktualizowane §5.1 i §3.6
- Pełna ścieżka w przeglądarce (fan z komentarzem)

---

## Testing Strategy

### Unit Tests:

- `deleteAccountBodySchema` – walidacja hasła
- API route – kody statusu, guardy auth/admin

### Integration Tests:

- Anonimizacja komentarzy + delete user + FK sugestii SET NULL
- Zły password nie usuwa użytkownika

### Manual Testing Steps:

1. Fan z komentarzem → usuń konto → komentarz „Usunięty użytkownik”
2. Fan ze zgłoszeniem pending → usuń konto → admin nadal widzi zgłoszenie bez zgłaszającego
3. Złe hasło → błąd, sesja aktywna
4. Admin → brak self-delete UI
5. Regulamin i polityka – opis self-service

## Performance Considerations

- Jedno `UPDATE` komentarzy per user (indeks `event_comments_author_id_idx` już istnieje).
- `deleteUser` – pojedyncze wywołanie Auth API; bez transakcji cross-service (akceptowalne na MVP; anonimizacja przed delete minimalizuje niespójność).

## Migration Notes

- Deploy migracji **przed** kodem aplikacji (zmiana FK wstecznie kompatybilna).
- Produkcja: upewnij się, że `SUPABASE_SERVICE_ROLE_KEY` jest w sekretach Cloudflare (już wymagany przy okładkach).

## References

- S-15 handoff: `context/archive/2026-06-19-event-comments/plan.md` §S-16 Handoff
- S-12 `created_by`: `supabase/migrations/20260616120000_fan_event_submissions.sql`
- Service role: `src/lib/supabase-service.ts`
- PRD FR-022, Business Logic §account deletion
- Polityka §4, §5.1; Regulamin §3.6

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` – <commit sha>` when a step lands.

### Phase 1: Schema – change_suggestions FK

#### Automated

- [x] 1.1 `npx supabase db reset` stosuje migrację bez błędu
- [x] 1.2 `npm run build` przechodzi

#### Manual

- [x] 1.3 Studio: DELETE user → sugestia z `submitted_by` NULL

### Phase 2: Serwis + walidacja

#### Automated

- [x] 2.1 `tests/unit/account-deletion-schema.test.ts` przechodzi
- [x] 2.2 `npm run lint` i `npm run build`

### Phase 3: API

#### Automated

- [x] 3.1 `tests/unit/account-delete-api.test.ts` przechodzi
- [x] 3.2 `npm run lint` i `npm run build`

#### Manual

- [x] 3.3 curl POST z sesją fan

### Phase 4: UI profil

#### Automated

- [x] 4.1 `npm run lint` i `npm run build`

#### Manual

- [x] 4.2 Fan: dialog + hasło + redirect + banner
- [x] 4.3 Admin: brak przycisku delete

### Phase 5: Testy integracyjne, legal, roadmap

#### Automated

- [x] 5.1 `npm run verify` przechodzi
- [x] 5.2 `npm run lint:all` przechodzi

#### Manual

- [x] 5.4 Legal copy + pełna ścieżka w przeglądarce

## Plan Review

Szczegółowy przegląd: `reviews/plan-review.md` (2026-06-19). Werdykt: **zatwierdzony z poprawkami** – gotowy pod `/10x-implement`.

Poprawki wpisane w plan: fix kolejki moderacji `isFanSubmission`, nullable `submittedBy`, integracja UI w `profile.astro`, nagłówek JSON w fetch, legal przed deployem, test złego hasła.

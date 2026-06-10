# Admin Role Guard Implementation Plan

## Overview

Wdrożenie warstwy aplikacyjnej ochrony roli admina (F-02): synchronizacja z istniejącym `public.is_admin()` z F-01, rozszerzenie middleware, helpery guardów API oraz minimalne strony `/admin` i `/403`. Cel — odblokowanie S-01 (panel CRUD wydarzeń) przy zachowaniu publicznego odczytu bez logowania (PRD §Access Control).

## Current State Analysis

- **F-01 done:** `admin_allowlist`, funkcja `is_admin()` porównująca `auth.jwt() ->> 'email'` z allowlistą, RLS na `events` (zapis tylko admin). Seed: `matrejekemilia@gmail.com` w migracji i `seed.sql`.
- **Middleware** (`src/middleware.ts`): ustawia `context.locals.user`; chroni tylko `/dashboard` — każdy zalogowany przechodzi, bez sprawdzenia roli.
- **Locals** (`src/env.d.ts`): tylko `user: User | null` — brak `isAdmin`.
- **Brak** tras `/admin/*`, helperów `requireAdmin`, strony 403, warunkowego linku admin w nav.
- **Topbar** (`src/components/Topbar.astro`): link Dashboard dla każdego zalogowanego; używany w `Welcome.astro`.
- **API auth** (`src/pages/api/auth/*.ts`): wzorzec early redirect; brak `prerender = false` (do naprawy przy okazji S-01, nie w F-02).
- **Bloker roadmapy rozstrzygnięty w planowaniu:** źródło roli = allowlist + RPC (bez `app_metadata` / custom JWT w MVP).

### Key Discoveries:

- RLS już blokuje zapis eventów — F-02 to UX + wczesne 403, nie jedyny mechanizm bezpieczeństwa.
- `admin_allowlist` ma RLS SELECT tylko dla adminów — aplikacja **nie może** odczytać listy e-maili bezpośrednio; musi użyć RPC `is_admin()`.
- Funkcja `is_admin()` nie ma jeszcze `GRANT EXECUTE TO authenticated` — bez tego RPC z klienta Supabase zwróci błąd uprawnień.
- Komentarz w migracji F-01 („most do F-02”) — F-02 **podłącza aplikację**, nie zastępuje allowlisty.

## Desired End State

1. `npx supabase db reset` stosuje migrację F-02 (GRANT) bez błędów.
2. Middleware ustawia `context.locals.isAdmin` przez `supabase.rpc('is_admin')` na każdym request.
3. Trasy `/admin` i pod-trasy wymagają zalogowania + `isAdmin`; nie-admin → `/403` (HTTP 403); anon → `/auth/signin`.
4. `src/lib/auth/admin.ts` eksportuje `resolveIsAdmin()`; `src/lib/auth/guards.ts` eksportuje `requireAuth()` i `requireAdmin()`.
5. Strona `/admin` (placeholder) potwierdza działanie guarda; Topbar pokazuje „Panel admina” tylko adminom.
6. `npm run lint` i `npm run build` przechodzą.

### Weryfikacja ręczna:

- Konto na e-mailu z allowlisty: `/admin` OK, link w nav widoczny.
- Konto na innym e-mailu: `/admin` → 403; brak linku admin w nav.
- Wylogowany: `/admin` → signin.
- RPC failure (symulacja): admin traktowany jak nie-admin (bezpiecznie).

## What We're NOT Doing

- CRUD wydarzeń, formularze, API `/api/events/*` — S-01.
- Migracja `is_admin()` na `app_metadata.role` lub custom JWT — post-MVP.
- UI zarządzania `admin_allowlist` — operacje SQL / Supabase Studio.
- OAuth / social login — poza scope; e-mail w JWT musi pasować do allowlisty gdy dodane później.
- Usuwanie `/dashboard` — zostaje jako przykład chronionej trasy auth-only.
- Test runner / testy automatyczne — brak konfiguracji w repo.
- Aktualizacja README (opcjonalna dokumentacja admin setup — poza minimalnym scope; można w S-01).

## Implementation Approach

Trzy fazy sekwencyjne: (1) migracja GRANT, (2) logika auth + middleware, (3) strony i nav. Aplikacja deleguje decyzję „czy admin” do tej samej funkcji SQL co RLS — brak duplikacji listy e-maili w env ani kodzie TypeScript.

Defense in depth: middleware/guards (app) + RLS (DB). Guard zapobiega pokazywaniu UI/API; RLS gwarantuje brak zapisu przy błędzie w app.

## Critical Implementation Details

- **Kolejność w middleware:** najpierw `getUser()`, potem RPC `is_admin()` (wymaga authenticated JWT). Gdy `supabase === null` (brak env), ustaw `user = null`, `isAdmin = false`.
- **Fail-closed:** błąd RPC → `isAdmin = false` (nie rzucaj 500 na całą stronę). Admin tymczasowo bez dostępu; fan nadal przegląda publiczne treści.
- **Strony `/admin` i `/403`:** muszą eksportować `export const prerender = false` (SSR, reguła projektu).
- **HTTP 403:** strona `/403.astro` ustawia `Astro.response.status = 403`; middleware przekierowuje nie-admina na `/403`, nie zwraca gołego `Response`.

## Phase 1: Migracja GRANT dla RPC

### Overview

Umożliwienie wywołania `public.is_admin()` z klienta Supabase (rola `authenticated`).

### Changes Required:

#### 1. Nowa migracja SQL

**File**: `supabase/migrations/20260610110000_grant_is_admin_rpc.sql`

**Intent**: Nadać uprawnienie EXECUTE na istniejącej funkcji `is_admin()` bez zmiany jej logiki ani schematu F-01.

**Contract**:

- `GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;`
- Brak innych DDL (nie modyfikować `admin_allowlist`, `events`, polityk RLS).

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` kończy się sukcesem (migracja + seed).
- W Supabase Studio / psql: rola `authenticated` może wywołać `SELECT public.is_admin()` w kontekście JWT (lub weryfikacja przez aplikację w Phase 2).

#### Manual Verification:

- Po `db reset` istnieje plik migracji w `supabase/migrations/` z GRANT.
- Brak regresji w politykach RLS F-01 (anon nadal widzi tylko published + upcoming).

**Implementation Note**: Po Phase 1 i automated verification — potwierdzenie manualne przed Phase 2.

---

## Phase 2: Warstwa auth (helpery + middleware + typy)

### Overview

Centralna logika roli admina w TypeScript, rozszerzenie middleware o `ADMIN_ROUTES` i `locals.isAdmin`.

### Changes Required:

#### 1. Resolver roli admina

**File**: `src/lib/auth/admin.ts`

**Intent**: Jedna funkcja async wywołująca RPC `is_admin()` — to samo kryterium co RLS w Postgresie.

**Contract**:

- Eksport: `resolveIsAdmin(supabase: SupabaseClient, user: User | null): Promise<boolean>`
- Gdy `user === null` → `false` (bez RPC).
- Wywołanie: `supabase.rpc('is_admin')` — zwraca `true` tylko gdy `data === true`.
- Gdy `error` z RPC → `false` (fail-closed).

#### 2. Guardy API

**File**: `src/lib/auth/guards.ts`

**Intent**: Reużywalne guardy dla przyszłych endpointów S-01; wczesny return z JSON + statusem HTTP.

**Contract**:

- `requireAuth(locals: App.Locals): Response | null` — brak user → 401, body JSON `{ error: string }` po polsku, `Content-Type: application/json`.
- `requireAdmin(locals: App.Locals): Response | null` — deleguje do `requireAuth`, potem brak `isAdmin` → 403 z komunikatem po polsku.
- Zwraca `null` gdy dostęp dozwolony.

#### 3. Middleware

**File**: `src/middleware.ts`

**Intent**: Ustawić `locals.isAdmin` na każdym request; chronić prefix `/admin` osobno od `/dashboard`.

**Contract**:

- Import `resolveIsAdmin`.
- Stała `ADMIN_ROUTES = ["/admin"]` (prefix match jak `PROTECTED_ROUTES`).
- Po `getUser()`: `context.locals.isAdmin = await resolveIsAdmin(supabase, user)`.
- Gdy brak supabase: `user = null`, `isAdmin = false`.
- Dla `ADMIN_ROUTES`: brak user → redirect `/auth/signin`; user bez `isAdmin` → redirect `/403`.
- `PROTECTED_ROUTES` (`/dashboard`) — bez zmian (tylko auth).

#### 4. Typy locals

**File**: `src/env.d.ts`

**Intent**: TypeScript zna `isAdmin` w `App.Locals`.

**Contract**:

- Dodać `isAdmin: boolean` do `App.Locals`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi bez błędów.
- `npm run build` przechodzi (typy `locals.isAdmin` poprawne).

#### Manual Verification:

- Tymczasowy log / debugger: zalogowany admin ma `isAdmin true` w middleware (do usunięcia przed merge — opcjonalnie).
- Zalogowany nie-admin: `isAdmin false`.
- Wylogowany: `isAdmin false`.

**Implementation Note**: Po Phase 2 — manual confirmation przed Phase 3.

---

## Phase 3: Strony admin/403 i nawigacja

### Overview

Placeholder panelu admina do testów guarda, strona 403 po polsku, warunkowy link w Topbarze.

### Changes Required:

#### 1. Placeholder panelu admina

**File**: `src/pages/admin/index.astro`

**Intent**: Minimalna strona potwierdzająca, że guard admina działa — S-01 zastąpi treść CRUD.

**Contract**:

- `export const prerender = false`
- Używa `Layout`; tytuł po polsku (np. „Panel admina”).
- Wyświetla e-mail z `Astro.locals.user` i krótki komunikat, że CRUD wydarzeń pojawi się w S-01.
- Dołącza `Topbar` (spójność z resztą app) lub prosty nav — implementer wybiera minimalny wariant zgodny z istniejącym stylem cosmic/Tailwind.

#### 2. Strona 403

**File**: `src/pages/403.astro`

**Intent**: User-facing komunikat braku uprawnień administratora.

**Contract**:

- `export const prerender = false`
- `Astro.response.status = 403`
- Treść po polsku: brak uprawnień administratora; link powrotu na `/`.
- Layout spójny wizualnie z `dashboard.astro` / `403` pattern.

#### 3. Topbar — link admina

**File**: `src/components/Topbar.astro`

**Intent**: Fan nie widzi linku do panelu; admin ma wyraźną ścieżkę.

**Contract**:

- Odczyt `const { user, isAdmin } = Astro.locals`
- Link „Panel admina” (`href="/admin"`) renderowany **tylko** gdy `user && isAdmin`
- Link „Dashboard” pozostaje dla każdego zalogowanego (bez zmiany zachowania auth test)
- Teksty UI po polsku (zgodnie z PRD §Language)

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi.
- `npm run build` przechodzi.

#### Manual Verification:

- Admin (e-mail z allowlisty, zalogowany): widzi link „Panel admina”, `/admin` renderuje placeholder.
- Nie-admin (zalogowany na innym e-mailu): brak linku admin; wejście na `/admin` → strona 403.
- Anonim: `/admin` → redirect signin; brak linków zalogowanego w Topbarze.
- `/dashboard` nadal wymaga logowania dla każdego usera (regresja auth).

**Implementation Note**: Po Phase 3 — pełna weryfikacja manualna przed zamknięciem F-02.

---

## Testing Strategy

### Unit Tests:

- Brak test runnera w repo — pominięte w F-02.

### Integration Tests:

- Brak — weryfikacja manualna + lint/build.

### Manual Testing Steps:

1. `npx supabase start` (jeśli nie działa) + `npx supabase db reset`.
2. Zarejestruj / zaloguj konto na `matrejekemilia@gmail.com` (lub e-mail z allowlisty).
3. Wejdź na `/admin` — oczekuj placeholder panelu.
4. Sprawdź Topbar na `/` — link „Panel admina” widoczny.
5. Wyloguj; zarejestruj konto na **innym** e-mailu.
6. Wejdź na `/admin` — oczekuj `/403` z komunikatem po polsku.
7. Topbar — brak linku „Panel admina”; link Dashboard nadal jest.
8. Wyloguj; wejdź na `/admin` — redirect na `/auth/signin`.
9. Uruchom `npm run lint` i `npm run build`.

## Performance Considerations

- Jedno RPC `is_admin()` na request — akceptowalne dla MVP (niski ruch, jeden admin). Optymalizacja (RPC tylko na `/admin` i API mutacji) odłożona do S-01 jeśli potrzebna.

## Migration Notes

- Lokalnie: `npx supabase db reset` stosuje migrację GRANT oraz seed z poprawnym e-mailem dev admina.
- **Poprawka e-maila dev admina (impl review):** pierwotny seed miał literówkę `matejekemilia@gmail.com`; poprawiono na `matrejekemilia@gmail.com` w F-01 migracji, seedzie oraz migracji upgrade `20260610120000_fix_admin_allowlist_email.sql` dla istniejących DB.
- Produkcja (przyszły deploy): `supabase db push` lub migracja przez CI — poza scope F-02, ale migracja musi trafić do repo przed produkcyjnym S-01.
- Dodanie admina w produkcji: `INSERT INTO public.admin_allowlist (email) VALUES ('...')` przez SQL Editor (service role). Użytkownik musi mieć konto Auth na tym e-mailu.

## References

- F-01 archive: `context/archive/2026-06-10-event-data-foundation/plan.md`
- PRD Access Control: `context/foundation/prd.md` (L139–146)
- Roadmap F-02: `context/foundation/roadmap.md` (L76–88)
- Wzorzec middleware: `src/middleware.ts`
- RLS + `is_admin()`: `supabase/migrations/20260610100000_create_events.sql` (L91–176)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Migracja GRANT dla RPC

#### Automated

- [x] 1.1 `npx supabase db reset` kończy się sukcesem (migracja + seed) — fac264a

#### Manual

- [x] 1.2 Plik migracji GRANT istnieje; brak regresji RLS F-01 — fac264a

### Phase 2: Warstwa auth (helpery + middleware + typy)

#### Automated

- [x] 2.1 `npm run lint` przechodzi bez błędów — 332262e
- [x] 2.2 `npm run build` przechodzi — 332262e

#### Manual

- [x] 2.3 Zalogowany admin: `isAdmin true`; nie-admin / anon: `isAdmin false` — 332262e

### Phase 3: Strony admin/403 i nawigacja

#### Automated

- [x] 3.1 `npm run lint` przechodzi — 8101ec8
- [x] 3.2 `npm run build` przechodzi — 8101ec8

#### Manual

- [x] 3.3 Admin: `/admin` OK + link w nav; nie-admin: 403; anon: signin; `/dashboard` bez regresji — 8101ec8

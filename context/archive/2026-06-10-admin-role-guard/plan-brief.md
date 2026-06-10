# Admin Role Guard — Plan Brief

> Full plan: `context/changes/admin-role-guard/plan.md`

## What & Why

BassMap PL wymaga rozróżnienia admina od zwykłego zalogowanego użytkownika, zanim powstanie panel CRUD (S-01). F-01 zabezpiecza zapis w bazie (RLS + `admin_allowlist`), ale aplikacja nadal traktuje każdego zalogowanego tak samo — bez tego admin mógłby widzieć formularze, których nie może użyć, a fan mógłby trafić na ścieżki zapisu. F-02 dostarcza guard w middleware, helpery API i placeholder `/admin`.

## Starting Point

- F-01 `done`: `admin_allowlist`, `public.is_admin()`, RLS na `events` — zapis tylko dla e-maili z allowlisty.
- Auth scaffold: `src/middleware.ts` chroni tylko `/dashboard` (każdy zalogowany); `context.locals.user`, brak `isAdmin`.
- Brak tras `/admin/*`, brak guardów API dla eventów, brak strony 403.

## Desired End State

Po wdrożeniu: zalogowany użytkownik z e-mailem z `admin_allowlist` ma `locals.isAdmin === true`, widzi link „Panel admina” w Topbarze i wchodzi na `/admin`. Zalogowany nie-admin dostaje 403 po polsku. Niezalogowany na `/admin` trafia na `/auth/signin`. S-01 może od razu użyć `requireAdmin()` i `ADMIN_ROUTES` bez zmiany modelu roli.

## Key Decisions Made

| Decision              | Choice                                      | Why (1 sentence)                                              | Source |
| --------------------- | ------------------------------------------- | --------------------------------------------------------------- | ------ |
| Źródło roli admina    | `admin_allowlist` + RPC `is_admin()`        | Ta sama logika co RLS w F-01 — zero dryfu                       | Plan   |
| Nie-admin na `/admin` | Strona 403 po polsku                        | Jasny komunikat; user wie, że brak roli                         | Plan   |
| Trasy admina          | Prefix `/admin/*`                           | Czytelna separacja od `/dashboard` (auth test)                  | Plan   |
| RPC scope             | Na każdym request                           | `locals.isAdmin` zawsze dostępne (nav, strony)                  | Plan   |
| Strona w F-02         | Placeholder `/admin`                        | Ręczna weryfikacja guarda przed S-01                            | Plan   |
| Signup                | Otwarty dla wszystkich                      | Zgodne z PRD; admin = allowlist, nie blokada rejestracji        | Plan   |
| Nav                   | Link „Panel admina” tylko gdy `isAdmin`     | Fan nie widzi opcji bez uprawnień                               | Plan   |
| API w F-02            | Tylko `requireAuth` / `requireAdmin`        | CRUD eventów to S-01                                            | Plan   |
| `/dashboard`          | Zostaje (auth-only)                         | Scaffold nadal użyteczny do testów logowania                    | Plan   |
| Błąd RPC              | `isAdmin = false` (fail-closed dla admina)  | Bezpieczne; publiczne strony działają                            | Plan   |
| Migracja SQL          | Tylko `GRANT EXECUTE` na `is_admin()`       | Minimalny diff; F-01 bez zmian                                  | Plan   |

## Scope

**In scope:** migracja GRANT, `resolveIsAdmin()`, `requireAuth`/`requireAdmin`, rozszerzenie middleware + `env.d.ts`, `/admin` placeholder, `/403`, warunkowy link w Topbarze.

**Out of scope:** CRUD eventów, API `/api/events/*`, `app_metadata.role`, custom JWT claims, UI formularzy admina (S-01), mapa/filtry fana (S-02).

## Architecture / Approach

```
Request → middleware.ts
            getUser() → locals.user
            rpc('is_admin') → locals.isAdmin
            /admin/* → wymaga user + isAdmin (inaczej signin / 403)
            /dashboard → wymaga user (bez zmian)

Strony/API → requireAdmin(locals) przed mutacją (S-01)
Postgres RLS → is_admin() (ostateczna bariera zapisu)
```

## Phases at a Glance

| Phase                    | What it delivers                         | Key risk                                      |
| ------------------------ | ---------------------------------------- | --------------------------------------------- |
| 1. Migracja GRANT        | RPC `is_admin()` wywoływalne z klienta   | Brak GRANT → isAdmin zawsze false             |
| 2. Auth layer            | helpery, middleware, typy locals         | Zapomnienie `prerender = false` na `/admin`   |
| 3. Strony + nawigacja    | `/admin`, `/403`, link w Topbarze        | Topbar tylko na Welcome — admin page też nav  |

**Prerequisites:** F-01 wdrożony lokalnie (`npx supabase db reset`), konto Supabase Auth na e-mailu z allowlisty.

**Estimated effort:** ~1 sesja implementacji, 3 fazy sekwencyjnie.

## Open Risks & Assumptions

- Admin musi zarejestrować się na **tym samym e-mailu** co wpis w `admin_allowlist` (OAuth w przyszłości — ten sam e-mail w JWT).
- Dodawanie nowego admina w MVP = `INSERT` do `admin_allowlist` przez SQL Editor (service role); brak UI zarządzania allowlistą.
- `app_metadata.role` odłożone do v2 (wielu adminów / rola organizatora).

## Success Criteria (Summary)

- E-mail z allowlisty: `/admin` działa, link w nav widoczny.
- Inny zalogowany user: `/admin` → 403 po polsku.
- Anonim: `/admin` → redirect na signin.
- `npm run lint` i `npm run build` przechodzą.

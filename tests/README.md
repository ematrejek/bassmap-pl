# Tests

Integration tests need **local Supabase in Docker** — never production.

## Setup

1. Start local Supabase: `npx supabase start`
2. Apply migrations: `npx supabase migration up` (needs `20260611140000_fix_is_admin_use_uid` for admin tests)
3. Copy `.env.test.example` → `.env.test`
4. Fill keys from: `npx supabase status --output json`  
   (or ask a teammate to generate `.env.test` the same way)
5. Run: `npm test`

## Rules

- Integration tests only run when `SUPABASE_URL` is `127.0.0.1` / `localhost`.
- Fixtures insert a few rows and delete **only those IDs** in cleanup.
- Env vars and client helpers: `tests/helpers/supabase.ts`

## CI (GitHub Actions)

Every push/PR to `main` runs full `npm test` in **CI**; push to `main` also
runs tests in **Deploy** before production build. Workflows start local
Supabase and call `scripts/ci-supabase-test.sh` — integration must run; a
missing-env skip fails the job.

Locally without Docker, `npm test` still passes (unit + smoke only; integration
skipped with a warning). Use `npm run test:ci` to match the CI entry point when
`.env.test` is configured.

Workflows: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`.

Full cookbook: `context/foundation/test-plan.md` §6.1 (unit),
§6.2 (integration / fan read), §6.4 (auth / mutations).

# Tests

Integration tests need **local Supabase in Docker** – never production.

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
Supabase and call `scripts/ci-supabase-test.sh` – integration must run; a
missing-env skip fails the job.

Locally without Docker, `npm test` still passes (unit + smoke only; integration
skipped with a warning). Use `npm run verify` before every push (astro check +
lint + unit tests). Use `npm run test:ci` to match the full CI integration gate
when `.env.test` is configured. With `.env.test` present, `git push` also runs
`scripts/ci-supabase-test.sh` via `.husky/pre-push`.

## E2E smoke (Playwright)

Browser smoke tests live in `tests/e2e/`. They catch „React never hydrated”
regressions (e.g. stuck on „Ładowanie listy wydarzeń…”) that Vitest cannot see.

| Command               | When                                                                          |
| --------------------- | ----------------------------------------------------------------------------- |
| `npm run test:e2e`    | After `npm run build` in CI; locally uses `npm run dev` if nothing is running |
| `npm run verify:full` | `verify` + `build` + `test:e2e` – full gate before a UI-heavy PR              |
| `npm run cache:clean` | After editing `astro.config.mjs` or Vite dep warnings                         |

First-time setup: `npx playwright install chromium`.

Workflow tests (`event-workflows.spec.ts`) need **local Supabase** (same as integration tests):
`npx supabase start`, migrations applied, `.env.test` from `supabase status -o env`.
They are skipped automatically when `.env.test` is missing.

Checklist for humans: `context/foundation/smoke-checklist.md`.

Workflows: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`.

Full cookbook: `context/foundation/test-plan.md` §6.1 (unit),
§6.2 (integration / fan read), §6.4 (auth / mutations).

# Tests

Integration tests need **local Supabase in Docker** — never production.

## Setup

1. Start local Supabase: `npx supabase start`
2. Copy `.env.test.example` → `.env.test`
3. Fill keys from: `npx supabase status --output json`  
   (or ask a teammate to generate `.env.test` the same way)
4. Run: `npm test`

## Rules

- Integration tests only run when `SUPABASE_URL` is `127.0.0.1` / `localhost`.
- Fixtures insert a few rows and delete **only those IDs** in cleanup.
- Env vars and client helpers: `tests/helpers/supabase.ts`

Full cookbook: `context/foundation/test-plan.md` §6.2.

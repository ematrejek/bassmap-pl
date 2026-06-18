# Repository Guidelines

BassMap PL is a Polish DnB event-discovery web app on Astro 6 SSR with React 19 islands, Tailwind 4, Supabase, and Cloudflare Workers. Deeper conventions: @CLAUDE.md. Product scope: @context/foundation/prd.md.

## Hard Rules

- Full SSR (`output: "server"` in @astro.config.mjs). Every API route under `src/pages/api/` must export `const prerender = false`.
- Astro for static content; React only where interactivity is required. No Next.js directives (`"use client"` etc.).
- Merge Tailwind classes with `cn()` from @src/lib/utils.ts – never concatenate class strings manually.
- API routes: uppercase `GET`/`POST` exports, zod input validation – follow @src/pages/api/auth/signin.ts.
- Supabase migrations in `supabase/migrations/` as `YYYYMMDDHHmmss_short_description.sql`; enable RLS with granular per-operation policies on new tables.
- `SUPABASE_URL` and `SUPABASE_KEY` are server-only (`astro:env`); copy @.env.example to `.env` (Node) and `.dev.vars` (Cloudflare local dev).
- ALWAYS explain EVERYTHING to the user in simple language, explain all technical terms. The user does know absolutely nothing about programming. Don't ask technical questions without explanation what/why/what for.

## Project Structure

- @src/pages/ – routes; @src/pages/api/ – API endpoints
- @src/components/ui/ – shadcn/ui ("new-york"); add via `npx shadcn@latest add [name]`
- @src/components/hooks/ – React hooks; @src/lib/ – services/helpers; @src/types.ts – shared types
- @src/middleware.ts – auth guard; add paths to `PROTECTED_ROUTES` for new protected pages
- @context/foundation/ – PRD, tech stack, shaping notes

Path alias `@/*` → `./src/*` (@tsconfig.json).

## Build, Test, and Development

Node.js v22.14.0 (@.nvmrc).

- `npm run dev` – local dev (Cloudflare workerd runtime)
- `npm run build` – production SSR build
- `npm run preview` – preview production build
- `npm run lint` / `npm run lint:fix` – ESLint strict type-checked (@eslint.config.js)
- `npm run lint:all` – ESLint + em-dash check on docs (`scripts/check-no-em-dash.mjs`)
- `npm run format` – Prettier with Astro + Tailwind plugins
- `npm test` – Vitest (unit + integration when local Supabase is up; see @tests/README.md)
- `npm run test:ci` – same entry point as CI (`scripts/ci-supabase-test.sh`; requires `.env.test` + `supabase start`)

Pre-commit: husky + lint-staged (@package.json) – ESLint on `*.{ts,tsx,astro}`, Prettier on `*.{json,css,md}`. Pre-push: full test gate when `.env.test` exists (`.husky/pre-push`).

## Coding Style

TypeScript strict (Astro config). ESLint: `@typescript-eslint/strictTypeChecked`, React hooks, jsx-a11y (@eslint.config.js). Prefix intentionally unused vars with `_`. In user-facing copy and docs use **en dash** (U+2013), not em dash (U+2014) – enforced by ESLint rule `bassmap/no-em-dash` in `src/` and `tests/`, plus `node scripts/check-no-em-dash.mjs` for Markdown and active `context/` docs (fast; skips `context/archive` and skill templates).

## Commit & Pull Request Guidelines

Commits use descriptive sentences (e.g. `Initial scaffold: BassMap PL from 10x-astro-starter.`). Before PR to `main`, run `npm run lint:all`, `npm run test:ci` (Docker + local Supabase), and `npm run build`. CI: `.github/workflows/ci.yml` – needs `SUPABASE_URL` and `SUPABASE_KEY` as GitHub secrets.

## Architecture

Auth: @src/lib/supabase.ts (cookie SSR client) + @src/middleware.ts. Auth API in `src/pages/api/auth/`. Deploy: `npx wrangler deploy` (@wrangler.jsonc). Supabase local setup: @README.md.

## Roadmap & external backlog

Canonical roadmap: @context/foundation/roadmap.md. Public backlog (issues + board): [GitHub Issues `label:roadmap`](https://github.com/ematrejek/bassmap-pl/issues?q=label%3Aroadmap), index [#6](https://github.com/ematrejek/bassmap-pl/issues/6), project [Bassmap PL Roadmap](https://github.com/users/ematrejek/projects/2) (`gh project item-list 2 --owner ematrejek`).

**Keep both in sync during work** – not only at plan/archive time:

1. When picking up a slice/foundation (`/10x-plan`, `/10x-implement`): move the matching issue to **In Progress** on the project board; link the PR to the issue (`Closes #N` or `Refs #N`).
2. When status changes in `roadmap.md` (`ready` → `blocked`, unknown resolved, etc.): update the issue body/status field on the board the same session.
3. When a change archives (`/10x-archive`): flip `Status` in `roadmap.md` to `done`, **close** the GitHub issue, move the board item to **Done**.
4. Map `roadmap.md` status → board: `ready`/`proposed` → Todo; in active plan/implement → In Progress; `blocked` → keep open, ensure **Blocked by** links are current; `done` → Done + closed issue.
5. **Legal pages (UGC slices):** when archiving a slice that collects or publishes user content, update legal copy in the **same session** – @src/pages/privacy-policy.astro, @src/pages/terms.astro, and `LEGAL_UPDATED_AT` in @src/lib/legal/paths.ts. Applies at minimum to: `fan-account-zone` (S-12), `event-content-copyright` (S-17), `change-suggestions` (S-14), `event-comments` (S-15), `account-deletion` (S-16). Add or adjust sections for new processing purposes (what data, why, retention, user rights). S-11 already shipped base documents; Partia II extends them per feature.

Use `gh` (needs `project` scope): `gh project item-edit`, `gh issue close`, `gh issue comment`. Match tickets by **Change ID** or Roadmap ID table in `## Backlog Handoff`.

**Public homepage roadmap:** fan-facing “On the roadmap” list lives in @src/data/public-roadmap.ts. When adding, starting, or finishing a user-visible slice, update that file in the **same session** (add upcoming items; remove shipped ones). Keep copy short and in English.

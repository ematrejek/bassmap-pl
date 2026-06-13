---
project: BassMap PL
assessed_at: 2026-06-12T00:00:00Z
agent_readiness: ready
context_type: brownfield
stack_components:
  language: TypeScript (strict)
  framework: Astro 6 SSR + React 19 islands
  build_tool: Vite 7 (via Astro)
  test_runner: Vitest 3
  package_manager: npm
  ci_provider: GitHub Actions
  deployment_target: Cloudflare Workers (@astrojs/cloudflare)
gates_passed: 9
gates_failed: 0
---

## Stack Components

**Language — TypeScript 5.9 (strict).** `tsconfig.json` extends `astro/tsconfigs/strict`. ESLint uses `typescript-eslint` with `strictTypeChecked` and `stylisticTypeChecked` presets (`eslint.config.js`). API boundaries validate input with Zod (e.g. `src/pages/api/auth/signin.ts`).

**Framework — Astro 6.3 (SSR) + React 19 islands.** Full server-side rendering (`output: "server"` in `astro.config.mjs`). React is used only where interactivity is required via `@astrojs/react`. File-based routing under `src/pages/`; API routes under `src/pages/api/` with `const prerender = false`. Auth middleware in `src/middleware.ts`. UI primitives from shadcn/ui (`src/components/ui/`, "new-york" variant). Backend auth/data via Supabase (`@supabase/ssr`, `@supabase/supabase-js`).

**Build tool — Vite 7 (bundled with Astro).** Tailwind CSS 4 integrated via `@tailwindcss/vite`. Cloudflare adapter (`@astrojs/cloudflare`) produces a Workers-compatible SSR bundle. Env secrets declared in `astro.config.mjs` `env.schema` (`SUPABASE_URL`, `SUPABASE_KEY`).

**Test runner — Vitest 3.2.** Configured in `vitest.config.ts` with `tests/**/*.test.ts`, Node environment, path alias `@/*`, and serial execution (`fileParallelism: false`). CI runs `npm run test:ci` via `scripts/ci-supabase-test.sh` with local Supabase. 13 test files across unit, integration, and smoke suites.

**Package manager — npm.** Lockfile: `package-lock.json`. Node.js v22.14.0 (`.nvmrc`).

**CI/CD — GitHub Actions.** `.github/workflows/ci.yml` runs lint, build, and Supabase-backed tests on push/PR to `main`. `.github/workflows/deploy.yml` handles production deployment.

**Deployment — Cloudflare Workers.** `wrangler.jsonc` targets `@astrojs/cloudflare/entrypoints/server` with `nodejs_compat`. Deploy via `npx wrangler deploy` or `npm run deploy`.

**Instruction files — CLAUDE.md, AGENTS.md.** Both document architecture, auth flow, conventions, roadmap sync, and coding rules. Pre-commit hooks via husky + lint-staged.

## Quality Gate Assessment

| Component   | Typed | Convention | Training Data | Documented | Verdict |
|-------------|-------|------------|---------------|------------|---------|
| Language    | ✓     | —          | —             | —          | pass    |
| Framework   | —     | ✓          | ✓             | ✓          | pass    |
| Build tool  | —     | ✓          | ✓             | ✓          | pass    |
| Test runner | —     | —          | ✓             | ✓          | pass    |

Legend: ✓ = pass, ✗ = fail, ~ = partial, — = not applicable

### Gate Details

**Language — Typed: pass**

- Evidence: `tsconfig.json` line 2 — `"extends": "astro/tsconfigs/strict"`.
- Evidence: `eslint.config.js` lines 14–15 — `tseslint.configs.strictTypeChecked` enabled project-wide.
- Evidence: `typescript` ^5.9.3 in `package.json` devDependencies; `@astrojs/check` for Astro type-checking.

**Framework (Astro + React) — Convention: pass**

- Evidence: Astro file-based routing — pages in `src/pages/`, layouts in `src/layouts/`, components in `src/components/`.
- Evidence: `CLAUDE.md` and `AGENTS.md` document island pattern (Astro for static, React for interactivity), middleware, API route conventions, and path alias `@/*`.
- Evidence: `src/middleware.ts` + `PROTECTED_ROUTES` pattern for auth guards.

**Framework — Popular in training data: pass**

- Astro and React are mainstream choices within the JavaScript/TypeScript ecosystem. Agents have extensive exposure to both in pre-training corpora.
- Astro 6 is a recent major release; idioms remain consistent with Astro 4/5 (file routing, islands, integrations).

**Framework — Well-documented: pass**

- Official docs: [docs.astro.build](https://docs.astro.build) (version-pinned guides).
- React 19 docs at [react.dev](https://react.dev).
- Cloudflare adapter docs at [docs.astro.build/en/guides/integrations-guide/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/).

**Build tool (Vite via Astro) — Convention: pass**

- Vite config is owned by Astro (`astro.config.mjs`); project adds Tailwind plugin only. No ad-hoc multi-entry setup.

**Build tool — Popular in training data: pass**

- Vite is the dominant build tool in modern JS front-end projects; widely represented in training data.

**Build tool — Well-documented: pass**

- [vite.dev](https://vite.dev) official docs; Astro documents Vite integration patterns.

**Test runner (Vitest) — Popular in training data: pass**

- Vitest is the de-facto test runner for Vite-based projects; `describe`/`it`/`expect` API matches Jest idioms agents know well.

**Test runner — Well-documented: pass**

- [vitest.dev](https://vitest.dev) official docs with configuration reference matching `vitest.config.ts` patterns in this repo.

## Gaps & Compensation

No quality-gate failures detected. The stack passes all four agent-friendly criteria for every assessed component.

**Watch items (informational, not gate failures):**

1. **Astro 6 + Cloudflare SSR** — This is a cutting-edge deployment combo. Astro 6 SSR on Workers is newer than classic static Astro. Agents may occasionally hallucinate Astro 4 static-site patterns. **Already compensated** by `CLAUDE.md` / `AGENTS.md` stating `output: "server"`, adapter config, and `prerender = false` on API routes.

2. **Supabase local test dependency** — Integration tests require Docker + `supabase start`. This is an operational friction point for agents running tests, not a stack-quality gate failure. **Already compensated** by `test:ci` script and CI workflow documentation in `AGENTS.md`.

3. **No Playwright/E2E runner** — Browser-level tests are not configured. Vitest covers unit/integration only. Acceptable for current MVP scope; add E2E later if needed.

### Recommended Instruction File Additions

No mandatory additions required — existing `CLAUDE.md` and `AGENTS.md` already cover the critical conventions. Optional hardening if agent correction cycles increase:

```markdown
## Astro 6 SSR on Cloudflare — version pin

- Framework: Astro ^6.3, adapter `@astrojs/cloudflare` ^13.5.
- All pages are SSR by default (`output: "server"`). Do NOT add `export const prerender = true` unless explicitly planning a static page.
- API routes MUST export `const prerender = false`.
- Reference: https://docs.astro.build/en/guides/server-side-rendering/
```

```markdown
## Supabase test prerequisites

- Unit tests: `npm run test` (no Docker).
- Integration tests: `npm run test:ci` requires Docker and local Supabase (`npx supabase start`).
- Test env vars: copy `.env.test` pattern; CI exports via `supabase status -o env`.
```

## Summary

**Verdict: ready.** BassMap PL's stack is agent-friendly out of the box. TypeScript strict mode, convention-based Astro routing, mainstream React/Vite/Vitest tooling, and comprehensive instruction files (`CLAUDE.md`, `AGENTS.md`) give agents strong structural signals for navigation and code generation.

**Key strengths:**

- Strict typing end-to-end (TS strict + ESLint strictTypeChecked + Zod at API boundaries).
- Clear folder conventions with documented island architecture.
- Vitest test suite with unit and Supabase integration coverage.
- CI enforces lint + build + tests on every PR.
- Instruction files already document auth, deployment, migrations, and roadmap sync.

**Key gaps:** None at the quality-gate level. Operational watch items: Astro 6 SSR novelty and Docker-dependent integration tests.

**Recommended next step:** `/10x-health-check` — dependency audit, security scan, CI/CD evaluation, and missing-configuration analysis focused on the watch items above.

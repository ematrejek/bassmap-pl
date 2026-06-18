---
project: BassMap PL
checked_at: 2026-06-18T09:30:00Z
health_status: healthy
context_type: brownfield
language_family: js
stack_assessment_available: true
checks_run:
  - lockfile
  - dependency_audit
  - outdated_deps
  - test_runner
  - ci_cd
  - configuration
  - local_verification
audit_findings:
  critical: 0
  high: 5
  moderate: 9
  low: 3
test_runner_detected: true
ci_provider: GitHub Actions
recommended_fixes: 0
---

## Dependency Health

### Lockfile

```
Status: present (package-lock.json)
Package manager: npm
Node.js: v22.14.0 (.nvmrc)
```

### Security Audit

```
Tool: npm audit
Summary: 0 CRITICAL, 5 HIGH, 9 MODERATE, 3 LOW (17 total)
Direct vs transitive: mostly transitive dev tooling (wrangler, vite, esbuild, ws, miniflare)
```

#### HIGH findings (advisory – CI passes with `--audit-level=critical`)

- **astro** – XSS / SSRF advisories in older ranges; project uses ^6.3.1. Monitor Astro releases.
- **vite** – Windows path bypass / launch-editor issues in 7.0.0–7.3.3; override pins ^7.3.2.
- **ws** – memory disclosure / DoS via wrangler and supabase realtime chains.
- **esbuild** – dev-server file read on Windows via wrangler/miniflare.
- **@astrojs/cloudflare** – depends on vulnerable wrangler (dev-time only).

MODERATE/LOW: js-yaml, tar (supabase CLI), yaml (@astrojs/check chain), @babel/core – dev tooling.

**CI policy:** `npm audit --audit-level=critical` in both `ci.yml` and `deploy.yml` – 0 critical, pipeline green.

### Outdated Dependencies

```
Packages with major version gaps: not enumerated this run (informational).
```

Optional housekeeping when convenient: `npm update wrangler astro vite`. Do not run `npm audit fix --force` without review – it proposes breaking downgrades.

## Test Suite

```
Test runner: Vitest 3.2.6
Tests found: 28 files, 147 tests
Test execution: passing (verified locally 2026-06-18)
```

```
Configuration: vitest.config.ts
Framework: Vitest 3.2.6, Node environment
Include: tests/**/*.test.ts
Alias: @/* → src/*
Serial execution: fileParallelism: false (integration safety)
Env: loadEnv from Vite (reads .env.test / .env)
```

**Suites:**

| Layer       | Files | Role                                      |
| ----------- | ----- | ----------------------------------------- |
| smoke       | 1     | Vitest wiring sanity check                |
| unit        | 17    | Schemas, mappers, API handlers (mocked)   |
| integration | 10    | Supabase RLS + service paths (local only) |

**CI runner:** `scripts/ci-supabase-test.sh` → `npm test` with env from `supabase status`, fails if integration suites skip.

**Local requirement:** Docker + `supabase start` + `.env.test` (or exported env vars). Integration tests refuse production URLs.

**npm scripts:**

- `npm test` – full suite (unit + integration when Supabase up)
- `npm run test:ci` – same as CI (bash script)
- `npm run test:watch` – Vitest watch mode

**Test plan alignment:** `context/foundation/test-plan.md` phases 1–4 marked **done**. New tests since plan (2026-06-12): change-suggestions RLS, fan-cover API, event-similarity, fan-check-similar API, and expanded schemas.

## CI/CD

```
Provider: GitHub Actions
Configuration: .github/workflows/ci.yml, .github/workflows/deploy.yml
```

| Stage      | CI (`ci.yml`) | Deploy (`deploy.yml`) | Notes                                      |
| ---------- | ------------- | --------------------- | ------------------------------------------ |
| Lint       | ✓             | ✗                     | `npm run lint:all` (ESLint + em-dash docs) |
| Type check | ✓             | ✓                     | `npx astro check`                          |
| Test       | ✓             | ✓                     | Supabase + `ci-supabase-test.sh`           |
| Build      | ✓             | ✓                     | `npm run build` with secrets               |
| Security   | ✓             | ✓                     | `npm audit --audit-level=critical`         |
| Deploy     | –             | ✓                     | Cloudflare wrangler-action                 |

**Recent runs (2026-06-18):** CI + Deploy **success** on `chore(archive): close duplicate-event-detection`.

**Recent failures (2026-06-17, now fixed):**

1. ESLint / docs lint – em dash in `impl-review.md` (fixed in follow-up commit).
2. Type error in test mock – `SimilarEventCandidate` missing `status` field (fixed).

Pattern: failures were real code/style issues, not flaky infrastructure.

## Configuration

All expected configuration files present:

| File              | Status  |
| ----------------- | ------- |
| package-lock.json | ✓       |
| tsconfig.json     | ✓ strict (astro/tsconfigs/strict) |
| eslint.config.js  | ✓ strictTypeChecked |
| vitest.config.ts  | ✓       |
| .gitignore        | ✓       |
| .env.example      | ✓       |
| .editorconfig     | ✓       |
| CLAUDE.md         | ✓       |
| AGENTS.md         | ✓       |
| husky pre-commit  | ✓ lint-staged (lint + prettier on staged files) |

### Low severity

- ~~**Untracked file in repo root**~~ – moved to `context/legal/open-terms-saas-regulamin-v1.2.md` (2026-06-18).
- ~~**stack-assessment.md stale test count**~~ – updated to 28 files / 147 tests (2026-06-18).
- ~~**test-plan.md last updated**~~ – refreshed with post-rollout feature test catalog (2026-06-18).

## Stack Assessment Cross-Reference

```
Stack assessment: context/foundation/stack-assessment.md
Agent readiness (from stack-assess): ready
```

| Quality Gate Gap | Health-Check Finding                         | Status    |
| ---------------- | -------------------------------------------- | --------- |
| All gates pass   | TypeScript strict + ESLint strictTypeChecked | Confirmed |
| Test runner pass | 147 tests passing, CI wired                 | Confirmed |
| CI documented    | Full pipeline green on main                  | Confirmed |

## Local Verification (2026-06-18)

| Check              | Result | Notes                                              |
| ------------------ | ------ | -------------------------------------------------- |
| `npm test`         | ✓      | 28 files, 147 tests, ~106s                         |
| `npm run lint:all` | ✓      | ESLint + em-dash docs                              |
| `npm run build`    | ✓      | SSR Cloudflare bundle                              |
| `npx astro check`  | ✗ local only | EADDRINUSE port 9230 – dev server already running; not a code defect |
| GitHub CI          | ✓      | Latest main push green                             |
| GitHub Deploy      | ✓      | Latest main push green                             |

## Recommended Fixes

### Fix before agent work (Category A)

_All Category A items addressed 2026-06-18._

#### 1. Pre-commit did not run tests – **done**

Added `.husky/pre-push`: runs `scripts/ci-supabase-test.sh` when `.env.test` exists. Documented in `AGENTS.md`, `README.md`, `tests/README.md`.

#### 2. Stale documentation – **done**

Updated `stack-assessment.md`, `test-plan.md`, `AGENTS.md` (removed incorrect "No test runner" line).

### Addressed in upcoming lessons (Category B)

No Category B gaps – CI, deploy, AGENTS.md, and test infrastructure are already in place.

## Summary

**Health status: healthy**

BassMap PL is in good operational shape at this checkpoint. The test suite is well configured (Vitest + local Supabase integration), all 147 tests pass locally, and GitHub Actions CI + Deploy are green on the latest `main` commit. Lint, type-check, build, and security audit gates are wired correctly. Recent CI failures were legitimate code issues (em-dash lint rule, incomplete test mock) and were fixed promptly – not infrastructure flakiness.

Remaining items are housekeeping: optional doc refresh, deciding what to do with the untracked legal markdown file, and remembering that pre-commit hooks run lint only (not the full test suite).

**Next step:** Safe to continue Partia II feature work. Before each push to `main`, run `npm run lint:all` and `npm run test:ci` locally when Supabase is up.

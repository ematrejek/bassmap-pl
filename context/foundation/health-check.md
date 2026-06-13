---
project: BassMap PL
checked_at: 2026-06-12T12:30:00Z
health_status: needs-attention
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
audit_findings:
  critical: 0
  high: 1
  moderate: 9
  low: 0
test_runner_detected: true
ci_provider: GitHub Actions
recommended_fixes: 5
---

## Dependency Health

### Lockfile

```
Status: present (package-lock.json)
Package manager: npm
```

### Security Audit

```
Tool: npm audit --json
Summary: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW
Direct vs transitive: 2 direct (@astrojs/check moderate, wrangler moderate), 8 transitive
```

#### HIGH findings

- **devalue** 5.8.0 (transitive via `astro@6.3.1`, `@astrojs/react@5.0.4`) — GHSA-77vg-94rm-hx3p: DoS via sparse array deserialization (CVSS 7.5). Fix: update parent packages when patched (`npm update astro @astrojs/react`) or run `npm audit fix` after upstream release.

#### MODERATE findings (summary)

- **wrangler** 4.90.0 (direct) — via `miniflare` → `ws` (GHSA-58qx-3vcg-4xpx, uninitialized memory disclosure). Fix: `npm update wrangler` (latest 4.100.0 has fixAvailable).
- **@astrojs/check** 0.9.8 (direct, dev-only) — via `@astrojs/language-server` → `volar-service-yaml` → `yaml-language-server` → `yaml` (stack overflow in nested YAML). Dev tooling only; no production runtime impact.
- **@cloudflare/vite-plugin**, **miniflare**, **ws** (transitive) — same `ws` advisory chain via Cloudflare dev tooling.
- **yaml**, **yaml-language-server**, **volar-service-yaml** (transitive) — dev-time YAML language server chain.

### Outdated Dependencies

```
Packages with major version gaps (2+ behind): 0
Packages with 1 major version behind: 4
```

Noteworthy single-major gaps (informational — no urgent action unless upgrading deliberately):

- **typescript**: 5.9.3 → 6.0.3 (1 major behind)
- **eslint** / **@eslint/js**: 9.39.4 → 10.x (1 major behind)
- **vitest**: 3.2.6 → 4.1.8 (1 major behind)
- **zod**: 3.25.76 → 4.4.3 (1 major behind)

Minor/patch updates available for astro (6.3.1 → 6.4.6), wrangler (4.90.0 → 4.100.0), supabase CLI, tailwindcss, and others. Run `npm update` for safe minor bumps.

## Test Suite

```
Test runner: Vitest 3.2.6
Tests found: 35 tests across 12 files
Test execution: passing
```

```
Configuration: vitest.config.ts
Framework: Vitest 3.2.6, Node environment, tests/**/*.test.ts
```

All 35 tests passed locally in 19.6s (12 unit/smoke + integration suites with Supabase). Integration tests require local Supabase (Docker); unit tests run without Docker via `npm run test`.

## CI/CD

```
Provider: GitHub Actions
Configuration: .github/workflows/ci.yml, .github/workflows/deploy.yml
```

| Stage      | Status | Notes                                              |
|------------|--------|----------------------------------------------------|
| Lint       | ✓      | `npm run lint` (ESLint strictTypeChecked)          |
| Test       | ✓      | `bash scripts/ci-supabase-test.sh` (Vitest + Supabase) |
| Build      | ✓      | `npm run build` (Astro SSR + Cloudflare adapter)   |
| Type check | ~      | Partial — ESLint type-checked rules, no `astro check` or `tsc` step |
| Security   | ✗      | No `npm audit`, Dependabot, or CodeQL configured   |

Deploy workflow (`.github/workflows/deploy.yml`) mirrors CI checks then deploys to Cloudflare Workers via `cloudflare/wrangler-action@v3`.

## Configuration

### High severity

None detected.

### Medium severity

- **CI type-check step** — No explicit `npx astro check` or `tsc --noEmit` in CI. ESLint `strictTypeChecked` catches many type errors but not all Astro template issues. Fix: add `npx astro check` after `npx astro sync` in `.github/workflows/ci.yml`.

### Low severity

- **`.editorconfig`** — Missing. Editors may use inconsistent indentation without it. Fix: add a minimal `.editorconfig` (2-space indent, UTF-8, final newline).
- **Dependabot** — No `.github/dependabot.yml`. Security advisories are discovered manually. Fix: add Dependabot config for npm ecosystem (weekly, grouped).

### Present and healthy

- `.prettierrc.json` — formatter configured
- `eslint.config.js` — strict type-checked linting
- `tsconfig.json` — extends `astro/tsconfigs/strict`
- `.gitignore` — present
- `.env.example` — documents required env vars
- `CLAUDE.md`, `AGENTS.md` — agent instruction files with architecture, auth, conventions, roadmap sync

## Stack Assessment Cross-Reference

```
Stack assessment: context/foundation/stack-assessment.md
Agent readiness (from stack-assess): ready
```

No quality-gate failures in stack-assessment. Watch items cross-referenced with health-check findings:

| Watch Item                         | Health-Check Finding                                    | Status     |
|------------------------------------|---------------------------------------------------------|------------|
| Astro 6 SSR novelty                | `AGENTS.md` / `CLAUDE.md` document SSR + adapter rules  | Mitigated  |
| Supabase Docker test dependency    | 35 tests pass locally; CI runs Supabase-backed tests    | Mitigated  |
| No Playwright/E2E runner           | Still no browser-level E2E tests                        | Reinforced |

Compensation entries recommended in stack-assessment (Astro 6 version pin, Supabase test prerequisites) are optional — core rules already exist in instruction files.

## Recommended Fixes

### Fix before agent work (Category A)

### 1. HIGH vulnerability in devalue (transitive)

**Impact**: `devalue` is used by Astro for serialization. A DoS advisory (CVSS 7.5) exists in the installed range. While exploitation requires crafted input and Astro may sanitize boundaries, patching reduces risk before agent-assisted changes touch serialization paths.

**Severity**: high
**Effort**: quick (< 5 min) once upstream fix is available
**Fix**:

```bash
npm audit fix
# If unresolved, update Astro ecosystem:
npm update astro @astrojs/react @astrojs/cloudflare
npm audit
```

Monitor [GHSA-77vg-94rm-hx3p](https://github.com/advisories/GHSA-77vg-94rm-hx3p) for patched `devalue` release pulled by Astro.

### 2. MODERATE vulnerability in wrangler (direct)

**Impact**: `wrangler` is a direct devDependency used for local dev and deploy. The `ws` advisory affects dev tooling, not production Workers runtime, but keeping wrangler current reduces local dev risk.

**Severity**: medium
**Effort**: quick (< 5 min)
**Fix**:

```bash
npm update wrangler
npm audit
```

### 3. No security scan in CI

**Impact**: Agents and contributors can merge dependency vulnerabilities without CI catching them. Automated audit on PRs gives early warning.

**Severity**: medium
**Effort**: moderate (15–30 min)
**Fix**: Add to `.github/workflows/ci.yml` after `npm ci`:

```yaml
- name: Security audit
  run: npm audit --audit-level=high
```

Also add `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      production:
        dependency-type: production
```

### 4. No explicit type-check in CI

**Impact**: Agents may introduce type errors in `.astro` files that ESLint alone won't catch. An explicit `astro check` step closes this gap.

**Severity**: medium
**Effort**: quick (< 5 min)
**Fix**: Add to `.github/workflows/ci.yml` after `npx astro sync`:

```yaml
- run: npx astro check
```

### 5. Missing .editorconfig

**Impact**: Low agent impact — Prettier handles formatting on commit. Minor consistency benefit across editors.

**Severity**: low
**Effort**: quick (< 5 min)
**Fix**: Create `.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

### Addressed in upcoming lessons (Category B)

No Category B gaps — the project already has CI/CD (GitHub Actions), deployment (Cloudflare Workers via wrangler-action), and agent instruction files (`CLAUDE.md`, `AGENTS.md`). These are mature infrastructure items typically covered in later course lessons but already implemented here.

**Optional future hardening** (not blocking agent work):

- **Browser E2E tests (Playwright)** — Stack-assessment noted no E2E runner. Add when fan-facing flows need regression coverage beyond Vitest integration tests.
- **Major version upgrades** (TypeScript 6, ESLint 10, Vitest 4, Zod 4) — Plan as dedicated upgrade slices, not ad-hoc bumps. Each has breaking changes.

## Summary

Health status: **needs-attention**

BassMap PL is in strong operational shape: lockfile pinned, 35 passing Vitest tests, GitHub Actions CI with lint + test + build, Cloudflare deploy pipeline, strict TypeScript, and comprehensive agent instruction files. The primary gap is dependency security — one HIGH advisory (`devalue` via Astro) and nine MODERATE advisories (mostly dev-tooling chains in wrangler and `@astrojs/check`). No critical vulnerabilities, no missing test runner, and no high-severity configuration gaps.

Address the HIGH `devalue` advisory and update `wrangler`, then add `npm audit` and `astro check` to CI for sustained health. After these fixes, the project is well-positioned for agent-assisted development.

Next step: apply Category A fixes (especially security), then proceed to agent onboarding — both greenfield and brownfield paths converge with equivalent context artifacts.

# Quality-gates wiring — Implementation Plan

## Overview

Rollout Phase 4 from `context/foundation/test-plan.md`: wire `npm test` into GitHub Actions so unit and integration suites run on every PR and push to `main`, alongside existing lint and build gates. Integration tests must execute against **local Supabase in CI** (not production secrets); local developers without Docker keep the current skip-with-warning behavior.

## Current State Analysis

- **Vitest bootstrap** shipped in Phase 1: `vitest.config.ts`, `npm test`, 12 test files (6 unit/smoke, 6 integration).
- **CI today** (`.github/workflows/ci.yml`): `npm ci` → `astro sync` → `lint` → `build` with production `SUPABASE_URL` / `SUPABASE_KEY` secrets. **No `npm test`.**
- **Deploy today** (`.github/workflows/deploy.yml`): same build steps, then Wrangler deploy. Runs **in parallel** with CI on push to `main`; a failing CI job does not block deploy unless tests are added here too.
- **Integration gate** (`tests/helpers/supabase.ts`): `isSupabaseConfigured()` requires all three vars and a localhost URL; `describe.skipIf(!isSupabaseConfigured())` + `logSkipIfNotConfigured()` exits 0 when env is missing — intentional for local DX until Phase 4.
- **Test-plan §5** lists unit+integration as `required after §3 Phase 1`; Phases 1–3 are done. §6.2/§6.4 still say integration may skip in CI until Phase 4.

### Key Discoveries:

- `vitest.config.ts:10` — `fileParallelism: false` already prevents integration races on one DB.
- `vitest.config.ts:9` — `loadEnv(mode, process.cwd(), "")` loads `.env.test` in test mode; CI can write `.env.test` or export to step env before `npm test`.
- `supabase/config.toml:7–10` — API on port `54321`; matches `.env.test.example`.
- Production GitHub secrets used for **build** must not be reused for integration tests — harness refuses non-localhost URLs (`tests/helpers/supabase.ts:30–37`).

## Desired End State

1. Every PR and push to `main` runs `npm test` in CI with local Supabase; integration suites **execute** (not skip); job fails on test failure.
2. `deploy.yml` runs the same test block **before** `npm run build` so production deploy cannot proceed on red tests even without branch protection.
3. Local `npm test` without Docker still passes (unit + smoke; integration skipped with warning).
4. `context/foundation/test-plan.md` §5 and §6.2/§6.4 CI copy reflects the new contract; contributor docs (`tests/README.md`, `README.md` §CI) are accurate.
5. Manual verification: open a PR, confirm Actions log shows Supabase start, ~33 tests passing, integration suites not skipped.

## What We're NOT Doing

- E2E / Playwright in CI (test-plan §5 — planned, not this phase).
- Pre-commit `npm test` hook (integration needs Docker; lint-staged stays as-is).
- Cloud/production Supabase for integration tests in CI.
- New test cases — only wiring existing suites.
- Branch protection settings in GitHub UI (document as optional hardening, not code change).
- Splitting `npm test` into `test:unit` / `test:integration` scripts (keep single `npm test` entry point).

## Implementation Approach

Add a **shared shell script** (`scripts/ci-supabase-test.sh`) invoked by both workflows to avoid YAML drift. Extend the existing single `ci` job: fast checks first, then Supabase, then tests, then production build. Mirror the test block in `deploy.yml` before build.

**CI step order (ci.yml):**

1. `npm ci` + `npx astro sync`
2. `npm run lint`
3. `supabase/setup-cli@v2` + `supabase start` (exclude non-essential services)
4. Export local keys → run `scripts/ci-supabase-test.sh` (wraps `npm test` + sanity check that integration ran)
5. `npm run build` with repository secrets (unchanged)

**Rationale:** Lint fails in seconds; tests fail before the slower Astro production build; deploy workflow gets the same Supabase+test gate without depending on CI job completion.

## Critical Implementation Details

CI must export **`SUPABASE_SERVICE_ROLE_KEY`** in addition to `SUPABASE_URL` and `SUPABASE_KEY` — integration fixtures and admin harness require service role (`tests/helpers/supabase.ts:4–8`). Use `supabase status -o env` with `--override-name` mappings; do not point test env at `${{ secrets.SUPABASE_URL }}` (production).

Set `timeout-minutes: 20` on jobs that start Supabase — cold Docker pull + migrations can exceed default 6 minutes.

## Phase 1: Shared CI test script

### Overview

Create one reusable script both workflows call after Supabase is running and env is exported.

### Changes Required:

#### 1. CI Supabase test runner

**File:** `scripts/ci-supabase-test.sh`

**Intent:** Single entry point for CI test execution; verifies integration was not silently skipped before running Vitest.

**Contract:** Bash script, executable (`chmod +x`). Accepts no args. Preconditions: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set and localhost. Runs `npm test`. After Vitest, greps stdout/stderr for the skip warning string `"Integration tests skipped"` — if found, exit 1 (CI must not pass with all integration suites skipped). On success exit 0.

#### 2. Package script hook (optional thin wrapper)

**File:** `package.json`

**Intent:** Document CI entry for contributors; optional `test:ci` alias calling the script — only if it improves clarity. **Contract:** If added, `"test:ci": "bash scripts/ci-supabase-test.sh"`; workflows may call script directly.

### Success Criteria:

#### Automated Verification:

- Script is valid bash: `bash -n scripts/ci-supabase-test.sh`
- With local Supabase + `.env.test`: `bash scripts/ci-supabase-test.sh` exits 0
- Without env vars: script or `npm test` path still allows local skip (script not used locally by default)

#### Manual Verification:

- Script failure message is clear when integration skipped in CI context

**Implementation Note:** After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: CI workflow — `ci.yml`

### Overview

Add Supabase CLI setup, local stack start, env export, and `npm test` to the existing CI job.

### Changes Required:

#### 1. GitHub Actions CI job

**File:** `.github/workflows/ci.yml`

**Intent:** Enforce test gate on every PR and push to `main` in the same job as lint/build.

**Contract:**

- Job `timeout-minutes: 20`
- After `npm run lint`, before `npm run build`:
  - `uses: supabase/setup-cli@v2` with `version` matching `package.json` devDependency (`^2.23.4` / lockfile resolved version)
  - `run: supabase start -x studio,imgproxy,edge-runtime,logflare` (faster start; Auth + DB + API remain)
  - Export env from `supabase status -o env` with overrides: `api.url` → `SUPABASE_URL`, `anon.key` → `SUPABASE_KEY`, `service_role.key` → `SUPABASE_SERVICE_ROLE_KEY` (append to `$GITHUB_ENV` or write `.env.test` in repo root)
  - `run: bash scripts/ci-supabase-test.sh`
- Keep existing `npm run build` step with `${{ secrets.SUPABASE_URL }}` and `${{ secrets.SUPABASE_KEY }}` unchanged after tests

#### 2. Workflow permissions

**File:** `.github/workflows/ci.yml`

**Intent:** Ensure Ubuntu runner can use Docker (default on `ubuntu-latest` — no extra config unless org restricts).

**Contract:** No change expected; document in PR test plan if Docker service is required explicitly.

### Success Criteria:

#### Automated Verification:

- YAML valid (push branch or `actionlint` if available locally)
- On PR: GitHub Actions job completes with `npm test` step green
- Action log shows `supabase start` and Vitest summary with integration suites executed (not "skipped")

#### Manual Verification:

- Introduce a deliberate test failure on a throwaway branch — CI job fails
- Revert — CI green again

**Implementation Note:** After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Deploy workflow gate — `deploy.yml`

### Overview

Duplicate the Supabase + test block in the deploy workflow so production deploy cannot succeed when tests fail, even if CI and deploy run in parallel.

### Changes Required:

#### 1. Deploy workflow test gate

**File:** `.github/workflows/deploy.yml`

**Intent:** Run the same `scripts/ci-supabase-test.sh` after `npm ci` + `astro sync`, **before** `npm run build`.

**Contract:** Same Supabase setup/export steps as Phase 2 (consider YAML anchor or reusable workflow only if duplication exceeds ~15 lines — shared script is the DRY layer). Job `timeout-minutes: 20`. Build and Wrangler deploy steps unchanged, still after tests pass.

### Success Criteria:

#### Automated Verification:

- Push to `main` with green tests: deploy workflow log shows test step before build
- Deploy still succeeds when tests pass

#### Manual Verification:

- On throwaway branch merged to main (or workflow_dispatch if added): failed test blocks deploy build step

**Implementation Note:** After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Documentation and test-plan sync

### Overview

Update canonical test-plan and contributor docs so CI contract matches implementation; mark rollout Phase 4 complete in test-plan §3.

### Changes Required:

#### 1. Test-plan quality gates and cookbook

**File:** `context/foundation/test-plan.md`

**Intent:** Reflect that CI now hard-fails on tests; local skip remains documented.

**Contract:**

- §5 table: confirm unit+integration row says `required` (not `required after Phase 1` qualified as pending)
- §6.2 **CI** paragraph: replace "skip + exit 0 when env missing" for CI with "CI exports local Supabase env; integration must run; local without Docker still skips"
- §6.4 **CI** paragraph: same CI hard-fail note; keep `fileParallelism: false` mention
- §3 Phase 4 row: `Status` → `done` when implementation merges
- §6.6: add Phase 4 bullet — `scripts/ci-supabase-test.sh`, both workflows, skip contract
- §8 Freshness Ledger: bump dates

#### 2. Tests README

**File:** `tests/README.md`

**Intent:** Tell contributors CI always runs full suite; local skip is intentional.

**Contract:** Short § "CI" — GitHub Actions starts local Supabase; link to `scripts/ci-supabase-test.sh` and `.github/workflows/ci.yml`.

#### 3. Root README CI section

**File:** `README.md`

**Intent:** Public-facing CI description matches reality.

**Contract:** §CI — add `npm test` (Vitest + local Supabase in Actions) alongside lint + build.

#### 4. Change identity

**File:** `context/changes/testing-quality-gates-wiring/change.md`

**Intent:** Mark planning complete; note decisions.

**Contract:** `status: planned` during plan; implementer sets `in progress` at `/10x-implement`. Add bullet list of user decisions (single job, both workflows, local skip kept, no pre-commit).

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on doc-only edits
- `npm run build` passes

#### Manual Verification:

- New contributor can read `tests/README.md` + test-plan §6.2 and understand local vs CI behavior
- test-plan §3 Phase 4 status updated when change archives

**Implementation Note:** After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No new unit tests required — existing `tests/unit/*` and `tests/smoke/*` run in CI automatically.

### Integration Tests:

- All six `tests/integration/*.test.ts` suites must execute in CI (not `describe.skip`).
- Sanity: CI script rejects skip-warning output.

### Manual Testing Steps:

1. Local without `.env.test`: `npm test` — unit/smoke pass, integration skipped, exit 0, warning printed once.
2. Local with `npx supabase start` + `.env.test`: `npm test` — all ~33 tests pass.
3. Open PR — CI job green; log shows Supabase containers started.
4. Temporarily break one assertion — CI and (on main) deploy test step fail.
5. Confirm `npm run build` in CI still uses production secrets, not local test keys.

## Performance Considerations

- `supabase start -x studio,imgproxy,edge-runtime,logflare` reduces CI time.
- Running tests **before** build avoids wasted build minutes on test failures.
- Duplicate Supabase start on `main` (CI + deploy) trades ~2–4 min for deploy safety — accepted per planning decision.

## Migration Notes

No database migration. CI uses existing `supabase/migrations/` applied by `supabase start`.

## References

- Test plan: `context/foundation/test-plan.md` §3–§6
- Prior phases: `context/archive/2026-06-11-testing-critical-path-fan-read/`, `context/archive/2026-06-11-testing-authorization-data-integrity/`, `context/archive/2026-06-12-testing-location-discovery/`
- Harness: `tests/helpers/supabase.ts`
- Current CI: `.github/workflows/ci.yml`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Shared CI test script

#### Automated

- [x] 1.1 `bash -n scripts/ci-supabase-test.sh` passes — 6b66f5c
- [x] 1.2 With local Supabase + `.env.test`, `bash scripts/ci-supabase-test.sh` exits 0 — 6b66f5c

#### Manual

- [x] 1.3 Skip-detection error message is clear when integration suites do not run in CI context — 6b66f5c

### Phase 2: CI workflow — `ci.yml`

#### Automated

- [ ] 2.1 PR GitHub Actions job completes with `npm test` step green
- [ ] 2.2 Action log shows integration suites executed (not skipped)

#### Manual

- [ ] 2.3 Deliberate test failure on throwaway branch fails CI; revert restores green

### Phase 3: Deploy workflow gate — `deploy.yml`

#### Automated

- [ ] 3.1 Deploy workflow log shows test step before build on push to `main`
- [ ] 3.2 Deploy succeeds when tests pass

#### Manual

- [ ] 3.3 Failed test blocks deploy build step

### Phase 4: Documentation and test-plan sync

#### Automated

- [ ] 4.1 `npm run lint` passes
- [ ] 4.2 `npm run build` passes

#### Manual

- [ ] 4.3 Contributor docs explain local skip vs CI hard-fail
- [ ] 4.4 test-plan §3 Phase 4 marked done when change archives

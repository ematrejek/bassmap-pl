---
change_id: testing-quality-gates-wiring
title: Quality-gates wiring — npm test required in CI
status: impl_reviewed
created: 2026-06-12
updated: 2026-06-12
archived_at: null
---

## Notes

Open a change folder for rollout Phase 4 of context/foundation/test-plan.md: "Quality-gates wiring".
Risks covered: cross-cutting (all risks #1–#7 protected by Phases 1–3). Test types planned: CI gate.
Risk response intent: `npm test` must run in GitHub Actions alongside lint + build so regressions on fan read, auth, location, and validation cannot merge silently; integration suites may skip when Supabase env is absent locally but CI must define the contract for when tests are required vs skipped.

## Planning decisions (2026-06-12)

- Single CI job: lint → Supabase → test → build (`ci.yml`).
- Tests in both `ci.yml` and `deploy.yml` (deploy gate before build).
- Local skip when no Docker/env unchanged; no pre-commit test hook.
- Shared runner: `scripts/ci-supabase-test.sh`.
- Plan: `plan.md` + `plan-brief.md`.

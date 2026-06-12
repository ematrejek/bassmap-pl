---
change_id: testing-authorization-data-integrity
title: Test rollout phase 2 — authorization and data integrity
status: implementing
created: 2026-06-11
updated: 2026-06-11
archived_at: null
---

## Notes

rollout faza 2

Test-plan §3 Phase 2: non-admin cannot mutate events; admin access works; no mass data loss on guarded paths. Risks #3, #4, #5. Reuse Vitest + local Supabase harness from `testing-critical-path-fan-read`.

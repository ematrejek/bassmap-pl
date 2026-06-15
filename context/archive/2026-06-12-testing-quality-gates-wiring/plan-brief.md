# Quality-gates wiring — Plan Brief

> Full plan: `context/changes/testing-quality-gates-wiring/plan.md`

## What & Why

Fazy 1–3 testów są gotowe (Vitest + 33 testy), ale GitHub Actions nadal sprawdza tylko lint i build — regresje w logice listy wydarzeń, autoryzacji i walidacji mogą przejść na `main` bez alarmu. Phase 4 podłącza `npm test` do CI z lokalnym Supabase w Dockerze, żeby każdy PR i deploy były blokowane przy czerwonych testach.

## Starting Point

- `npm test` działa lokalnie; integracja wymaga Dockera i `.env.test`.
- Bez env integracja jest **pomijana** (exit 0) — celowo dla developerów bez Dockera.
- `.github/workflows/ci.yml` i `deploy.yml` nie uruchamiają testów; deploy na `main` startuje równolegle z CI.

## Desired End State

Każdy PR i push do `main` odpala pełny `npm test` w Actions (Supabase lokalny, wszystkie 6 suite'ów integracyjnych). Deploy ma ten sam gate przed buildem. Lokalnie bez Dockera nadal można odpalić szybkie testy jednostkowe. Dokumentacja (test-plan, README) opisuje różnicę local vs CI.

## Key Decisions Made

| Decision      | Choice                                              | Why (1 sentence)                                                      | Source |
| ------------- | --------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| CI job layout | Jeden job: lint → Supabase → test → build           | Prosty YAML, jeden cold start, łatwy debug                            | Plan   |
| Deploy gate   | Testy w `ci.yml` **i** `deploy.yml`                 | Deploy nie poleci przy czerwonych testach nawet bez branch protection | Plan   |
| Lokalny skip  | Zostaje bez zmian                                   | Developer bez Dockera nie jest blokowany; CI zawsze ma env            | Plan   |
| Pre-commit    | Bez `npm test` w husky                              | Integracja wymaga Dockera — za wolne na każdy commit                  | Plan   |
| DRY workflows | `scripts/ci-supabase-test.sh`                       | Ten sam krok w dwóch workflow bez kopiowania logiki                   | Plan   |
| Supabase w CI | `supabase/setup-cli@v2` + `start -x` zbędne serwisy | Oficjalny wzorzec; szybszy start niż pełny stack                      | Plan   |

## Scope

**In scope:** `scripts/ci-supabase-test.sh`, zmiany `ci.yml` + `deploy.yml`, aktualizacja test-plan §5/§6, `tests/README.md`, `README.md` §CI, `change.md`.

**Out of scope:** nowe testy, E2E, pre-commit hook, cloud Supabase w CI, ustawienia branch protection w GitHub UI, skrypt `test:unit` vs `test:integration`.

## Architecture / Approach

```
PR / push main
    │
    ├─ ci.yml:  lint → supabase start → export 3 env vars → ci-supabase-test.sh → build
    │
    └─ deploy.yml (main only):  supabase start → ci-supabase-test.sh → build → wrangler deploy
```

Trzy zmienne testowe: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` z `supabase status` (localhost). Build produkcyjny nadal używa sekretów repo — osobno od testów.

## Phases at a Glance

| Phase            | What it delivers                                | Key risk                                                   |
| ---------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| 1. Shared script | `ci-supabase-test.sh` + wykrywanie cichego skip | Fałszywy fail jeśli grep złapie warning z innego kontekstu |
| 2. CI workflow   | `npm test` w `ci.yml`                           | Timeout / flaky Supabase start w Actions                   |
| 3. Deploy gate   | Ten sam test przed buildem w `deploy.yml`       | Podwójny Supabase start na main (~2–4 min)                 |
| 4. Docs sync     | test-plan + README                              | Phase 4 status w §3 dopiero przy archive                   |

**Prerequisites:** Phases 1–3 test rollout done; Docker available on `ubuntu-latest`; `supabase` CLI v2.23.x in devDependencies.

**Estimated effort:** ~1–2 sesje, 4 fazy.

## Open Risks & Assumptions

- Supabase Docker images occasional pull failures in Actions (mitigate: `timeout-minutes: 20`, retry policy if needed later).
- `supabase status -o env` flag names must match CLI version pinned in workflow.
- Duplicate test runs on `main` (CI + deploy) increase Actions minutes — accepted for safety.

## Success Criteria (Summary)

- PR cannot merge with failing tests (when branch protection enabled) or at minimum CI shows red.
- Deploy build does not run when tests fail.
- Local `npm test` without Docker still works for unit/smoke only.

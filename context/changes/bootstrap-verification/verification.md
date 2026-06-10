---
bootstrapped_at: 2026-06-09T20:32:50Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: bassmap-pl
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: bassmap-pl
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

Solo beginner shipping a Polish DnB event-discovery web app in three after-hours weeks with zero operating cost. The recommended default for (web-app, js) is 10x-astro-starter: Astro + React + TypeScript for the UI, Supabase for the event database and admin auth, Cloudflare Pages for free hosting. It clears all four agent-friendly gates (typed, conventional, popular in training data, well documented). PRD needs a public event list with filters, an interactive Poland map, and an admin write path — auth is admin-only in MVP (no fan accounts per non-goals). Map rendering (e.g. Leaflet) is an add-on, not bundled in the starter. Deployment locks to cloudflare-pages; CI on GitHub Actions with auto-deploy-on-merge.

## Pre-scaffold verification

| Signal      | Value   | Severity | Notes                              |
| ----------- | ------- | -------- | ---------------------------------- |
| npm package | not run | —        | cmd_template uses git clone        |
| GitHub repo | not run | —        | gh CLI unavailable on this machine |

Recency check unavailable: `gh` not installed. Proceeding.

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 19
**Conflicts (.scaffold siblings)**: .github.scaffold
**.gitignore handling**: moved silently
**.bootstrap-scaffold cleanup**: deleted

**Notes**: npm install completed with EBADENGINE warnings — local Node v20.19.1; starter requires Node >=22.12.0 per package engines and `.nvmrc` (22.14.0).

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/2/0 direct of total 0/1/9/0 (wrangler and @astrojs/check are direct moderate; devalue high is transitive)

#### HIGH findings

- **devalue** (transitive) — Svelte devalue: DoS via sparse array deserialization. Fix available.

#### MODERATE findings

- **@astrojs/check** (direct) — via @astrojs/language-server / volar-service-yaml chain. Dev tooling.
- **@astrojs/language-server** (transitive)
- **@cloudflare/vite-plugin** (transitive) — via miniflare, wrangler, ws
- **miniflare** (transitive)
- **volar-service-yaml** (transitive)
- **wrangler** (direct) — via miniflare
- **ws** (transitive) — Uninitialized memory disclosure
- **yaml** (transitive) — Stack Overflow via deeply nested YAML
- **yaml-language-server** (transitive)

#### LOW / INFO findings

none

## Hints recorded but not acted on

| Hint                    | Value                |
| ----------------------- | -------------------- |
| bootstrapper_confidence | first-class          |
| quality_override        | false                |
| path_taken              | standard             |
| self_check_answers      | null                 |
| team_size               | solo                 |
| deployment_target       | cloudflare-pages     |
| ci_provider             | github-actions       |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true                 |
| has_payments            | false                |
| has_realtime            | false                |
| has_ai                  | false                |
| has_background_jobs     | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:

- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
- Upgrade Node.js to **22.14.0** (see `.nvmrc`) before running `npm run dev` — current machine has v20.19.1.

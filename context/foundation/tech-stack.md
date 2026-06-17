---
starter_id: 10x-astro-starter
package_manager: npm
project_name: bassmap-pl
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
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
---

## Why this stack

Solo beginner shipping a Polish DnB event-discovery web app in three after-hours weeks with zero operating cost. The recommended default for (web-app, js) is 10x-astro-starter: Astro + React + TypeScript for the UI, Supabase for the event database and admin auth, Cloudflare Workers for free hosting (Astro 6 + `@astrojs/cloudflare` v13 \u2013 not Pages; see [infrastructure.md](./infrastructure.md)). It clears all four agent-friendly gates (typed, conventional, popular in training data, well documented). PRD needs a public event list with filters, an interactive Poland map, and an admin write path \u2013 auth is admin-only in MVP (no fan accounts per non-goals). Map rendering (e.g. Leaflet) is an add-on, not bundled in the starter. Deployment locks to cloudflare-workers via `wrangler deploy`; CI on GitHub Actions with auto-deploy-on-merge.

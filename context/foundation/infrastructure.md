---
project: BassMap PL
researched_at: 2026-06-10
recommended_platform: Cloudflare Workers
runner_up: Netlify
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6 + React 19
  runtime: Cloudflare Workers (workerd) via @astrojs/cloudflare v13.5
---

## Recommendation

**Deploy on Cloudflare Workers.**

BassMap PL is already scaffolded with `@astrojs/cloudflare` v13.5, Astro 6.3.1 SSR (`output: "server"`), and `wrangler.jsonc` \u2013 the stack's native deployment target. Astro 6 + adapter v13 dropped Cloudflare Pages in favor of Workers, matching the current project config. The Workers Free plan (100,000 requests/day, no egress charges) satisfies the PRD's zero-cost MVP requirement at expected traffic (10k–100k requests/month). Supabase stays external (interview Q5: undecided; PRD already locks Supabase). Interview answers: no persistent connections required (Q1: unsure, PRD confirms no realtime/background jobs), cost vs DX roughly equal (Q2), single region for now with future expansion possible (Q4).

## Platform Comparison

Scoring: **Pass** = full support, **Partial** = works with caveats, **Fail** = poor fit for this stack.

| Platform               | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total   |
| ---------------------- | --------- | ------------------ | ------------------- | ----------------- | ----------------- | ------- |
| **Cloudflare Workers** | Pass      | Pass               | Pass                | Pass              | Pass              | **5/5** |
| Netlify                | Pass      | Pass               | Partial             | Pass              | Pass              | 4.5/5   |
| Vercel                 | Pass      | Pass               | Partial             | Pass              | Partial           | 4/5     |
| Fly.io                 | Pass      | Partial            | Partial             | Pass              | Fail              | 3/5     |
| Railway                | Pass      | Partial            | Partial             | Pass              | Fail              | 3/5     |
| Render                 | Partial   | Partial            | Partial             | Pass              | Fail              | 2.5/5   |

**Hard filters applied:** Q1 was "don't know" (not "yes" for persistent connections) \u2013 no platform dropped. Stack uses `@astrojs/cloudflare` \u2013 Vercel/Netlify/Fly/Railway/Render would require adapter swap and config rework.

### Platform notes

**Cloudflare Workers** \u2013 `wrangler deploy`, `wrangler rollback`, `wrangler tail` cover the full ops loop. Docs publish `llms.txt` at `developers.cloudflare.com/workers/llms.txt`. Free tier: 100k requests/day, 10ms CPU/invocation, unlimited static asset bandwidth. Co-located services: D1, KV, R2, Queues, Durable Objects (not needed for MVP; Supabase is external). Astro 6 `astro dev` runs on workerd natively \u2013 production parity without extra tooling.

**Netlify** \u2013 Official `@netlify/mcp` (GA, June 2025). `@astrojs/netlify` adapter required (project would need migration). Credit-based pricing (Sept 2025+) adds unpredictability vs Cloudflare's request-based free tier. Strong preview deploys and MCP, but second choice because of adapter swap + billing model change.

**Vercel** \u2013 `@astrojs/vercel` adapter, Hobby free tier (1M function invocations/month). Vercel MCP exists (beta status as of 2026). Cold starts on serverless SSR. Would work but requires full adapter migration away from the bootstrapped Cloudflare config.

**Fly.io** \u2013 Needs `@astrojs/node` + Dockerfile. No permanent free tier ($5 trial credits). Good for global persistent processes, overkill for this MVP.

**Railway** \u2013 `$5/mo` Hobby with usage-based overages; no permanent free tier. `@astrojs/node` required. Unpredictable bills at scale.

**Render** \u2013 Free tier sleeps after 15min (30–50s cold starts). SSR needs `$7/mo` web service minimum \u2013 violates PRD zero-cost requirement.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Native fit: project already ships `wrangler.jsonc`, `@astrojs/cloudflare` entrypoint, `nodejs_compat` flag. Zero adapter migration. Free tier covers MVP traffic. Best agent ops story (`wrangler` CLI + `llms.txt` + Cloudflare MCP ecosystem). Edge CDN available when Poland-only audience expands nationally or internationally.

#### 2. Netlify

Strongest MCP story among alternatives (official `@netlify/mcp`, GA). Astro SSR via `@astrojs/netlify` is first-class. Gap: requires replacing Cloudflare adapter, reconfiguring env/secrets, and navigating credit-based billing that can spike on bot traffic or 404 storms.

#### 3. Vercel

Excellent Astro SSR docs and Hobby free tier. Gap: adapter migration from Cloudflare, serverless cold starts, Hobby plan pauses on limit exceed (no overage purchase). Less aligned with bootstrapped stack and PRD zero-cost constraint than Cloudflare.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate \u2013 Weaknesses

1. **Workers runtime ≠ Node.js** \u2013 Supabase SSR client and some npm packages may hit `nodejs_compat` gaps; a library that works in `astro dev` can still fail in production if it relies on unsupported Node APIs.
2. **CPU time ceiling on free tier** \u2013 10ms CPU per invocation; map filtering + SSR + Supabase round-trip on a cold path can approach limits under load.
3. **Domain lock-in** \u2013 Custom domains on Workers require Cloudflare as DNS/nameserver provider; migrating DNS later adds friction.
4. **Adapter churn** \u2013 Astro 6 dropped Pages support in `@astrojs/cloudflare` v13; tutorials referencing `wrangler pages deploy` are stale and will mislead.
5. **Supabase latency** \u2013 Worker runs at edge; Supabase region (likely EU) adds cross-network hop per SSR request vs co-located DB.

### Pre-Mortem \u2013 How This Could Fail

The team deployed BassMap PL on Cloudflare Workers trusting the free tier and bootstrapped config. They skipped testing SSR pages with real Supabase data in production. A middleware bug caused every page view to call Supabase twice \u2013 CPU time spiked past the 10ms free-tier cap, and responses started timing out during peak evening browsing. Meanwhile, they followed an outdated blog post and ran `wrangler pages deploy` instead of `wrangler deploy`, deploying a broken asset bundle. Preview environments were never set up, so bugs reached production directly. When they tried to roll back, nobody had documented which `wrangler rollback` version was safe \u2013 the rollback reverted code but not a Supabase migration that had already run. Six months in, they faced intermittent 5xx errors, a confused deployment pipeline, and a bill for Workers Paid ($5/mo minimum) they hadn't budgeted for because traffic crossed the free daily cap during a viral Facebook post about a Warsaw DnB night.

### Unknown Unknowns

- **`astro dev` already runs workerd** (Astro 6 + `@astrojs/cloudflare` v13) \u2013 you do not need `wrangler dev` for daily development; `npm run dev` is the correct local loop.
- **Secrets live in two places** \u2013 `astro:env` schema (`SUPABASE_URL`, `SUPABASE_KEY` in `astro.config.mjs`) expects values in `.dev.vars` locally and `wrangler secret put` in production; mixing `.env` and `.dev.vars` causes silent auth failures.
- **Preview deploys need explicit CI setup** \u2013 Workers has no built-in per-PR preview URL like Netlify unless you configure Workers environments or use GitHub Actions with `wrangler deploy --env preview`.
- **Supabase free tier pauses** \u2013 after 7 days of inactivity on free Supabase projects, the database sleeps; SSR pages return errors until the project is woken \u2013 looks like a hosting bug but is a DB issue.
- **Build output path changed** \u2013 Astro 6 + adapter v13 uses `@astrojs/cloudflare/entrypoints/server` as `main` in `wrangler.jsonc`, not `./dist/_worker.js/index.js` from older guides.

## Operational Story

- **Preview deploys**: Not automatic out of the box. Set up a `preview` environment in `wrangler.jsonc` and a GitHub Actions workflow that runs `wrangler deploy --env preview` on pull requests. Optionally protect preview URLs with Cloudflare Access if admin routes are exposed.
- **Secrets**: Local dev \u2013 `.dev.vars` (gitignored, mirrors `.env.example`). Production \u2013 `wrangler secret put SUPABASE_URL` and `wrangler secret put SUPABASE_KEY` (or Cloudflare dashboard → Workers → Settings → Variables). GitHub Actions \u2013 store same values in repository secrets, inject during CI deploy. Rotation: update in Supabase dashboard → `wrangler secret put` both keys → redeploy. Human approval recommended for production secret rotation.
- **Rollback**: `wrangler deployments list` → `wrangler rollback [VERSION_ID]` (defaults to previous version). Typical revert: under 60 seconds globally. Caveat: Supabase migrations do not roll back with Worker code \u2013 plan migrations separately.
- **Approval**: Agent may run `npm run build`, `wrangler deploy --dry-run`, `wrangler tail` (read-only). Human should approve: first production deploy, production secret changes, `wrangler delete`, Supabase schema migrations, DNS changes.
- **Logs**: `npx wrangler tail` (live), `npx wrangler tail --status error`, `npx wrangler tail --format json`. Cloudflare dashboard → Workers → Observability (enabled in `wrangler.jsonc`). Cloudflare MCP servers available for agent-driven observability.

## Risk Register

| Risk                                             | Source                      | Likelihood | Impact | Mitigation                                                                                                                                         |
| ------------------------------------------------ | --------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js API incompatibility in Workers runtime   | Devil's advocate            | M          | H      | Test all SSR paths with production build (`npm run build && npm run preview`); pin dependencies; check `nodejs_compat` docs before adding packages |
| CPU time exceeded on free tier                   | Devil's advocate / Research | M          | M      | Cache Supabase reads where possible; monitor CPU in Observability; budget Workers Paid ($5/mo) before launch traffic spike                         |
| Stale Pages deployment docs                      | Unknown unknowns            | H          | M      | Use only `wrangler deploy` (not `pages deploy`); document in README; validate against `@astrojs/cloudflare` v13+ docs                              |
| Supabase region latency on SSR                   | Devil's advocate            | M          | L      | Choose EU Supabase region; minimize round-trips per request; consider edge caching for public event list                                           |
| Supabase free tier sleep                         | Unknown unknowns            | M          | M      | Wake project before demos; upgrade Supabase plan before public launch; add health-check cron (Workers Cron Trigger, GA)                            |
| No PR preview without CI setup                   | Unknown unknowns            | H          | M      | Add GitHub Actions preview deploy in `/10x-implement`; test on preview before merge to main                                                        |
| Domain/DNS lock-in to Cloudflare                 | Devil's advocate            | L          | M      | Register domain with transfer lock awareness; document DNS records; use Cloudflare registrar for simplicity                                        |
| Viral traffic exceeds 100k requests/day free cap | Pre-mortem                  | L          | M      | Enable Workers Paid before marketing push; set up Cloudflare analytics alerts                                                                      |

## Getting Started

1. **Authenticate Wrangler** (one-time): `npx wrangler login`
2. **Local secrets**: Copy `.env.example` values into `.dev.vars` at project root (`SUPABASE_URL`, `SUPABASE_KEY`)
3. **Verify local SSR**: `npm run dev` \u2013 Astro 6 runs on workerd via `@astrojs/cloudflare` v13; no separate `wrangler dev` needed for daily work
4. **Production secrets**: `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`
5. **Deploy**: `npm run build` then `npx wrangler deploy` \u2013 uses existing `wrangler.jsonc` with `main: "@astrojs/cloudflare/entrypoints/server"`

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)

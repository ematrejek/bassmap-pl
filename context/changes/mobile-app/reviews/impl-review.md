<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: PWA instalowalna (S-27)

- **Plan**: `.cursor/plans/mobile-app-pwa_e4f855f8.plan.md` (brak kopii w `context/changes/mobile-app/plan.md`)
- **Scope**: Fazy 1–6 (pełny plan)
- **Date**: 2026-06-30
- **Verdict**: APPROVED (post-triage)
- **Findings**: 0 critical (1 fixed), 0 warnings (3 fixed), 0 observations pending (3 fixed/skipped)

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Automated verification (2026-06-30)

| Command | Result |
|---------|--------|
| `npm run verify` | PASS (check, lint:all, 434 tests) |
| `npm run build` | PASS (prerender `/offline`, PWA integration) |
| `npm run test:pwa` | PASS (`PWA build artifacts OK`) |
| `npm run test:e2e` | PASS (33/33) |
| `npm run verify:full` | PASS |

Manual (plan faza 6): Lighthouse PWA, instalacja Android, offline na telefonie – **brak dowodu w repo** (oczekiwane przed produkcją).

## Findings

### F1 — Service worker cache'uje HTML stron prywatnych

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: `astro.config.mjs:52-64`
- **Detail**: Reguła `runtimeCaching` z `NetworkFirst` dopasowuje wszystkie żądania nawigacji (`request.mode === "navigate"`). HTML `/profile`, `/my-events`, `/admin` itd. trafia do cache `bassmap-pages` (32 wpisy, 24 h). `PWA_NAVIGATE_FALLBACK_DENYLIST` dotyczy tylko `navigateFallback` (strona `/offline`), nie runtime cache. Na współdzielonym urządzeniu offline lub przy wolnym sieci (>5 s) użytkownik B może zobaczyć HTML poprzednika (email, profil w propsach SSR). Sprzeczne z planem („strony prywatne i API bez agresywnego cache”) i `pwa-research.md`.
- **Fix A ⭐ Recommended**: Wykluczyć trasy z denylisty (+ `/team`, `/forum`) w `urlPattern` runtime cache; cache `NetworkFirst` tylko dla jawnej allowlisty publicznych tras (`/`, `/events`, `/archive`, `/u/*`).
  - Strength: Zgodne z intencją planu i middleware `PROTECTED_ROUTES`.
  - Tradeoff: Mniejszy offline UX na chronionych trasach (akceptowalne – wymagają auth).
  - Confidence: HIGH — denylista już istnieje w `pwa.config.mjs`.
  - Blind spot: Trasy z personalizacją na publicznych URL (np. RSVP na `/events/[id]`).
- **Fix B**: Usunąć całą regułę `runtimeCaching` dla nawigacji; polegać tylko na precache statyków + `/offline`.
  - Strength: Najprostsze, zero ryzyka cache HTML.
  - Tradeoff: Brak offline dla publicznych stron SSR poza `/offline`.
  - Confidence: HIGH.
  - Blind spot: Nie testowano UX offline bez runtime cache.
- **Decision**: FIXED (Fix A — denylist applied to runtimeCaching urlPattern; /team and /forum added)

### F2 — Brak `/team` i `/forum` w denyliście PWA

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `pwa.config.mjs:36-42`
- **Detail**: `PROTECTED_ROUTES` w `middleware.ts` obejmuje `/team` i `/forum`. Research wymagał wykluczenia z cache nawigacji. Denylist ma tylko `/api`, `/admin`, `/auth`, `/profile`, `/my-events`.
- **Fix**: Dodać `/^\/team(?:\/|$)/` i `/^\/forum(?:\/|$)/` do `PWA_NAVIGATE_FALLBACK_DENYLIST` i użyć tej listy w `runtimeCaching.urlPattern` (po F1).
- **Decision**: FIXED (resolved together with F1 Fix A)

### F3 — `404.astro` SSR bez statycznego `404.html`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/pages/404.astro:7`, `wrangler.jsonc:10`
- **Detail**: `not_found_handling: "404-page"` oczekuje `404.html` w `dist/client`. `404.astro` ma `prerender = false` (jak `403.astro`). Po buildzie brak `dist/client/404.html`. Nieznany URL może dostać domyślny 404 Cloudflare zamiast polskiej strony z `AppShell`. `/offline` słusznie ma `prerender = true`.
- **Fix A ⭐ Recommended**: Ustawić `export const prerender = true` w `404.astro` i dodać asercję `404.html` w `verify-pwa-build.mjs`.
  - Strength: Zgodne z modelem Wrangler Static Assets.
  - Tradeoff: 404 bez danych sesji (akceptowalne dla strony błędu).
  - Confidence: MED — wymaga potwierdzenia buildem.
  - Blind spot: Czy worker SSR nadpisuje statyczny 404 dla niektórych tras.
- **Fix B**: Zostawić SSR 404 i usunąć `not_found_handling: "404-page"` z wrangler.
  - Strength: Jedna ścieżka 404 przez Astro.
  - Tradeoff: Zmiana zachowania deployu; wymaga testu na Cloudflare.
  - Confidence: LOW — nie zweryfikowano w produkcji.
  - Blind spot: Zachowanie `not_found_handling` przy odpowiedzi worker 404.
- **Decision**: FIXED (Fix A — prerender=true, 404.html in verify-pwa-build)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `.github/workflows/ci.yml`, `package.json:25`
- **Detail**: `test:pwa` jest tylko w `verify:full`. CI robi `npm run build` bez `npm run test:pwa`. `deploy` też nie weryfikuje artefaktów PWA.
- **Fix**: Dodać `npm run test:pwa` zaraz po `npm run build` w CI oraz w skrypcie `deploy`.
- **Decision**: FIXED (test:pwa added to CI and deploy script)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/layouts/Layout.astro:23`, `pwa.config.mjs:2`
- **Detail**: `#08080c` na sztywno w layoucie; manifest używa `PWA_THEME_COLOR`.
- **Fix**: Wspólna stała (import z `pwa.config.mjs` lub `site.config.mjs`).
- **Decision**: FIXED (PWA_THEME_COLOR imported in Layout.astro)

### F6 — `change.md` status nie odzwierciedla implementacji

- **Severity**: 💡 OBSERVATION
- **Detail**: Status `planned` mimo ukończonej implementacji i zielonego `verify:full`.
- **Fix**: Ustawić `status: implemented` (lub `impl_reviewed` po triage).
- **Decision**: FIXED (status: implemented)

### F7 — Plan dokumentuje `dist/`, kod używa `dist/client/`

- **Severity**: 💡 OBSERVATION
- **Detail**: Implementacja poprawna dla Astro 6 + Cloudflare (`assets.directory: "./dist/client"`). Plan i research mówią o `dist/`.
- **Fix**: Zaktualizować plan/research przy archiwizacji; `verify-pwa-build.mjs` już sprawdza `dist/client/`.
- **Decision**: FIXED (addendum in research.md §Implementation resolved)

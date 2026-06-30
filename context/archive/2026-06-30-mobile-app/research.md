---
date: 2026-06-30T13:40:00+02:00
researcher: Cursor (Claude Opus 4.8)
git_commit: 05b6ba296880c50537fa3a691cebd9e9f27af35f
branch: main
repository: ematrejek/bassmap-pl
topic: "Jak wpiąć PWA (S-27) w istniejący kod BassMap (Astro SSR + Cloudflare Workers)"
tags: [research, codebase, pwa, mobile-app, astro, cloudflare, service-worker]
status: complete
last_updated: 2026-06-30
last_updated_by: Cursor (Claude Opus 4.8)
---

# Research: PWA w kodzie BassMap PL (S-27 / `mobile-app`)

**Date**: 2026-06-30T13:40:00+02:00
**Researcher**: Cursor (Claude Opus 4.8)
**Git Commit**: 05b6ba296880c50537fa3a691cebd9e9f27af35f
**Branch**: main
**Repository**: ematrejek/bassmap-pl

## Pytanie badawcze

Gdzie dokładnie w kodzie BassMap wpiąć PWA (`@vite-pwa/astro`) i jakie pułapki ma nasz stack (Astro 6 SSR na Cloudflare Workers)? Research uzupełnia decyzje produktowe z `context/foundation/pwa-research.md` o twarde fakty z kodu, żeby `/10x-plan` mógł powstać bez zgadywania.

> Słowniczek (prosto):
> - **PWA** – zwykła strona z dodatkami, które pozwalają „zainstalować” ją na telefonie (ikona, pełny ekran).
> - **Manifest** – plik z nazwą, ikonami i kolorami aplikacji.
> - **Service worker (SW)** – mały skrypt w przeglądarce, który pośredniczy w pobieraniu plików (cache, tryb offline).
> - **SSR** – strony budowane na serwerze przy każdym wejściu (świeże dane).
> - **Static assets** – gotowe pliki (CSS, obrazki, SW) serwowane bez udziału serwera.

## Podsumowanie

Wpięcie PWA jest **niskiego ryzyka** w tym projekcie, bo architektura sprzyja:

1. **Jeden punkt wpięcia w `<head>`.** Istnieje dokładnie **jeden** layout z `<html>`/`<head>` – `src/layouts/Layout.astro`. Każda renderowana strona przechodzi przez niego (bezpośrednio lub przez `LegalDocumentShell`). Wystarczy jedno miejsce na link do manifestu i rejestrację SW.
2. **Statyki serwowane przed workerem.** `wrangler.jsonc` używa modelu **Workers Static Assets** (`assets.directory: "./dist"`, binding `ASSETS`, **bez** `run_worker_first`). Pliki fizycznie obecne w roocie `dist/` (np. `sw.js`, `manifest.webmanifest`, ikony) są serwowane z edge **bez** uruchamiania SSR. To dokładnie to, czego PWA potrzebuje.
3. **Wzorce już istnieją.** Strona błędu `403.astro` to gotowy szablon dla `/offline`. Skrypt inline w `CookieConsentBanner.astro` to wzorzec, jak dołożyć kod kliencki bez Reacta.

Największe realne pułapki: (a) **brak strony 404** mimo `not_found_handling: "404-page"` w `wrangler.jsonc`; (b) **e2e Playwright odpala dev, nie build** – SW zwykle różni się dev vs build, więc trzeba osobnego testu na buildzie; (c) **brak gotowej kwadratowej ikony-logo** (trzeba wygenerować z SVG); (d) lessony o **czyszczeniu cache Vite** i **`astro check`** po zmianie configu.

## Szczegółowe ustalenia

### 1. Punkt wpięcia w `<head>` – jeden layout

- `src/layouts/Layout.astro` to **jedyny** plik w repo z `<!doctype html>`, `<html>`, `<head>` (potwierdzone Globem `src/layouts/**` i Grepem po wszystkich `.astro`).
- Sekcja `<head>`: linie 18–33. Co już jest:
  - `theme-color` = `#08080c` (`src/layouts/Layout.astro:22`) – **już istnieje**, do uzgodnienia z manifestem.
  - favicon SVG + PNG (`src/layouts/Layout.astro:23-24`).
  - `viewport` BEZ `initial-scale` (`src/layouts/Layout.astro:20`).
  - **Brak**: `<link rel="manifest">`, `apple-touch-icon`, `apple-mobile-web-app-*`.
- Wyjątki tras: `src/pages/terms.astro` i `src/pages/privacy-policy.astro` importują `LegalDocumentShell` zamiast `Layout`, ale ten i tak owija treść w `Layout` (`src/components/legal/LegalDocumentShell.astro:1-16`). **Wniosek: każda strona przechodzi przez `Layout.astro`** – jedno miejsce wpięcia wystarcza.
- 20 z 22 stron importuje `Layout` bezpośrednio; pozostałe 2 (legal) pośrednio.

### 2. Wzorzec skryptu klienckiego (rejestracja SW)

- W całym `src/**/*.astro` jest **tylko jeden** `<script>`: `src/components/CookieConsentBanner.astro:51` – `<script is:inline define:vars={{ STORAGE_KEY }}>` (IIFE, `localStorage`, do linii 82).
- `Layout.astro` nie ma żadnego `<script>`.
- React podłączany dyrektywami `client:*`, nie skryptami (np. `src/components/shell/AppShell.astro:30,43` – `client:only="react"`).
- **Konsekwencja:** rejestracja SW (`registerSW` z `virtual:pwa-register`) wymaga dodania skryptu do `Layout.astro`. `@vite-pwa/astro` korzysta z modułu wirtualnego importowanego w `<script>` – to nowy wzorzec dla tego repo (dziś jedyny skrypt jest `is:inline`).

### 3. Serwowanie SW i manifestu na Cloudflare (kluczowe)

- `wrangler.jsonc:7-11`:
  ```jsonc
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist",
    "not_found_handling": "404-page",
  },
  ```
- `main: "@astrojs/cloudflare/entrypoints/server"` (`wrangler.jsonc:4`) – worker SSR. **Brak** `run_worker_first`, więc Cloudflare najpierw szuka statyki w `dist/`, a dopiero brak pliku kieruje do workera.
- `public/.assetsignore` wyklucza tylko `_worker.js` i `_routes.json` (`public/.assetsignore:1-2`) – nie dotyczy plików PWA.
- `_routes.json` **nie istnieje** (to artefakt Cloudflare Pages, nie Workers Static Assets).
- Precedens: `@astrojs/sitemap` generuje pliki do roota buildu i działają na produkcji; pliki z `public/` (favicony) też. SW i manifest pójdą tą samą drogą.
- **Wniosek:** `sw.js` + `manifest.webmanifest` + ikony będą serwowane statycznie z roota, **pod warunkiem że build je tam umieści**. Zadanie planu: zweryfikować, że `@vite-pwa/astro` w trybie `output: server` + adapter cloudflare faktycznie emituje te pliki do `dist/` (a nie pakuje do `_worker.js`).

### 4. Pułapka: `not_found_handling: "404-page"` bez strony 404

- `wrangler.jsonc:10` ustawia `not_found_handling: "404-page"`, ale `src/pages/404.astro` **nie istnieje** (potwierdzone). Jedyna strona błędu to `src/pages/403.astro`.
- Dla PWA `navigateFallback` (strona pokazywana offline) celujemy w nowy `/offline`, nie w 404. Ale warto, by plan rozstrzygnął relację: offline fallback vs brak 404.

### 5. Wzorzec strony `/offline`

- Szablon: `src/pages/403.astro:1-24` – minimalna strona:
  - `export const prerender = false;` (`:7`), `Astro.response.status = 403;` (`:9`)
  - `Layout` (prop `title`) → `AppShell showFooter` → `surface-panel` z `<h1>`, `<p>`, link do `HOME_PATH`.
  - Style przez klasy Tailwind + `shellBtnOutline` z `@/lib/shell-styles`.
- Minimalny wzorzec strony treściowej: `src/pages/team.astro:1-20`.
- **Uwaga dla offline:** strona `/offline` musi być cache'owalna przez SW. Jeśli zostanie jako `prerender = false` (SSR), trafi do workera, nie do statyki – plan musi zdecydować, czy `/offline` ma być prerenderowana/statyczna, żeby SW mógł ją podać bez sieci.

### 6. Trasy do wykluczenia z cache (prywatne / API)

- Stałe ścieżek: `src/lib/routes.ts:3-25` (`HOME_PATH`, `DISCOVERY_PATH`, `ARCHIVE_PATH`, `PROFILE_PATH`, `MY_EVENTS_PATH`, `TEAM_PATH`, `FORUM_PATH`, `ADMIN_PATH`, prefix `/u` dla profili publicznych itd.).
- Trasy chronione w middleware: `src/middleware.ts:8` – `PROTECTED_ROUTES = [PROFILE_PATH, MY_EVENTS_PATH, TEAM_PATH, FORUM_PATH]` (match `startsWith`), plus `/admin/*` (`:51-59`) i `/auth/*`.
- API: **47 endpointów** pod prefiksem `/api/...`, wszystkie z `export const prerender = false` (grep 47/47).
- **Wniosek dla SW:** wykluczyć z precache i z cache nawigacji: `/api/*`, `/admin/*`, `/auth/*`, `/profile`, `/my-events`. Strony publiczne (`/`, `/events`, `/archive`, szczegóły) – strategia **network-first** (świeże dane eventów), zgodnie z `pwa-research.md`.

### 7. Typy i konfiguracja TS

- `src/env.d.ts:1-7` – obecnie tylko `declare namespace App { interface Locals {...} }`. **Brak** triple-slash references. Tu dojdą `/// <reference types="vite-plugin-pwa/info" />` i `/// <reference types="vite-plugin-pwa/client" />` (lub `vanillajs`).
- `worker-configuration.d.ts` zawiera typy `ServiceWorkerGlobalScope` (linie ~305-439) – to wygenerowane typy runtime Cloudflare (wrangler), **nie** nasz service worker. Nie mylić.

### 8. Testy i tooling

- Playwright: `playwright.config.ts` – tylko **chromium** (`:27`), `webServer` uruchamia **`astro dev`** (`:32`), baseURL `http://localhost:4321` (`:9`). Smoke: `tests/e2e/smoke.spec.ts`.
- **Pułapka:** service worker i manifest często zachowują się inaczej w `astro dev` niż w produkcyjnym buildzie. Test PWA powinien iść na `astro build` + `astro preview` (lub wrangler), nie na dev. Plan musi dodać osobny tryb testu PWA.
- CI: build i e2e jako osobne kroki (`.github/workflows/ci.yml`); e2e i tak odpala własny dev.
- Skrypty: `npm run verify` (`astro sync` + `astro check` + `lint:all` + test), `npm run verify:full` (+ build + e2e), `npm run cache:clean` (czyszczenie `node_modules/.vite`), `npm run deploy` (build + `wrangler deploy`).

### 9. Zasoby graficzne (ikony PWA)

- `public/`: `favicon.svg` (monogram „BM”), `favicon.png` (**prostokąt 233×132** – nie nadaje się na ikonę PWA), `rave-crowd.png` (**1024×1024**, ale to zdjęcie tłumu, nie logo), `profile-avatar.png`, `.assetsignore`.
- Logo BassMap istnieje jako **inline SVG** w `src/components/shell/AppBrand.astro` / `AppBrand.tsx`.
- **Wniosek:** brak gotowego kwadratowego źródła ikony. Plan musi przewidzieć wygenerowanie ikon `192`, `512`, `maskable` z SVG logo (np. `@vite-pwa/assets-generator` lub ręcznie). To zadanie projektowe, nie tylko techniczne.

## Code References

- `src/layouts/Layout.astro:18-33` – jedyny `<head>`; miejsce na manifest + rejestrację SW; istniejący `theme-color`.
- `src/components/legal/LegalDocumentShell.astro:1-16` – legal owija się w `Layout` (potwierdza jeden punkt wpięcia).
- `src/components/CookieConsentBanner.astro:51-82` – jedyny wzorzec `<script is:inline>` w `.astro`.
- `src/components/shell/AppShell.astro:18-60` – główny shell (header fixed + `<main>` + footer); miejsce na ewentualny baner „Zainstaluj”.
- `wrangler.jsonc:4-11` – worker SSR + Workers Static Assets (`./dist`, binding `ASSETS`, brak `run_worker_first`).
- `public/.assetsignore:1-2` – ignoruje tylko `_worker.js`, `_routes.json`.
- `src/pages/403.astro:1-24` – szablon dla `/offline`.
- `src/lib/routes.ts:3-25` – stałe ścieżek do wykluczeń cache.
- `src/middleware.ts:8,45-59` – trasy chronione (`/profile`, `/my-events`, `/team`, `/forum`, `/admin/*`, `/auth/*`).
- `src/env.d.ts:1-7` – tu dojdą typy `vite-plugin-pwa`.
- `astro.config.mjs:16-32,60` – `integrations` (react + sitemap), adapter cloudflare; miejsce na `AstroPWA`.
- `playwright.config.ts:27,32` – tylko chromium, serwer `astro dev`.

## Architecture Insights

- **Single-layout architecture** – jeden `Layout.astro` to ogromne ułatwienie: wszystkie meta PWA i rejestracja SW w jednym miejscu, zero ryzyka „zapomnianej strony bez manifestu”.
- **Static-first routing na Cloudflare** – model Workers Static Assets bez `run_worker_first` oznacza, że PWA-pliki są serwowane jak każdy inny statyk; nie trzeba pisać custom route'ów.
- **SSR ≠ offline-first** – świadoma decyzja (z `pwa-research.md`): cache tylko statyków + `/offline`; HTML network-first; prywatne trasy i API poza cache. To chroni przed pokazaniem nieaktualnych lub cudzych danych.
- **Brak skryptów klienckich poza jednym** – projekt jest „React islands albo nic”; rejestracja SW to nowy, ale dobrze izolowany wzorzec.

## Historical Context (z wcześniejszych zmian i lessonów)

- `context/foundation/lessons.md` – istotne priory dla planu PWA:
  - **Vite – cache po zmianie bundlera:** po edycji `astro.config.mjs` uruchom `npm run cache:clean` i restart dev (PWA = zmiana configu → realne ryzyko).
  - **CI – `astro check` przed pushem:** `npm run verify` obowiązkowe; zmiana configu i typów musi przejść `astro check`.
  - **Radix – `client:only`, nie `client:load`:** nie dotyczy SW wprost, ale ostrzega przed SSR komponentów klienckich.
  - **Zamknięcie slicu – verify + build + E2E:** PWA zmienia UI i config → wymagany `npm run verify:full`.
- `context/foundation/pwa-research.md` – decyzje produktowe i zewnętrzne wymagania (manifest, strategia cache, iOS bez auto-promptu, zakres v1).
- `context/foundation/roadmap.md` (S-27) – kontekst roadmapy; open question #10 (PWA vs Capacitor vs native) rozstrzygnięte 2026-06-30 na korzyść PWA.

## Related Research

- `context/foundation/pwa-research.md` – research zewnętrzny/produktowy (komplementarny do tego dokumentu o kodzie).

## Open Questions

1. **Czy `@vite-pwa/astro` w trybie `output: "server"` + adapter cloudflare emituje `sw.js`/manifest do roota `dist/`** (a nie do `_worker.js`)? Do weryfikacji buildem w fazie planu – to główne ryzyko techniczne.
2. **Strona `/offline`: SSR czy prerender/statyczna?** SW musi ją podać bez sieci – prawdopodobnie potrzebny statyczny wariant (lub osobny plik HTML fallback). Rozstrzygnąć w planie.
3. **Relacja z `not_found_handling: "404-page"`** – czy dodać też stronę 404, skoro jej brak, a wrangler na nią wskazuje?
4. **Źródło ikon** – wygenerować z `AppBrand` SVG; jakim narzędziem (`@vite-pwa/assets-generator` vs ręcznie) i z jakim tłem/maskable safe-zone?
5. **`registerType`** – `autoUpdate` (cicho) vs `prompt` (toast „Nowa wersja”)? `pwa-research.md` sugeruje `autoUpdate` + opcjonalny toast.
6. **Test PWA na buildzie** – dodać skrypt/preview lub krok CI, bo Playwright dziś używa `astro dev`.

## Implementation resolved (2026-06-30)

Po wdrożeniu i przeglądzie implementacji (`reviews/impl-review.md`):

1. **Artefakty PWA** trafiają do **`dist/client/`** (nie root `dist/`), zgodnie z `wrangler.jsonc` (`assets.directory: "./dist/client"`). Weryfikacja: `npm run test:pwa` → `scripts/verify-pwa-build.mjs`.
2. **`/offline`** – `prerender = true` (statyczny `offline/index.html` w precache SW).
3. **`/404`** – `prerender = true` (statyczny `404.html` dla Wrangler `not_found_handling: "404-page"`).
4. **CI** – krok `npm run test:pwa` po `npm run build` w `.github/workflows/ci.yml`.

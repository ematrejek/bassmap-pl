---
project: BassMap PL
created: 2026-06-10
platform: Cloudflare Workers
deploy_scope: mvp-full
status: deployed
repo: ematrejek/bassmap-pl
branch: main
production_url: https://bassmap.pl
references:
  - context/foundation/infrastructure.md
  - context/foundation/tech-stack.md
---

# Plan wdrożenia produkcyjnego BassMap PL (MVP)

Dokument operacyjny wdrożenia MVP BassMap PL. Bazuje na [infrastructure.md](../foundation/infrastructure.md) (Cloudflare Workers) i [tech-stack.md](../foundation/tech-stack.md) (GitHub Actions + auto-deploy-on-merge). Stack: Astro 6 SSR + `@astrojs/cloudflare` v13 — **nie** Cloudflare Pages.

**Produkcja:** [https://bassmap.pl](https://bassmap.pl) (Custom Domain na Workerze `bassmap-pl`). Zapasowy URL: `https://bassmap-pl.ematrejek.workers.dev`.

## Zakres MVP (F-03)

Pełny MVP: fan discovery (lista, filtry, mapa Leaflet, `/events/[id]`), panel admina (`/admin`, CRUD), auth Supabase, 5 migracji prod (`events`, RLS, `admin_allowlist`).

```mermaid
flowchart LR
  subgraph prep [Faza0_Przygotowanie]
    SB[Supabase_cloud_EU]
    SEC[Sekrety_CF_i_GH]
    CFG[Poprawki_konfiguracji]
  end
  subgraph validate [Faza1_Walidacja]
    BUILD[npm_run_build]
    PREVIEW[npm_run_preview]
    SMOKE[Smoke_test_lokalny]
  end
  subgraph deploy [Faza2_Wdrozenie]
    MANUAL[wrangler_deploy_reczny]
    CI[GitHub_Actions_CD]
  end
  subgraph verify [Faza3_Weryfikacja]
    LIVE[Smoke_test_produkcja]
    LOGS[wrangler_tail]
  end
  prep --> validate --> deploy --> verify
  MANUAL --> CI
```

---

## Ocena planu — luki i poprawki

| Obszar             | Stan przed planem                                                      | Poprawka w planie                                          | Status           |
| ------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------- |
| Platforma          | `tech-stack.md` mówi „cloudflare-pages”; kod używa Workers             | **Workers wygrywa** — Astro 6 + adapter v13 porzucił Pages | Zrobione         |
| CI                 | Tylko `.github.scaffold/workflows/ci.yml` (nieaktywny), gałąź `master` | `.github/workflows/ci.yml`, gałąź `main`                   | Zrobione         |
| CD                 | Brak workflow deploy                                                   | `.github/workflows/deploy.yml` na push do `main`           | Zrobione         |
| Nazwa Workera      | `10x-astro-starter` w `wrangler.jsonc`                                 | `bassmap-pl`                                               | Zrobione         |
| Supabase prod      | Brak projektu w chmurze                                                | Projekt EU (`dpqndrmvrkfahzyubrns.supabase.co`)            | Zrobione         |
| Sekrety CF         | Tylko `.dev.vars` lokalnie                                             | `wrangler secret put` lub `--secrets-file`                 | Zrobione         |
| Sekrety GitHub     | Brak                                                                   | 4 sekrety w `ematrejek/bassmap-pl`                         | Zrobione         |
| workers.dev        | Brak subdomeny konta                                                   | Subdomena: `ematrejek.workers.dev`                         | Zrobione         |
| URL produkcyjny    | workers.dev                                                          | `https://bassmap.pl` + workers.dev backup                  | Zrobione         |
| Redirecty Supabase | workers.dev                                                          | Site URL + Redirect URLs → `https://bassmap.pl`              | Zrobione         |
| Preview deploys    | Brak                                                                   | Faza 2 — patrz sekcja poniżej                              | Zaplanowane      |
| Własna domena      | Brak                                                                   | `bassmap.pl` — Cloudflare Full setup                         | Zrobione         |
| Migracje DB        | Tylko auth (scaffold)                                                  | 5 migracji prod (`supabase db push`)                         | Zrobione         |

### Rozjazd tech-stack vs infrastructure

`tech-stack.md` (z bootstrapu) wskazuje `deployment_target: cloudflare-pages`. To historyczny hint ze startera. [infrastructure.md](../foundation/infrastructure.md) i aktualny kod (`wrangler.jsonc`, `main: "@astrojs/cloudflare/entrypoints/server"`) są źródłem prawdy: **deploy przez `wrangler deploy`, nie `wrangler pages deploy`**.

---

## Stan wykonania (checklist główny)

- [x] Dokument planu w `context/deployment/deploy-plan.md`
- [x] `wrangler.jsonc` → `name: "bassmap-pl"`
- [x] `.github/workflows/ci.yml` (lint + build na `main`)
- [x] `.github/workflows/deploy.yml` (auto-deploy na `main`)
- [x] `package.json` → skrypt `deploy`
- [x] Projekt Supabase w chmurze + `.dev.vars`
- [x] Sekrety Cloudflare Worker (`SUPABASE_URL`, `SUPABASE_KEY`)
- [x] GitHub Secrets (wszystkie 4)
- [x] Rejestracja subdomeny `ematrejek.workers.dev`
- [x] `npm run build` — sukces
- [x] `npm run lint` — sukces (po `npm run format`)
- [x] `npm run lint` + `npm run build` — sukces (2026-06-10)
- [x] `npm run deploy` — `https://bassmap-pl.ematrejek.workers.dev`
- [x] Smoke test produkcyjny — `/` 200, `/auth/*` 200, `/dashboard` → 302 `/auth/signin`
- [x] Redirecty auth w Supabase (site_url + uri_allow_list) — `https://bassmap.pl`
- [x] Migracje prod: `npx supabase link` + `npx supabase db push` (5 plików)
- [x] Custom Domain `bassmap.pl` na Workerze `bassmap-pl`
- [x] Push do `main` → CI/CD (GitHub Actions)
- [x] Smoke test MVP na `https://bassmap.pl`

---

## Faza 0 — Przygotowanie kont i sekretów

### 0.1 Supabase w chmurze

Projekt chmurowy jest skonfigurowany. Przed pierwszym publicznym testem auth:

1. Otwórz [Supabase Dashboard](https://supabase.com/dashboard) → projekt BassMap
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://bassmap.pl`
   - **Redirect URLs**:
     - `https://bassmap.pl`
     - `https://bassmap.pl/**`
3. **Authentication → Email** (na smoke test):
   - Rozważ wyłączenie „Confirm email” — ułatwia test logowania admina
   - Przed publicznym launch: włącz z powrotem
4. **Wake projekt** przed demo — free tier usypia się po 7 dniach bezczynności

Klucze API (Settings → API):

| Zmienna        | Opis              |
| -------------- | ----------------- |
| `SUPABASE_URL` | Project URL       |
| `SUPABASE_KEY` | `anon` public key |

### 0.2 Cloudflare — sekrety produkcyjne

```bash
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
```

Alternatywnie przy deployu:

```bash
npm run build
npx wrangler deploy --secrets-file .dev.vars
```

**Nie commituj** `.dev.vars` — tylko lokalny dev (`astro.config.mjs` + `astro:env`).

Skrypt pomocniczy: `scripts/setup-deploy-secrets.ps1` (ustawia sekrety CF + GitHub z `.dev.vars`).

### 0.3 GitHub Secrets

W `ematrejek/bassmap-pl` → Settings → Secrets and variables → Actions:

| Secret                  | Cel                    | Status    |
| ----------------------- | ---------------------- | --------- |
| `SUPABASE_URL`          | build w CI + runtime   | Ustawiony |
| `SUPABASE_KEY`          | build w CI + runtime   | Ustawiony |
| `CLOUDFLARE_API_TOKEN`  | deploy z Actions       | Ustawiony |
| `CLOUDFLARE_ACCOUNT_ID` | identyfikator konta CF | Ustawiony |

Token API: minimalne uprawnienia — Account / Workers Scripts / Edit.

---

## Faza 1 — Poprawki konfiguracji w repozytorium

Wykonane zmiany:

| Plik                               | Zmiana                                               |
| ---------------------------------- | ---------------------------------------------------- |
| `wrangler.jsonc`                   | `name: "bassmap-pl"`, `nodejs_compat`, observability |
| `.github/workflows/ci.yml`         | `npm ci`, `astro sync`, lint, build na `main`        |
| `.github/workflows/deploy.yml`     | build + `cloudflare/wrangler-action@v3` na `main`    |
| `package.json`                     | `"deploy": "npm run build && wrangler deploy"`       |
| `scripts/setup-deploy-secrets.ps1` | automatyzacja sekretów z `.dev.vars`                 |

### wrangler.jsonc (docelowa konfiguracja)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "bassmap-pl",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-05-08",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist",
    "not_found_handling": "404-page",
  },
  "observability": {
    "enabled": true,
  },
}
```

---

## Faza 2 — Walidacja przed produkcją

Wymagania: Node **22.14.0** (`.nvmrc`).

```bash
npm ci
npm run lint
npm run build
npm run preview
```

### Smoke test lokalny

- [ ] `/` — strona główna bez błędów 500
- [ ] Banner „Supabase nie jest skonfigurowany” **nie** widoczny (gdy `.dev.vars` ustawione)
- [ ] `/auth/signup` → rejestracja → `/auth/confirm-email` lub `/dashboard`
- [ ] `/auth/signin` → logowanie → redirect na `/`
- [ ] `/dashboard` bez sesji → redirect na `/auth/signin`
- [ ] `/api/auth/signout` — wylogowanie działa

Opcjonalnie: `npx wrangler deploy --dry-run`

---

## Faza 3 — Pierwszy deploy produkcyjny

```bash
npm run deploy
# lub:
npm run build && npx wrangler deploy --secrets-file .dev.vars
```

**Nie używać** `wrangler pages deploy` — przestarzałe dla tego stacku.

### Po deployu

1. Sprawdź URL: **https://bassmap-pl.ematrejek.workers.dev**
2. Zaktualizuj Site URL i Redirect URLs w Supabase (Faza 0.1)
3. Jeśli auth nie działa — najczęstsze przyczyny:
   - brak lub zły redirect URL w Supabase
   - brak sekretów w Workerze
   - włączone confirm email bez skonfigurowanego SMTP

### Rollback

```bash
npx wrangler deployments list
npx wrangler rollback
```

Rollback cofa **tylko kod Workera** — migracje Supabase są niezależne.

---

## Migracje produkcyjne Supabase

Przed deployem kodu zależnego od schematu `events`:

```bash
npx supabase login
npx supabase link --project-ref dpqndrmvrkfahzyubrns
npx supabase db push
```

Pliki w `supabase/migrations/` (kolejność timestamp). Po apply: w Studio widoczne `events`, `admin_allowlist`, RLS, `is_admin()`. Admin prod: `matrejekemilia@gmail.com` w allowlist + konto Auth.

**Rollback:** `wrangler rollback` cofa tylko kod Workera — migracji DB nie cofaj bez planu.

---

## Faza 4 — Weryfikacja produkcji (MVP)

Smoke test na `https://bassmap.pl` (lub workers.dev jako backup).

### Logi na żywo

```bash
npx wrangler tail
npx wrangler tail --status error
```

### Obserwowalność

`observability.enabled: true` w `wrangler.jsonc` — Cloudflare Dashboard → Workers → bassmap-pl.

### Smoke test MVP — fan

- [ ] `/` — 200 OK, lista wydarzeń (lub komunikat „Brak nadchodzących wydarzeń”)
- [ ] Filtry miasto / podgatunek w URL działają
- [ ] Mapa Leaflet renderuje pinezki (event z `latitude`/`longitude`)
- [ ] `/events/[id]` — szczegóły wydarzenia
- [ ] Draft / przeszłe eventy niewidoczne dla anon

### Smoke test MVP — admin

- [ ] Logowanie admina (allowlist) → `/admin`
- [ ] CRUD wydarzenia + geokodowanie (Nominatim)
- [ ] Konto bez allowlist → `/admin` → `/403`
- [ ] `/auth/signin` renderuje się; brak banneru „Supabase nie jest skonfigurowany”
- [ ] Wylogowanie (`/api/auth/signout`) działa

---

## Faza 5 — Auto-deploy

Po udanym smoke teście:

1. Commit i push zmian do `main`
2. GitHub Actions uruchomi CI (lint + build) i Deploy (wrangler)
3. Każdy kolejny merge do `main` → automatyczny deploy

Workflow deploy wymaga sekretów z Fazy 0.3 — wszystkie są ustawione.

---

## Operacje na co dzień

| Akcja           | Komenda                                     |
| --------------- | ------------------------------------------- |
| Dev lokalny     | `npm run dev` (workerd, nie `wrangler dev`) |
| Build           | `npm run build`                             |
| Preview lokalny | `npm run preview`                           |
| Deploy ręczny   | `npm run deploy`                            |
| Migracje prod   | `npx supabase db push` (po `link`)          |
| Logi prod       | `npx wrangler tail`                         |
| Rollback        | `npx wrangler rollback`                     |
| Lista deployów  | `npx wrangler deployments list`             |

### Zatwierdzenia (kto robi co)

Zgodnie z [infrastructure.md](../foundation/infrastructure.md):

| Akcja                                                         | Agent  | Człowiek   |
| ------------------------------------------------------------- | ------ | ---------- |
| `npm run build`, `wrangler deploy --dry-run`, `wrangler tail` | Tak    | —          |
| Pierwszy deploy produkcyjny                                   | Pomaga | Zatwierdza |
| Rotacja sekretów produkcyjnych                                | Pomaga | Zatwierdza |
| `wrangler delete`, migracje Supabase, zmiany DNS              | —      | Tak        |

---

## Faza 2 — Preview deploy (odłożone)

Osobny Worker preview na PR: `wrangler deploy --env preview`, własne sekrety, osobna subdomena — poza F-03. Szczegóły w osobnym change po domknięciu wdrożenia MVP.

---

## Poza zakresem bieżącego wdrożenia

- Seed przykładowych wydarzeń na prod (admin dodaje ręcznie)
- Cron health-check — budzenie Supabase free tier
- Workers Paid ($5/mo) — przed większym ruchem marketingowym
- Włączenie confirm email przed publicznym launch

---

## Rejestr ryzyk

| Ryzyko                         | Źródło         | Prawdop. | Wpływ  | Mitygacja                                          |
| ------------------------------ | -------------- | -------- | ------ | -------------------------------------------------- |
| Workers ≠ Node.js              | infrastructure | Średnia  | Wysoki | `nodejs_compat`; test build + preview + smoke prod |
| CPU 10ms free tier             | infrastructure | Średnia  | Średni | Na scaffoldzie OK; monitoruj po mapie/filtrach     |
| Stare tutoriale Pages          | infrastructure | Wysoka   | Średni | Tylko `wrangler deploy` w docs i CI                |
| Supabase latency EU            | infrastructure | Średnia  | Niski  | Region EU; minimalizuj round-tripy SSR             |
| Supabase free tier sleep       | infrastructure | Średnia  | Średni | Wake przed demo; cron w fazie 2                    |
| Brak preview → bugi na prod    | infrastructure | Wysoka   | Średni | Smoke przed CD; preview env w fazie 2              |
| Viral traffic > 100k req/dzień | infrastructure | Niska    | Średni | Workers Paid przed marketingiem                    |
| Token API w czacie             | operacyjne     | —        | Wysoki | Rotacja tokenu CF po konfiguracji                  |

---

## Kolejność wykonania (skrót)

1. ~~Supabase cloud (EU) + sekrety CF + GitHub Secrets~~
2. ~~Poprawki: `wrangler.jsonc`, CI na `main`, `deploy.yml`~~
3. ~~Migracje prod + domena `bassmap.pl`~~
4. ~~Deploy MVP + smoke na `https://bassmap.pl`~~
5. Push do `main` → auto-deploy z GitHub Actions (każdy merge)

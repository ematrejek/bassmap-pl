# Wdrożenie produkcyjne MVP — Implementation Plan

## Overview

Domknięcie F-03: synchronizacja produkcyjnej bazy Supabase z kodem MVP (S-01/S-02), podpięcie domeny `.pl` do Cloudflare Worker, auto-deploy przez GitHub Actions oraz rozszerzony smoke test. Pierwszy deploy (2026-06-10) objął tylko scaffold auth — ten plan dowozi pełne MVP pod publicznym adresem.

## Current State Analysis

- **Worker prod:** `bassmap-pl` na `https://bassmap-pl.ematrejek.workers.dev` — ręczny deploy scaffoldu; `observability.enabled: true` w `wrangler.jsonc`
- **Supabase cloud:** projekt EU `dpqndrmvrkfahzyubrns.supabase.co` — Auth skonfigurowany, redirecty ustawione pod `workers.dev`; **brak** tabel `events`, RLS, `is_admin()`
- **Migracje lokalne:** 5 plików w `supabase/migrations/` (events, grant RPC, fix allowlist email, nullable address, dancefloor subgenre)
- **CI/CD:** `.github/workflows/ci.yml` + `deploy.yml` na gałęź `main`; 4 GitHub Secrets ustawione (deploy-plan 2026-06-10)
- **Kod MVP:** admin CRUD (`/admin`, `/api/admin/events`), fan discovery (`/`, `/events/[id]`), middleware admin guard — w repo, nie wdrożony na prod
- **Dokumentacja:** `context/deployment/deploy-plan.md` ma `deploy_scope: scaffold-smoke-test`; README wspomina gałąź `master` (niespójność z CI)

### Key Discoveries:

- `context/deployment/deploy-plan.md` L315 świadomie wykluczył migracje `events` — przestarzałe względem stanu repo
- Migracja `20260610120000_fix_admin_allowlist_email.sql` wstawia `matrejekemilia@gmail.com` do `admin_allowlist` — `db push` wystarczy dla allowlist (konto Auth musi istnieć osobno)
- Aplikacja używa **wyłącznie** `SUPABASE_URL` i `SUPABASE_KEY` (`astro.config.mjs` env schema) — brak dodatkowych sekretów deployu
- Cloudflare **nie rejestruje** domen `.pl`, ale obsługuje je jako strefę DNS (Full setup — zmiana nameserverów u rejestratora)
- `infrastructure.md`: migracje Supabase nie cofają się z `wrangler rollback`; pierwszy prod deploy i rotacja sekretów wymagają zatwierdzenia człowieka

## Desired End State

1. Prod Supabase ma wszystkie 5 migracji; admin `matrejekemilia@gmail.com` w allowlist i zarejestowany w Auth.
2. Aplikacja dostępna pod docelową domeną `.pl` (HTTPS, certyfikat CF automatyczny).
3. Supabase Auth: Site URL i Redirect URLs wskazują domenę `.pl`.
4. Kod MVP wdrożony przez push na `main` → GitHub Actions → `wrangler deploy`.
5. Smoke test MVP przechodzi: lista, filtry, mapa Leaflet, szczegóły eventu, panel admina, auth.
6. `deploy-plan.md` i `README.md` opisują pełny MVP prod (nie scaffold).

### Weryfikacja końcowa (perspektywa użytkownika):

- Fan otwiera `https://<twoja-domena.pl>/` — widzi wydarzenia dodane przez admina
- Admin loguje się, dodaje wydarzenie z adresem — pinezka pojawia się na mapie
- Wylogowany użytkownik na `/admin` trafia na `/403`

## What We're NOT Doing

- Seed przykładowych wydarzeń na prod (admin dodaje ręcznie)
- Preview deploy na PR / osobny Worker staging (faza 2 — tylko wzmianka w docs)
- Włączenie confirm email (osobny krok przed publicznym launch — nie w tym planie)
- Cron health-check / budzenie Supabase
- Workers Paid upgrade
- Rotacja sekretów (chyba że wykryty problem)
- Zmiany kodu aplikacji (F-03 to operacje deploy, nie feature work)

## Implementation Approach

Cztery sekwencyjne fazy: baza → domena → deploy kodu → weryfikacja + docs. Domena blokuje finalną konfigurację Auth URLs, więc kolejność ma znaczenie. Migracje DB idą **przed** deployem kodu MVP (kod bez schematu = błędy 500). Auto-deploy przez istniejący `deploy.yml` — bez zmian w pipeline, o ile kod jest na `main`.

## Critical Implementation Details

- **Domena `.pl`:** kup u polskiego rejestratora (np. [home.pl](https://home.pl), [nazwa.pl](https://nazwa.pl), OVH) → w Cloudflare Dashboard: **Add a site** → wpisz domenę → Cloudflare poda 2 nameservery → u rejestratora: wyłącz DNSSEC, podmień nameservery na CF → poczekaj na aktywację strefy (zwykle 24–48 h) → Workers → `bassmap-pl` → **Domains & Routes** → Add Custom Domain (np. `bassmap.pl` lub `www.bassmap.pl`)
- **Supabase Auth URLs:** po podpięciu domeny zaktualizuj Site URL i Redirect URLs w Dashboard — dodaj `https://<domena>` i `https://<domena>/**`; opcjonalnie zostaw `workers.dev` jako redirect do czasu wygaśnięcia starego linku
- **`db push` vs rollback:** `wrangler rollback` cofa tylko kod Workera — migracji DB nie cofaj bez jawnego planu

## Phase 1: Baza produkcyjna Supabase

### Overview

Zastosowanie 5 migracji na projekt cloud, weryfikacja schematu i przygotowanie konta admina.

### Changes Required:

#### 1. Połączenie CLI z projektem cloud

**File:** (operacja CLI, brak zmian w repo)

**Intent:** Powiązać lokalny folder `supabase/` z projektem produkcyjnym, żeby `db push` trafił we właściwą bazę.

**Contract:** `npx supabase link --project-ref dpqndrmvrkfahzyubrns` (lub aktualny ref z Dashboard → Settings → General). Wymaga wcześniejszego `npx supabase login`.

#### 2. Migracje produkcyjne

**File:** `supabase/migrations/*.sql` (5 plików — tylko odczyt, apply przez CLI)

**Intent:** Utworzyć na prod tabele `events`, `admin_allowlist`, enumy, RLS, funkcję `is_admin()` i grant RPC.

**Contract:** `npx supabase db push` — stosuje migracje w kolejności timestamp. Po sukcesie w Supabase Studio → Table Editor: widoczne `events`, `admin_allowlist`.

Lista migracji:

| Plik | Cel |
| ---- | --- |
| `20260610100000_create_events.sql` | Tabela events, RLS, admin_allowlist, is_admin() |
| `20260610110000_grant_is_admin_rpc.sql` | GRANT EXECUTE na is_admin() |
| `20260610120000_fix_admin_allowlist_email.sql` | Allowlist: matrejekemilia@gmail.com |
| `20260611100000_nullable_event_address.sql` | Nullable address (lokalizacja tajna) |
| `20260611120000_add_dancefloor_subgenre.sql` | Enum dancefloor |

#### 3. Konto admina w Auth

**File:** (operacja w Supabase Dashboard / UI aplikacji)

**Intent:** Admin musi mieć konto Auth z e-mailem zgodnym z allowlist — inaczej `/admin` → `/403`.

**Contract:** Zarejestruj `matrejekemilia@gmail.com` przez `/auth/signup` (prod lub lokalnie z tym samym projektem cloud). Confirm email wyłączone na MVP (zgodnie z decyzją planowania). Zweryfikuj w Studio: `SELECT * FROM admin_allowlist WHERE email = 'matrejekemilia@gmail.com'`.

#### 4. Obudzenie projektu Supabase

**File:** (operacja)

**Intent:** Free tier usypia projekt po 7 dniach — przed testami upewnij się, że baza odpowiada.

**Contract:** Otwórz Dashboard lub wykonaj prosty SELECT w SQL Editor przed smoke testem.

### Success Criteria:

#### Automated Verification:

- `npx supabase db push` kończy się bez błędu (exit code 0)
- `npm run lint` — sukces (brak regresji w repo)
- `npm run build` — sukces (z `SUPABASE_URL` i `SUPABASE_KEY` w env)

#### Manual Verification:

- Supabase Studio: tabele `events` i `admin_allowlist` istnieją
- `SELECT email FROM admin_allowlist` zawiera `matrejekemilia@gmail.com`
- Konto Auth z tym e-mailem istnieje (Authentication → Users)
- INSERT testowy jako anon na `events` jest odrzucany (RLS działa)

**Implementation Note:** Po tej fazie i przejściu automated verification — potwierdź manual verification przed fazą 2.

---

## Phase 2: Domena `.pl` i DNS w Cloudflare

### Overview

Zakup domeny `.pl`, dodanie strefy w Cloudflare, podpięcie Custom Domain do Workera `bassmap-pl`.

### Changes Required:

#### 1. Zakup domeny `.pl`

**File:** (operacja u rejestratora — poza repo)

**Intent:** Zarejestrować docelową nazwę (np. `bassmap.pl` — dokładna nazwa do ustalenia przy implementacji).

**Contract:** Domena aktywna u rejestratora z dostępem do panelu DNS/nameserverów.

Rejestratorzy obsługujący `.pl`: home.pl, nazwa.pl, OVH, cyber_Folks i inni akredytowani przez NASK. Cloudflare Registrar **nie** obsługuje `.pl` — to normalne; DNS i Worker i tak działają przez Full setup.

#### 2. Dodanie strefy w Cloudflare

**File:** (Cloudflare Dashboard)

**Intent:** Cloudflare zarządza DNS i wystawia certyfikat SSL dla domeny.

**Contract:** Dashboard → **Add a site** → wpisz domenę → wybierz plan Free → skopiuj 2 przypisane nameservery (np. `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`).

#### 3. Zmiana nameserverów u rejestratora

**File:** (panel rejestratora)

**Intent:** Przekierować DNS domeny do Cloudflare — wymagane dla Custom Domain na Workerze (apex domain).

**Contract:** U rejestratora: **wyłącz DNSSEC** (jeśli włączone) → usuń stare nameservery → wklej 2 nameservery z Cloudflare → zapisz. Propagacja: zwykle 24–48 h (czasem szybciej).

#### 4. Custom Domain na Workerze

**File:** `wrangler.jsonc` (opcjonalnie — alternatywa: Dashboard)

**Intent:** Kierować ruch z domeny `.pl` na Worker `bassmap-pl`.

**Contract:** Cloudflare Dashboard → Workers & Pages → `bassmap-pl` → Settings → Domains & Routes → **Add Custom Domain** → wpisz apex (`domena.pl`) i/lub `www`. Cloudflare tworzy rekordy DNS i certyfikat automatycznie — nie twórz ręcznie konfliktujących CNAME.

#### 5. Aktualizacja Supabase Auth URLs

**File:** (Supabase Dashboard → Authentication → URL Configuration)

**Intent:** Logowanie i redirecty auth muszą wskazywać nową domenę — inaczej sesje cookie i OAuth redirecty się wywalą.

**Contract:**

- **Site URL:** `https://<twoja-domena.pl>`
- **Redirect URLs:** `https://<twoja-domena.pl>`, `https://<twoja-domena.pl>/**`

Opcjonalnie zachowaj stare URL `workers.dev` do czasu migracji bookmarków.

### Success Criteria:

#### Automated Verification:

- `npx wrangler deployments list` — Worker `bassmap-pl` istnieje
- `npm run build` — sukces (bez regresji)

#### Manual Verification:

- Cloudflare Dashboard: strefa domeny w statusie **Active**
- Custom Domain na Workerze pokazuje status **Active** / certyfikat issued
- `curl -I https://<domena.pl>` zwraca 200 lub 302 (nie 522/525)
- Supabase Auth URLs zaktualizowane na domenę `.pl`

**Implementation Note:** Jeśli DNS jeszcze nie propaguje — wstrzymaj fazę 3 do aktywacji strefy. Można tymczasowo testować na `workers.dev`, ale docelowy smoke test MVP jest pod `.pl`.

---

## Phase 3: Deploy kodu MVP (CI/CD)

### Overview

Upewnić się, że kod S-01/S-02 jest na gałęzi `main` i auto-deploy z GitHub Actions działa.

### Changes Required:

#### 1. Weryfikacja gałęzi i stanu repo

**File:** `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`

**Intent:** CI/CD odpala się tylko na push do `main` — kod MVP musi tam trafić.

**Contract:** `git branch --show-current` = `main` (lub merge PR do `main`). Workflow `deploy.yml` trigger: `push: branches: [main]`.

#### 2. Weryfikacja GitHub Secrets

**File:** (GitHub repo Settings → Secrets)

**Intent:** Build i deploy wymagają 4 sekretów — brak któregokolwiek = failed workflow.

**Contract:** Obecne: `SUPABASE_URL`, `SUPABASE_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Wartości muszą wskazywać prod Supabase i konto CF z Workerem `bassmap-pl`. Skrypt pomocniczy: `scripts/setup-deploy-secrets.ps1` (Windows).

#### 3. Push i auto-deploy

**File:** (operacja git)

**Intent:** Uruchomić pipeline CI (lint + build) i Deploy (wrangler) bez ręcznego `npm run deploy`.

**Contract:** `git push origin main` → GitHub Actions: job CI zielony, job Deploy zielony. Worker serwuje aktualny build z mapą, `/admin`, `/events/[id]`.

#### 4. Weryfikacja sekretów runtime Workera

**File:** (Cloudflare Dashboard lub CLI)

**Intent:** Worker w runtime musi mieć `SUPABASE_URL` i `SUPABASE_KEY` — inaczej banner „Supabase nie jest skonfigurowany”.

**Contract:** `npx wrangler secret list` (lub Dashboard → Workers → bassmap-pl → Settings → Variables) — oba sekrety obecne. Jeśli brak: `npx wrangler secret put SUPABASE_URL` i `SUPABASE_KEY`.

### Success Criteria:

#### Automated Verification:

- GitHub Actions workflow **CI** — success na ostatnim pushu do `main`
- GitHub Actions workflow **Deploy** — success na ostatnim pushu do `main`
- `npm run lint` — sukces
- `npm run build` — sukces

#### Manual Verification:

- `https://<domena.pl>/` zwraca stronę główną MVP (nie stary landing scaffoldu)
- Banner braku Supabase **nie** widoczny
- `https://<domena.pl>/auth/signin` — formularz logowania renderuje się

**Implementation Note:** Po deployu sprawdź GitHub Actions logi deploy — typowe błędy: wygasły `CLOUDFLARE_API_TOKEN`, zły `accountId`.

---

## Phase 4: Smoke test MVP i dokumentacja

### Overview

Pełna weryfikacja end-to-end MVP na produkcji oraz aktualizacja dokumentacji operacyjnej.

### Changes Required:

#### 1. Smoke test — fan discovery

**File:** (test manualny w przeglądarce)

**Intent:** Potwierdzić, że S-02 działa na Workers runtime z prod Supabase.

**Contract:** Checklist:

- `/` — strona ładuje się bez 500
- Admin dodał co najmniej 1 opublikowane wydarzenie — widać na liście
- Filtry miasto / podgatunek w URL działają
- Mapa Leaflet renderuje pinezki (wymaga `latitude`/`longitude` na evencie)
- Klik w wydarzenie → `/events/[id]` — pełne szczegóły
- Wydarzenia przeszłe / draft **nie** widoczne dla anon

#### 2. Smoke test — admin

**File:** (test manualny)

**Intent:** Potwierdzić S-01 na prod.

**Contract:**

- Logowanie `matrejekemilia@gmail.com` → dostęp do `/admin`
- CRUD: dodaj wydarzenie (z adresem) → geokodowanie Nominatim → pinezka na mapie
- Edycja i usunięcie wydarzenia działają
- Konto bez allowlist → `/admin` → `/403`
- Wylogowanie (`/api/auth/signout`) działa

#### 3. Logi produkcyjne

**File:** (CLI)

**Intent:** Wyłapać błędy runtime niewidoczne w UI.

**Contract:** `npx wrangler tail --status error` podczas smoke testu — brak powtarzalnych 500. Obserwowalność: Cloudflare Dashboard → Workers → bassmap-pl.

#### 4. Aktualizacja deploy-plan.md

**File:** `context/deployment/deploy-plan.md`

**Intent:** Zamienić dokument ze scope „scaffold smoke test” na pełny MVP prod — checklist, URL domeny, status migracji.

**Contract:** Zaktualizuj frontmatter: `deploy_scope: mvp-full`, `production_url: https://<domena.pl>`, checklist migracji i smoke test MVP. Usuń/przenieś przestarzałą linię o braku migracji events.

#### 5. Aktualizacja README.md

**File:** `README.md`

**Intent:** Nowy współpracownik widzi instrukcję prod: migracje, deploy, domena, gałąź `main`.

**Contract:** Sekcje Deployment i CI: gałąź `main` (nie `master`), krok `supabase db push` dla prod, link do `context/deployment/deploy-plan.md`, smoke test checklist (skrót).

#### 6. Poprawka gałęzi w docs

**File:** `AGENTS.md`, `CLAUDE.md`, `README.md`

**Intent:** Usunąć rozjazd master vs main — CI nie odpala się na `master`.

**Contract:** Wszystkie wzmianki „push/PR do master” → `main`.

#### 7. Preview deploy — dokumentacja fazy 2 (opcjonalnie)

**File:** `context/deployment/deploy-plan.md` (sekcja „Faza 2 — Preview”)

**Intent:** Opisać przyszły preview Worker na PR bez implementacji w F-03.

**Contract:** Krótki akapit: `wrangler deploy --env preview`, osobny Worker, sekrety — odłożone do osobnego change po F-03.

### Success Criteria:

#### Automated Verification:

- `npm run lint` — sukces po edycjach docs
- `npm run build` — sukces

#### Manual Verification:

- Pełny smoke test fan + admin (checklist powyżej) — pass
- `deploy-plan.md` opisuje MVP prod, nie scaffold
- `README.md` wspomina `main` i `supabase db push`
- Brak banneru Supabase na prod
- Rollback znany: `npx wrangler rollback` (tylko kod, nie DB)

**Implementation Note:** Po smoke teście dodaj pierwsze prawdziwe wydarzenia DnB przez panel admina — pusta strona po deployu to oczekiwane zachowanie (decyzja: brak seedu na prod).

---

## Testing Strategy

### Unit Tests:

- Brak test runnera w projekcie — F-03 polega na lint/build i smoke manualnym

### Integration Tests:

- `supabase db push` + SELECT w Studio (RLS, allowlist)
- GitHub Actions CI + Deploy pipeline end-to-end

### Manual Testing Steps:

1. Faza 1: Studio — tabele, allowlist, RLS deny dla anon INSERT
2. Faza 2: `curl -I https://<domena>` — 200/302, certyfikat valid
3. Faza 3: GitHub Actions green; strona główna MVP pod domeną
4. Faza 4: Fan flow (filtry, mapa, szczegóły) + admin CRUD + `/403` dla nie-admina
5. Faza 4: `wrangler tail` — brak error flood podczas testów
6. Przed publicznym launch (poza F-03): włącz confirm email w Supabase

## Performance Considerations

- Workers Free: 10ms CPU/invocation — mapa + SSR + Supabase round-trip monitorować w Observability po deployu
- Nominatim geokodowanie z IP Workera: respektuj User-Agent (`src/lib/geocoding/nominatim.ts`); przy wielu zapisach admina obserwuj rate limits
- Supabase free tier sleep: obudź przed demo; rozważ upgrade przed marketingiem
- Brak paginacji listy eventów (lesson w `context/foundation/lessons.md`) — OK na MVP, monitoruj przy wzroście danych

## Migration Notes

- **Prod apply:** `npx supabase link` + `npx supabase db push` — jednorazowo przy F-03; przyszłe migracje tym samym mechanizmem przed deployem kodu
- **Rollback DB:** nie automatyczny — wymaga ręcznego SQL lub restore backupu Supabase
- **Rollback Worker:** `npx wrangler rollback` — cofa kod, nie schema
- **Kolejność:** migracje DB **przed** deployem kodu zależnego od schematu

## References

- Operacyjny plan scaffold: `context/deployment/deploy-plan.md`
- Decyzja platformy: `context/foundation/infrastructure.md`
- Roadmap F-03: `context/foundation/roadmap.md`
- Migracje: `supabase/migrations/`
- CI/CD: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- Wrangler config: `wrangler.jsonc`
- Admin allowlist email: `supabase/migrations/20260610120000_fix_admin_allowlist_email.sql`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Baza produkcyjna Supabase

#### Automated

- [x] 1.1 `npx supabase db push` kończy się bez błędu (exit code 0) — cc3a94e
- [x] 1.2 `npm run lint` — sukces — cc3a94e
- [x] 1.3 `npm run build` — sukces — cc3a94e

#### Manual

- [x] 1.4 Supabase Studio: tabele `events` i `admin_allowlist` istnieją — cc3a94e
- [x] 1.5 Allowlist zawiera `matrejekemilia@gmail.com`; konto Auth istnieje — cc3a94e
- [x] 1.6 RLS: anon INSERT na `events` odrzucony — cc3a94e

### Phase 2: Domena `.pl` i DNS w Cloudflare

#### Automated

- [x] 2.1 `npx wrangler deployments list` — Worker `bassmap-pl` istnieje
- [x] 2.2 `npm run build` — sukces

#### Manual

- [x] 2.3 Strefa CF Active; Custom Domain Active z certyfikatem
- [x] 2.4 `curl -I https://<domena.pl>` — 200 lub 302
- [x] 2.5 Supabase Auth URLs wskazują domenę `.pl`

### Phase 3: Deploy kodu MVP (CI/CD)

#### Automated

- [ ] 3.1 GitHub Actions CI — success na push do `main`
- [ ] 3.2 GitHub Actions Deploy — success
- [ ] 3.3 `npm run lint` — sukces
- [ ] 3.4 `npm run build` — sukces

#### Manual

- [ ] 3.5 Strona główna MVP pod domeną `.pl` (nie stary scaffold)
- [ ] 3.6 Brak banneru Supabase; `/auth/signin` renderuje się

### Phase 4: Smoke test MVP i dokumentacja

#### Automated

- [ ] 4.1 `npm run lint` — sukces po edycjach docs
- [ ] 4.2 `npm run build` — sukces

#### Manual

- [ ] 4.3 Smoke test fan: lista, filtry, mapa, `/events/[id]`
- [ ] 4.4 Smoke test admin: CRUD, geokodowanie, `/403` dla nie-admina
- [ ] 4.5 `deploy-plan.md` i `README.md` zaktualizowane; gałąź `main` w docs

# App shell, strona główna i nawigacja gościa – Implementation Plan

## Overview

Jeden pionowy slice łączący roadmapę **F-04** + minimalną **S-09** + minimalną **S-10** (`change-id`: **`app-shell-navigation`**). Gość wchodzi na **`/`** – dynamiczną stronę marketingową (scroll, typografia, stonowane neony); odkrywanie (lista + mapa + filtry) przechodzi na **`/events`**; globalne menu w kafelku (Sheet); archiwum przeszłych eventów pod **`/archive`**; formularz „Zgłoś problem” pod **`/report-issue`** wysyła e-mail na **kontakt@bassmap.pl**. **Adresy URL po angielsku** (2026-06-14, plan-review). Decyzje produktowe: `frame.md` (2026-06-14), research UI: `research.md`.

## Current State Analysis

- **`Layout.astro`** – tylko `<html>`, Banner, CookieConsent; **brak** globalnego shellu (`src/layouts/Layout.astro` L15–43).
- **`Topbar.astro`** – poziomy pasek linków (Wydarzenia → `/`, auth, admin); **bez** menu mobilnego / Sheet (`src/components/Topbar.astro` L5–42).
- **`index.astro`** – obecny discovery: `Topbar` + `DiscoveryShell` + `RoadmapTeaser` + `SiteFooter` (`src/pages/index.astro` L33–51).
- **Filtry GET** – `EventFilters` `action="/"`; `DateRangeFilter.buildFilterHref` buduje `/?…` (`EventFilters.tsx` L15–18, `DateRangeFilter.tsx` L98–104).
- **`listPublishedEvents`** – tylko nadchodzące `published` (`events.ts` L147–184); **brak** `listArchivedEvents`.
- **RLS** – `events_select_public` tylko `is_upcoming(starts_at)` (`20260610100000_create_events.sql` L144–151); **brak** polityki na przeszłe eventy.
- **E-mail** – brak API kontaktowego; `wrangler.jsonc` bez `send_email`; Resend wzmiankowany tylko w polityce prywatności.
- **shadcn** – brak `sheet`; jest `calendar`, `popover`, `button` itd.
- **Fonty** – domyślny stack systemowy; `bg-cosmic` gradient już jest (`global.css` L113–115).
- **Strony z Topbar** (do migracji na AppShell): `index.astro`, `events/[id].astro`, `admin/*`, `LegalDocumentShell`; auth/dashboard/403 – osobny wzorzec.
- **Testy** – brak odwołań do `/`; integracje `listPublishedEvents` wykluczają `published-past` (`tests/integration/fan-read-list.test.ts`).
- **Lesson** – publiczne read filtrują jawne `published` + nadchodzące w serwisie, nie tylko RLS (`context/foundation/lessons.md`).

### Key Discoveries

- Research rekomenduje **zostać przy Astro + React islands + Tailwind + shadcn**; dodać tokeny „Muted Neon DnB” i fonty display (**Orbitron** + **Inter** – decyzja wizualna 2026-06-14; wcześniejsza propozycja Space Grotesk).
- Frame zaleca **jeden plan**, 5 faz – nie rozdzielać PR na F-04 / S-09 / S-10 na start.
- Redirect `/?…` → `/events?…` najlepiej w **middleware** (302 przed renderem).
- Archiwum: spójność z `is_upcoming()` – serwis **i** nowa polityka RLS `NOT is_upcoming(starts_at)`.
- Po wdrożeniu homepage usunąć wpis `marketing-homepage` z `src/data/public-roadmap.ts` (reguła AGENTS.md).

## Desired End State

1. **`/`** – strona marketingowa: hero (typografia BassMap PL + slogan), CTA „Znajdź swój event!” → `/events`, sekcja „Kim jesteśmy…”, kontakt mailto, dyskretne linki prawne.
2. **`/events`** – dotychczasowy discovery (SSR, filtry, mapa); bez `RoadmapTeaser`.
3. **Redirect** – `GET /?{query}` (jakikolwiek query string) → **302** `GET /events?{query}`.
4. **App shell** – globalny kafelek menu (Sheet) na stronach produktowych; glass panel; fonty display; tokeny neon sky/emerald.
5. **Menu gościa** – Lista eventów, Zaloguj się, Zarejestruj się, Zgłoś problem, Archiwum wydarzeń; dla zalogowanego: + Dashboard, Wyloguj; dla admina: + Panel admina (minimalne rozszerzenie bez S-12).
6. **`/archive`** – lista przeszłych `published` eventów, sort malejąco po `starts_at`, **bez mapy**.
7. **`/report-issue`** – formularz (e-mail, treść) → API → mail na kontakt@bassmap.pl (Cloudflare Email Sending).
8. Wszystkie hardcoded linki do discovery (`action="/"`, `href="/"` w kontekście listy) wskazują **`/events`**.
9. Po logowaniu redirect na **`/`** (strona główna).
10. CI: `npm run lint`, `npm run build`, `npm test` zielone.

### Weryfikacja ręczna

- `/` – scroll, animacje respektują `prefers-reduced-motion`, CTA działa.
- `/events` – filtry, mapa, presety dat – jak dziś na starym `/`.
- `/?city=Warszawa&subgenre=Neurofunk` → 302 → `/events?…` z tymi samymi parametrami.
- `/archive` – widać tylko przeszłe published; brak mapy; admin draftów nie widać.
- `/report-issue` – wysłanie formularza → mail na skrzynkę (lub komunikat błędu gdy binding nie skonfigurowany lokalnie).
- Menu – wszystkie pozycje gościa; na mobile Sheet się otwiera.
- `/events/[id]` – link „Wróć do listy” → `/events`.
- Regresja admin panelu i stron prawnych.

## What We're NOT Doing

- Pełna nawigacja fana (S-12): profil, moje eventy, dodaj event.
- Logo/grafiki – tylko typografia (zgodnie z frame).
- WebGL / ciężkie efekty na całej aplikacji.
- Ticket „zgłoś problem” w bazie danych.
- Filtry na stronie archiwum (MVP: płaska lista).
- Zmiana stacku (Next.js rewrite).
- Aktualizacja `prd.md` (osobna decyzja).
- Zamknięcie issue #22 / #23 na GitHub – dopiero przy `/10x-archive` po weryfikacji zakresu S-09/S-10 w tym slice.
- Usunięcie `Topbar.astro` z repo dopóki nie zostanie zastąpiony – usunąć na końcu fazy 5.

## Implementation Approach

Pięć faz zgodnie z `frame.md`: (1) fundament wizualny + AppShell + Sheet, (2) routing discovery + redirect, (3) homepage, (4) archiwum + kontakt + menu, (5) linki, testy, roadmapa publiczna. Zachować SSR i wzorzec GET filtrów z S-02/S-05.

## Critical Implementation Details

### Stałe tras

**File**: `src/lib/routes.ts` (nowy)

```typescript
export const HOME_PATH = "/";
export const DISCOVERY_PATH = "/events";
export const ARCHIVE_PATH = "/archive";
export const REPORT_ISSUE_PATH = "/report-issue";
export const CONTACT_EMAIL = "kontakt@bassmap.pl";

/** Pełny URL listy z filtrami – używany w EventFilters, DateRangeFilter, redirectach */
export function buildDiscoverySearchUrl(filters: FanEventFilters): string {
  const qs = buildFanFilterSearchParams(filters).toString();
  return qs ? `${DISCOVERY_PATH}?${qs}` : DISCOVERY_PATH;
}
```

**Konwencja URL (2026-06-14):** nowe trasy publiczne po angielsku (`/events`, `/archive`, `/report-issue`). Istniejące strony prawne **bez zmian** (`/polityka-prywatnosci`, `/regulamin` – już na produkcji).

**Faza 1 → 2:** w fazie 1 ustaw tymczasowo `DISCOVERY_PATH = "/"` (discovery jeszcze na starej stronie); w fazie 2 zmień na `"/events"` razem z `events.astro` – unika martwych linków w menu.

Wszystkie komponenty budujące URL filtrów importują `DISCOVERY_PATH` / `buildDiscoverySearchUrl` zamiast literału `"/"`.

### Redirect filtrów ze starej strony głównej

W `src/middleware.ts`, **przed** `return next()`:

```typescript
if (pathname === "/" && context.url.search.length > 1) {
  return context.redirect(`${DISCOVERY_PATH}${context.url.search}`, 302);
}
```

(`search` zawiera `?` – np. `?city=…`.)

### App shell – struktura komponentów

```
Layout.astro (font linki w <head>)
  └── AppShell.astro
        ├── AppMenu.tsx (React island, client:load) – Sheet + pozycje menu
        ├── opcjonalny slot nagłówka strony
        ├── <slot /> treść
        └── SiteFooter (gdzie dotychczas był)
```

- **AppMenu.tsx** – `npx shadcn@latest add sheet`; trigger: mały kafelek (hamburger / „Menu”) sticky w rogu; panel glass; `prefers-reduced-motion` wyłącza animacje Sheet.
- **AppShell.astro** – props: `title?`, `showFooter?: boolean` (domyślnie true); owija `bg-cosmic min-h-screen` jak dziś.
- Zastąpić importy `Topbar` → `AppShell` na stronach produktowych.

### Tokeny designu i fonty

**File**: `src/styles/global.css`

Dodać w `:root` / `@theme inline`:

| Token | Wartość (propozycja) | Użycie |
|-------|----------------------|--------|
| `--neon-sky` | `oklch(0.78 0.12 220)` | linki aktywne, focus |
| `--neon-emerald` | `oklch(0.78 0.14 155)` | CTA primary |
| `--text-muted-dnb` | `oklch(0.75 0.02 250)` | copy drugorzędny |

**File**: `src/layouts/Layout.astro` – w `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Orbitron:wght@500;700;800;900&display=swap" rel="stylesheet" />
```

Klasy utility: `font-heading` / `font-display` → Orbitron, body → Inter (w `@layer base`).

Stopniowo zamieniać `purple-*` na `sky-*` / `emerald-*` **tylko w nowych komponentach shell/homepage** – nie masowy refactor formularzy admina w tym slice.

### Archiwum – DB, RLS, serwis

**Migracja**: `supabase/migrations/20260614120000_events_select_archive.sql`

```sql
CREATE POLICY events_select_past_public
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND NOT public.is_upcoming(starts_at)
  );
```

**Serwis** – `listArchivedEvents(supabase, limit?)` w `src/lib/services/events.ts`:

- `.eq("status", "published")`
- `.lt("starts_at", getStartOfTodayWarsawUtcIso())` – jawny filtr (lesson); semantycznie zgodne z `NOT is_upcoming` dla pełnych dni kalendarzowych
- `.order("starts_at", { ascending: false })`
- Opcjonalny `.limit(200)` na MVP

**UI** – `src/pages/archive.astro`: AppShell + **`ArchiveEventList.tsx`** (nowy) – karty jako linki `<a href="/events/{id}">`, **nie** reuse `EventList.tsx` (ten komponent używa `button` + `onSelectEvent` pod synchronizację z mapą). Reuse `enrichEventWithCoverUrl`, `formatEventDate`, `EventCoverImage`. Pusty stan: „Brak archiwalnych wydarzeń.”

### Formularz „Zgłoś problem”

**Ścieżka**: `/report-issue` (URL po angielsku; **etykieta UI po polsku**: „Zgłoś problem”).

**API**: `src/pages/api/contact/report-issue.ts` – `POST`, `prerender = false`, walidacja Zod:

- `email` – wymagany, poprawny format
- `message` – wymagany, min 10, max 5000 znaków
- opcjonalnie `name` – max 120

**Wysyłka** – Cloudflare Email Workers binding:

1. `wrangler.jsonc`: `"send_email": [{ "name": "EMAIL" }]`
2. Produkcja: `npx wrangler email sending enable bassmap.pl` (jednorazowy krok operatorski – dokumentować w README/deploy notes).
3. W handlerze: `await env.EMAIL.send({ to: CONTACT_EMAIL, from: { email: "noreply@bassmap.pl", name: "BassMap PL" }, replyTo: submitterEmail, subject: "Zgłoszenie problemu – BassMap PL", text, html })`.
4. Typ bindingu w `src/env.d.ts` / Cloudflare types.
5. **Dostęp w Astro API route** (Cloudflare adapter): `const runtime = (context.locals as { runtime?: { env: Env } }).runtime; const email = runtime?.env?.EMAIL;` – jeśli brak bindingu, 503.
6. **Lokalny dev**: gdy binding niedostępny – zwrócić 503 z komunikatem (nie udawać sukcesu).

**Strona**: `src/pages/report-issue.astro` + `ReportIssueForm.tsx` (React) – pola + komunikat sukcesu/błędu; wzorzec jak `SignInForm.tsx`.

### Homepage `/`

**File**: `src/pages/index.astro` – zastąpić discovery:

- Sekcje jako komponenty Astro: `HomeHero.astro`, `HomeCta.astro`, `HomeAbout.astro`, `HomeContact.astro`, `HomeLegalLinks.astro`
- Copy z `frame.md` § sekcje (slogan, kim jesteśmy, kontakt)
- Lekki CSS gradient animation na hero (`@keyframes` + `motion-safe:`); `@media (prefers-reduced-motion: reduce)` → statyczne tło
- AppShell z menu od razu widocznym

**File**: `src/pages/events.astro` – przenieść logikę z obecnego `index.astro` (parseFanFilters, listPublishedEvents, DiscoveryShell).

### Aktualizacja linków wewnętrznych

| Plik | Zmiana |
|------|--------|
| `EventFilters.tsx` | `action={DISCOVERY_PATH}`, clear → `DISCOVERY_PATH` |
| `DateRangeFilter.tsx` | `buildFilterHref` → `${DISCOVERY_PATH}?…` |
| `events/[id].astro` | „Wróć” / breadcrumb → `DISCOVERY_PATH` |
| `Topbar.astro` | usunąć po migracji |
| `signin.ts`, `signout.ts` | redirect → `HOME_PATH` (`/`); signout → `/` |
| `403.astro` | link → `HOME_PATH` |

---

## Phase 1: Tokeny designu, fonty, AppShell i Sheet

### Overview

Fundament wizualny i wspólny szkielet bez zmiany routingu discovery (jeszcze na `/`).

### Changes Required

#### 1. Tokeny CSS i fonty

**Files**: `src/styles/global.css`, `src/layouts/Layout.astro`

**Intent**: Wprowadzić paletę „Muted Neon DnB” i fonty display bez psucia istniejących formularzy.

#### 2. Stałe tras

**File**: `src/lib/routes.ts`

#### 3. shadcn Sheet

```bash
npx shadcn@latest add sheet
```

Dostosować `sheet.tsx` do ciemnego tła (`border-white/10`, `bg-slate-950/90`).

#### 4. AppMenu + AppShell

**Files**:

- `src/components/shell/AppMenu.tsx` – React, menu gościa + rozszerzenia auth/admin; **props serializowane z Astro** (`userEmail: string | null`, `isAdmin: boolean`) – nie przekazywać całego obiektu `user` do islandu
- `src/components/shell/AppShell.astro` – layout wrapper, renderuje AppMenu z `client:load`

**Contract AppMenu** – pozycje (gość):

| Etykieta | href |
|----------|------|
| Lista eventów | `/events` (na tej fazie jeszcze `/` – zaktualizować w fazie 2) |
| Zaloguj się | `/auth/signin` |
| Zarejestruj się | `/auth/signup` |
| Zgłoś problem | `REPORT_ISSUE_PATH` (`/report-issue`) |
| Archiwum wydarzeń | `ARCHIVE_PATH` (`/archive`) |

#### 5. Podpięcie próbne

**File**: `src/pages/index.astro` – zamienić `Topbar` na `AppShell` (treść discovery bez zmian) – weryfikacja shellu przed routingiem.

### Success Criteria

#### Automated

- [ ] 1.1 `npm run lint` przechodzi
- [ ] 1.2 `npm run build` przechodzi
- [ ] 1.3 Sheet komponent istnieje w `src/components/ui/sheet.tsx`

#### Manual

- [ ] 1.4 Menu otwiera się na desktop i mobile; reduced motion OK
- [x] 1.5 Fonty Orbitron + Inter widoczne w nagłówku menu / hero

---

## Phase 2: `/events`, przeniesienie discovery i redirect

### Overview

Discovery pod `/events`; redirect starych URL; filtry i API auth wskazują nową ścieżkę.

### Changes Required

#### 1. Strona discovery

**File**: `src/pages/events.astro` – skopiować SSR z `index.astro`; `AppShell` zamiast `Topbar`; **bez** `RoadmapTeaser`.

#### 2. Redirect middleware

**File**: `src/middleware.ts` – reguła `/?query` → `/events?query` (302).

#### 3. Filtry i nawigacja client-side

**Files**: `EventFilters.tsx`, `DateRangeFilter.tsx`, `src/lib/routes.ts`

- `action` / `buildFilterHref` / „Wyczyść” → `DISCOVERY_PATH`

#### 4. AppMenu

Zaktualizować „Lista eventów” → `DISCOVERY_PATH`.

#### 5. Tymczasowy placeholder `/`

**File**: `src/pages/index.astro` – minimalna strona „Wkrótce” **lub** od razu pełna homepage (jeśli faza 3 robiona w tej samej sesji – preferowane **przejście prosto do fazy 3** bez placeholdera).

#### 6. Linki powrotu

**File**: `src/pages/events/[id].astro` – linki do `DISCOVERY_PATH`.

#### 7. Auth redirecty

**Files**: `src/pages/api/auth/signin.ts`, `signout.ts` → redirect `HOME_PATH` (`/`).

### Success Criteria

#### Automated

- [ ] 2.1 `npm run lint` / `build` / `test` zielone
- [ ] 2.2 Test jednostkowy helpera URL (opcjonalnie `tests/unit/routes.test.ts` dla `buildDiscoveryUrl(searchParams)`)

#### Manual

- [ ] 2.3 `/events` – pełny discovery jak stary `/`
- [ ] 2.4 `/?city=…` → 302 → `/events?city=…`
- [ ] 2.5 Filtry submit/presety/clear – URL pod `/events`
- [ ] 2.6 Logowanie przekierowuje na `/` (strona główna)

---

## Phase 3: Marketing homepage `/`

### Overview

Nowa strona główna z sekcjami scroll zgodnie z `frame.md`.

### Changes Required

#### 1. Komponenty sekcji

**Directory**: `src/components/home/`

| Komponent | Zawartość |
|-----------|-----------|
| `HomeHero.astro` | BassMap PL (font-display), slogan, animated cosmic bg |
| `HomeCta.astro` | Przycisk „Znajdź swój event!” → `DISCOVERY_PATH` |
| `HomeAbout.astro` | Copy „Kim jesteśmy…” z frame |
| `HomeContact.astro` | Sugestie/współpraca + mailto `CONTACT_EMAIL` |
| `HomeLegalLinks.astro` | Polityka + Regulamin (`text-white/40`) |

#### 2. Strona główna

**File**: `src/pages/index.astro` – AppShell + sekcje; `Layout title` z sloganem.

#### 3. SEO

Upewnić się, że `sitemap` integracja obejmuje `/` i `/events` (domyślnie Astro sitemap – bez zmian jeśli strony istnieją).

### Success Criteria

#### Automated

- [x] 3.1 `npm run lint` / `build` zielone

#### Manual

- [ ] 3.2 Płynny scroll; CTA prowadzi do `/events`
- [ ] 3.3 Copy zgodne z frame; linki prawne działają
- [ ] 3.4 `prefers-reduced-motion` – brak animacji hero

---

## Phase 4: Archiwum, formularz problemu, menu (S-10)

### Overview

Backend archiwum (RLS + serwis), strona `/archive`, kontakt e-mail, dokończenie pozycji menu.

### Changes Required

#### 1. Migracja RLS

**File**: `supabase/migrations/20260614120000_events_select_archive.sql`

#### 2. Serwis archiwum

**File**: `src/lib/services/events.ts` – `listArchivedEvents`

#### 3. Strona archiwum

**Files**: `src/pages/archive.astro`, `src/components/archive/ArchiveEventList.tsx`

#### 4. Cloudflare Email

**Files**: `wrangler.jsonc`, `src/pages/api/contact/report-issue.ts`, `src/pages/report-issue.astro`, `src/components/contact/ReportIssueForm.tsx`

**Operatorski krok** (poza kodem): włączyć Email Sending dla `bassmap.pl`.

#### 5. Walidacja Zod

**File**: `src/lib/contact/report-issue-schema.ts` + `tests/unit/report-issue-schema.test.ts`

### Success Criteria

#### Automated

- [ ] 4.1 `npm run lint` / `build` / `test` zielone
- [ ] 4.2 Test integracyjny `listArchivedEvents` z fixture `published-past` (`tests/integration/archive-list.test.ts`)
- [ ] 4.3 Testy schema formularza

#### Manual

- [ ] 4.4 `/archive` pokazuje przeszłe eventy; nadchodzące nie
- [ ] 4.5 Formularz wysyła mail na produkcji (lub 503 z czytelnym komunikatem na dev)
- [ ] 4.6 Menu – wszystkie 5 pozycji gościa działa

---

## Phase 5: Porządki, testy, roadmapa publiczna

### Overview

Usunięcie martwego kodu, migracja pozostałych stron na AppShell, aktualizacja `public-roadmap.ts`, regresja.

### Changes Required

#### 1. Migracja layoutów

**Files**: `LegalDocumentShell.astro`, `events/[id].astro`, `admin/index.astro`, `admin/events/new.astro`, `admin/events/[id]/edit.astro` – `AppShell` zamiast `Topbar`.

Opcjonalnie: auth strony dostają **tylko** mały link „Menu” / powrót na `HOME_PATH` (bez pełnego shellu – zachować skupienie na formularzu).

#### 2. Usunięcie Topbar

**File**: `src/components/Topbar.astro` – delete po braku importów.

#### 3. Public roadmap

**File**: `src/data/public-roadmap.ts` – usunąć `marketing-homepage` (dostarczone w tym slice).

**File**: `src/pages/events.astro` – upewnić się, że `RoadmapTeaser` nie jest renderowany.

#### 4. Testy regresji URL

**Files**: `tests/unit/fan-schema.test.ts` – bez zmian semantyki parametrów; ewentualnie test `buildFanFilterSearchParams` + prefix path w nowym helperze `buildDiscoverySearchUrl(filters)` w `routes.ts`.

#### 5. Dokumentacja operatorska

Krótka notatka w `context/deployment/deploy-plan.md` lub komentarz w planie: Email Sending enable + SPF/DKIM (już na Cloudflare dla domeny).

### Success Criteria

#### Automated

- [ ] 5.1 `npm run lint` / `build` / `test` – pełna regresja
- [ ] 5.2 Brak importów `Topbar` w `src/` (grep)

#### Manual

- [ ] 5.3 Admin panel – nawigacja działa
- [ ] 5.4 Strony prawne – layout spójny
- [ ] 5.5 Signup/signin flow – footer i linki OK
- [ ] 5.6 Brak regresji na https://bassmap.pl po deploy

---

## Risks and Mitigations

| Ryzyko | Mitygacja |
|--------|-----------|
| Email Sending nie skonfigurowany na produkcji | Jawny komunikat 503; krok w deploy checklist; mailto jako fallback w stopce |
| Duży refactor layoutu psuje admin | Migrować strony jedna po drugiej; manualna regresja `/admin` |
| RLS + serwis niespójne dla archiwum | Użyć `getStartOfTodayWarsawUtcIso()` + `NOT is_upcoming` w polityce; test integracyjny |
| Spam na formularzu kontaktowym | MVP bez Turnstile; ewentualnie w kolejnym slice; walidacja Zod + sensowny limit długości |
| Dwa razy przebudowa filtrów | Faza 2 od razu po AppShell – jedna zmiana `DISCOVERY_PATH` |

## Deploy Notes

1. `npx supabase db push` (lub migracja w CI) – polityka archiwum.
2. `npx wrangler email sending enable bassmap.pl` – przed pierwszym wysłaniem formularza.
3. Deploy: `npx wrangler deploy` po merge.
4. Po deploy: sprawdzić redirect `/?city=…` i formularz kontaktowy.

## Plan Review

Szczegółowy przegląd: `plan-review.md` (2026-06-14). Werdykt: **zatwierdzony z poprawkami** – gotowy pod `/10x-implement`.

## References

- Plan review: `context/changes/app-shell-navigation/plan-review.md`
- Frame: `context/changes/app-shell-navigation/frame.md`
- Research UI: `context/changes/app-shell-navigation/research.md`
- Roadmap F-04 / S-09 / S-10: `context/foundation/roadmap.md`
- Lesson fan read: `context/foundation/lessons.md`
- Wzorzec planu filtrów: `context/archive/2026-06-13-date-range-filter/plan.md`
- RLS baseline: `supabase/migrations/20260610100000_create_events.sql`
- Cloudflare Email: skill `cloudflare-email-service`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` – <commit sha>` when a step lands.

### Phase 1: Tokeny designu, fonty, AppShell i Sheet

#### Automated

- [x] 1.1 Tokeny neon + fonty w `global.css` / `Layout.astro`
- [x] 1.2 `src/lib/routes.ts`
- [x] 1.3 shadcn `sheet` zainstalowany
- [x] 1.4 `AppShell.astro` + `AppMenu.tsx`
- [x] 1.5 `npm run lint` / `build`

#### Manual

- [ ] 1.6 Menu Sheet na dev – desktop + mobile

### Phase 2: `/events`, discovery i redirect

#### Automated

- [x] 2.1 `events.astro` z logiką discovery
- [x] 2.2 Redirect w `middleware.ts`
- [x] 2.3 Filtry → `DISCOVERY_PATH`
- [x] 2.4 Auth redirecty
- [x] 2.5 `npm run lint` / `build` / `test`
- [x] 2.6 Test `tests/unit/routes.test.ts`
- [x] 2.7 Strony prawne: `/privacy-policy`, `/terms` + redirect ze starych slugów

#### Manual

- [ ] 2.8 Redirect i filtry – regresja manualna

### Phase 3: Marketing homepage `/`

#### Automated

- [x] 3.1 Komponenty `src/components/home/*`
- [x] 3.2 Nowy `index.astro`
- [x] 3.3 `npm run lint` / `build`

#### Manual

- [ ] 3.4 Wizualna akceptacja strony głównej (scroll, CTA, copy)

### Phase 4: Archiwum, kontakt, menu S-10

#### Automated

- [x] 4.1 Migracja RLS archiwum
- [x] 4.2 `listArchivedEvents` + test integracyjny
- [x] 4.3 `/archive` + `/report-issue` + API e-mail
- [x] 4.4 Testy schema formularza
- [x] 4.5 `npm run lint` / `build` zielone; `test` – archive wymaga `supabase db push` (impl-review 2026-06-14)

#### Manual

- [ ] 4.6 Archiwum i formularz na dev/produkcji

### Phase 5: Porządki i roadmapa publiczna

#### Automated

- [x] 5.1 AppShell na pozostałych stronach; usunięcie Topbar (impl-review 2026-06-14)
- [x] 5.2 `public-roadmap.ts` wyczyszczony (`marketing-homepage` usunięty)
- [x] 5.3 `npm run lint` / `build` zielone; `test` – patrz impl-review F2/F10

#### Manual

- [ ] 5.4 Regresja admin + auth + legal
- [ ] 5.5 Weryfikacja produkcyjna po deploy

## Addendum (impl-review 2026-06-14)

| Temat | Ustalenie |
|-------|-----------|
| Migracja archiwum | `20260615120000` na remote |
| Smooth scroll (Lenis) | Włączony na `/` |
| Font display | Orbitron + Inter |

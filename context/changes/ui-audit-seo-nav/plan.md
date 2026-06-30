# Audyt UI – SEO, SSR discovery, nawigacja – Implementation Plan

## Overview

Domknięcie uwag z audytu UI BassMap: treść listy wydarzeń w pierwszym HTML (`/events`), pełne meta/OG/Twitter Card, widoczna nawigacja i CTA w SSR, wzmocnienie strony głównej (drugi CTA, social proof, teaser mapy), rozszerzona stopka, spójność Regulaminu z Polityką w kwestii komentarzy oraz drobne UX na stronach prawnych.

## Current State Analysis

### Key Discoveries

- `src/pages/events.astro` pobiera eventy na serwerze, ale `DiscoveryShell` z `client:only="react"` powoduje, że jedyny SSR to fallback „Ładowanie listy wydarzeń…" (`events.astro:69-76`).
- `src/pages/archive.astro` pokazuje działający wzorzec: komponent React bez dyrektywy `client:` renderuje statyczny HTML z linkami i datami.
- `src/layouts/Layout.astro` eksponuje tylko `title` i opcjonalne `og:image`; brak `description`, `og:title`, `og:description`, `twitter:card`.
- `src/pages/events/[id].astro` przekazuje `ogImage` z okładki – reszta tagów nadal brak.
- `AppMenu` (`client:only`) ukrywa login, rejestrację i „Dodaj wydarzenie" za hydratacją; hamburger na desktopie.
- `lessons.md`: Radix Checkbox w `SubgenreFilter` wymusza `client:only` na całym `DiscoveryShell` – nie wolno przejść na `client:load` bez refaktoru filtrów.
- Regulamin: komentarze pod wydarzeniami w §5.13–5.14; §2 Usługi ich nie wymienia wprost (audyt częściowo nieaktualny).
- `lang="pl"` i `viewport` z `initial-scale=1` są już w `Layout.astro` – brak osobnej pracy na stronach prawnych.

## Desired End State

Po wdrożeniu:

1. **View Source / `curl` na `/events`** zawiera `<h2>`/`<a>` z nazwami wydarzeń, datami i miastami (min. tyle, ile zwraca `listPublishedEvents` bez filtrów).
2. **Udostępnianie linków** (`/`, `/events`, `/events/[id]`) generuje podgląd z tytułem, opisem i obrazem (domyślny lub okładka).
3. **Nagłówek SSR** na desktopie: widoczne linki do listy, zgłoszenia eventu i logowania (lub skróty dla zalogowanego).
4. **Home:** dwa CTA, linia social proof (liczba eventów i miast), sekcja wizualna zachęcająca do mapy.
5. **Stopka:** kontakt, zgłoś event, social (jeśli skonfigurowane), polityka, regulamin.
6. **Regulamin §2** wymienia komentarze pod wydarzeniami; `LEGAL_UPDATED_AT` zaktualizowany.

### Weryfikacja ręczna (checklist)

- [ ] View Source `/events` – widać nazwy eventów
- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) lub Discord – podgląd `/` i `/events`
- [ ] Nagłówek bez JS (disable JS w DevTools) – linki Zaloguj / Zgłoś event
- [ ] Home – dwa przyciski w hero
- [ ] `/terms` – link „Strona główna" + bullet komentarze w §2

## What We're NOT Doing

- FAQ, blog, pełna przebudowa information architecture
- Paginacja lub virtual scroll listy eventów
- `client:load` na `DiscoveryShell` bez wymiany Radix Checkbox na natywny input
- Osobny endpoint OG image generator (dynamic PNG)
- Tłumaczenie copy na EN
- Nowe tabele DB lub migracje Supabase

## Implementation Approach

Sześć faz sekwencyjnych. Faza 1 jest blockerem SEO; faza 2 może startować równolegle po zatwierdzeniu kontraktu `Layout` props. Fazy 3–5 to warstwa produktowa/UX. Faza 6 zamyka testami.

Strategia SSR na `/events`: **progressive enhancement** – bogaty Astro fallback w `client:only` + współdzielone helpery formatowania (`formatEventDate`, `formatEventVenueLine`) już używane w TS; markup listy w Astro mirroruje pola widoczne dla crawlerów (nazwa, data, miejsce, cena, link).

## Critical Implementation Details

**Radix:** `DiscoveryShell` pozostaje `client:only="react"`. SSR listy idzie wyłącznie przez slot `fallback` lub rodzeństwo w DOM – nie przez hydratację `EventList` na serwerze.

**Duplikacja markupu:** Wydziel `src/lib/events/discovery-card-fields.ts` (lub użyj istniejących `format*` z `@/lib/events/format` w Astro frontmatter) – Astro i React czytają te same funkcje formatujące; unikaj trzeciej kopii stringów.

**LEGAL_UPDATED_AT:** Po edycji `terms.astro` zaktualizuj `src/lib/legal/paths.ts` zgodnie z AGENTS.md.

---

## Phase 1: SSR treści na `/events`

### Overview

Crawler, screen reader przy wolnym JS i boty social widzą listę wydarzeń w pierwszym HTML. Interaktywność (mapa, filtry dat/podgatunków, RSVP) nadal po hydratacji.

### Changes Required

#### 1. Statyczna lista wydarzeń (Astro)

**File:** `src/components/discovery/EventDiscoveryListStatic.astro` (nowy)

**Intent:** Renderuje semantyczną listę `<ul>`/`<article>` z linkami do `/events/[id]`, nazwą, datą (`formatEventDate`), miejscem (`formatEventVenueLine`), ceną (`formatEventPrice`), opcjonalnie podgatunkami jako tekst. Bez przycisków RSVP – link „Zobacz" wystarczy dla SEO.

**Contract:** Props: `events: EventWithCoverUrl[]`, `hasActiveFilters: boolean`, `listError: string | null`. Pusty stan jak w `EventList.tsx` (copy PL).

#### 2. Opcjonalny statyczny formularz filtrów

**File:** `src/components/discovery/EventFiltersStatic.astro` (nowy, opcjonalny w tej fazie – zalecany)

**Intent:** GET form do `DISCOVERY_PATH` z `<select name="city">` i checkboxem `free=1` – działa bez JS (wzorzec z `EventFilters.tsx` linie 17–63). Bez DateRange i SubgenreFilter (wymagają JS).

**Contract:** Props: `cities: string[]`, `currentFilters: FanEventFilters`.

#### 3. Podpięcie w stronie events

**File:** `src/pages/events.astro`

**Intent:** W `slot="fallback"` `DiscoveryShell` umieścić nagłówek H1, `EventFiltersStatic` (jeśli gotowy), komunikat błędu, `EventDiscoveryListStatic`. Usunąć copy „Ładowanie listy wydarzeń…" jako jedyną treść.

**Contract:** `client:only="react"` na `DiscoveryShell` **bez zmian**. Fallback musi zawierać pełną listę dla aktualnych `events` z SSR.

#### 4. Meta props na stronie listy

**Przeniesione do Fazy 2** – `pageDescription` i przekazanie do `Layout` po rozszerzeniu props (unikamy martwego kodu w Fazie 1).

### Success Criteria

#### Automated Verification

- `npm run check`
- `npm run lint:all`
- `npm run test` (w tym `tests/unit/event-discovery-ssr.test.ts`, jeśli helper opisu wydzielony)
- Zaktualizować `tests/e2e/smoke.spec.ts`: asercja na nazwę eventu lub link w `page.content()` zamiast znikania „Ładowanie listy wydarzeń…"

#### Manual Verification

- View Source `/events` – HTML zawiera tekst nazwy co najmniej jednego opublikowanego eventu
- Wyłącz JS – lista linków nadal klikalna; filtr miasta (jeśli zaimplementowany) przeładowuje stronę
- Po włączeniu JS – mapa i filtry działają jak dotąd; brak błędów w konsoli

---

## Phase 2: Meta description i Open Graph (globalnie)

### Overview

Spójny zestaw tagów SEO i social sharing na wszystkich publicznych stronach.

### Changes Required

#### 1. Rozszerzenie Layout

**File:** `src/layouts/Layout.astro`

**Intent:** Dodać props i render:

- `description?: string` → `<meta name="description">`
- `canonicalPath?: string` → `<link rel="canonical">` via `absoluteUrl()`
- `ogTitle?: string` (default: `title`)
- `ogDescription?: string` (default: `description`)
- `ogImage?: string` → `absoluteUrl()` jeśli ścieżka względna
- `ogType?: string` (default: `website`; event detail: `article` opcjonalnie)
- `twitter:card` = `summary_large_image`
- `twitter:title`, `twitter:description`, `twitter:image` (mirror OG)

**Contract:** Wszystkie ścieżki obrazków absolutne w `content`. Dla `ogImage`: jeśli wartość zaczyna się od `http`, użyj as-is; w przeciwnym razie `absoluteUrl(ogImage)`. Domyślny `ogImage`: `/og-default.png` (nowy plik) lub istniejący `/pwa-512x512.png`.

#### 2. Domyślna grafika OG

**File:** `public/og-default.png` (nowy – eksport z `pwa-512x512.png` lub prosty banner 1200×630)

**Intent:** Jednolity podgląd linku gdy brak okładki eventu.

#### 3. Stałe meta serwisu

**File:** `src/lib/site-meta.ts` (nowy)

**Intent:** `DEFAULT_SITE_TITLE`, `DEFAULT_SITE_DESCRIPTION`, `DEFAULT_OG_IMAGE_PATH`, helper `buildPageMeta({ title, description, path, ogImage })`.

**Contract:** Eksport typowany; używany w `.astro` frontmatter.

#### 4. Strony publiczne – props meta

**Files:** m.in. `src/pages/index.astro`, `src/pages/events.astro`, `src/pages/events/[id].astro`, `src/pages/archive.astro`, `src/pages/privacy-policy.astro`, `src/pages/terms.astro`, `src/pages/forum.astro`, `src/pages/forum/[id].astro`, `src/pages/report-issue.astro`

**Intent:** Każda przekazuje sensowny `description` i `canonicalPath`. Event detail: opis z nazwy + daty + miasta; `ogImage` z `coverUrl` lub fallback. Strony chronione (`/profile`, `/team`, `/forum` dla gościa) – minimalne meta wystarczy; priorytet: publiczne URL z sitemap.

**Contract:** Tytuły bez em dash (en dash `–`).

#### 5. LegalDocumentShell – przekazanie meta

**File:** `src/components/legal/LegalDocumentShell.astro`

**Intent:** Rozszerzyć `Props` o `description?`, `canonicalPath?` (opcjonalnie `ogImage?`) i przekazać do `<Layout>`. `terms.astro` i `privacy-policy.astro` ustawiają meta przez shell, nie omijają go.

**Contract:** Zachować istniejące `title` i `pageTitle`.

#### 6. Opis strony listy eventów

**File:** `src/pages/events.astro`

**Intent:** Wyliczyć `pageDescription` (np. „{n} nadchodzących imprez drum and bass w Polsce – filtruj po mieście i dacie.") i przekazać do `Layout`.

**Contract:** `n = events.length`; sensowny fallback gdy `n === 0`.

#### 7. Testy jednostkowe meta

**File:** `tests/unit/site-meta.test.ts`

**Intent:** `absoluteUrl`, domyślne wartości, skracanie opisu eventu.

### Success Criteria

#### Automated Verification

- `npm run check`
- `npm run lint:all`
- `npm test` (w tym `site-meta.test.ts`)

#### Manual Verification

- View Source `/` – `meta name="description"`, `og:title`, `og:image`, `twitter:card`
- View Source `/events/[id]` z okładką – `og:image` wskazuje na Supabase URL lub transform
- Discord paste test – podgląd z obrazkiem i opisem

---

## Phase 3: Nawigacja SSR i desktop

### Overview

Kluczowe wejścia widoczne w HTML bez JavaScript; na szerokich ekranach linki poziome zamiast samego hamburgera.

### Changes Required

#### 1. Linki nagłówka (SSR)

**File:** `src/components/shell/AppHeaderLinks.astro` (nowy)

**Intent:** Nawigacja `<nav aria-label="Skróty">` z linkami:

- Zawsze: „Lista eventów" → `DISCOVERY_PATH`, „Archiwum" → `ARCHIVE_PATH`
- Niezalogowany: „Zaloguj się", „Zgłoś wydarzenie" (→ `MY_EVENTS_NEW_PATH` lub `SIGN_IN_PATH` z `return` – **decyzja:** bezpośrednio `MY_EVENTS_NEW_PATH`; middleware przekieruje na login jeśli chronione)
- Zalogowany fan: „Moje eventy", „Dodaj wydarzenie"
- Admin: skrót „Panel admina" zamiast fan links (wg `isAdmin` z `Astro.locals`)

**Contract:** Klasy przez `class:list` w Astro. Desktop (`md+`): pełna lista skrótów (`hidden md:flex`). Mobile: co najmniej **„Eventy"** (`DISCOVERY_PATH`) i **„Zaloguj"** / **„Zgłoś"** jako widoczne linki tekstowe obok hamburgera (bez `hidden`) – spełnia checklist „nagłówek bez JS" na telefonie.

#### 2. Integracja w AppShell

**File:** `src/components/shell/AppShell.astro`

**Intent:** Wstawić `AppHeaderLinks` obok `AppBrand` / przed `AppMenu`. Mobile: skróty SSR z `AppHeaderLinks` + hamburger `AppMenu` dla pełnego menu.

**Contract:** `pointer-events-auto` zachowane; nie duplikować całej listy z `AppMenu.tsx` – tylko skróty.

#### 3. Spójność AppMenu

**File:** `src/components/shell/AppMenu.tsx`

**Intent:** Przejrzeć etykiety – te same nazwy co w `AppHeaderLinks`. Bez zmiany struktury Sheet.

#### 4. Middleware – ścieżka zgłoszenia

**File:** `src/middleware.ts` (weryfikacja tylko)

**Intent:** Upewnić się, że `/my-events/new` dla gościa przekierowuje na signin – link „Zgłoś wydarzenie" w SSR musi być bezpieczny.

### Success Criteria

#### Automated Verification

- `npm run check`
- `npm run lint:all`
- Rozszerzyć `tests/unit/routes.test.ts` jeśli nowe stałe

#### Manual Verification

- View Source – `<a href="/auth/signin">` lub `/my-events/new` w nagłówku
- Desktop ≥768px – linki poziome bez otwierania menu
- Mobile – hamburger nadal działa; brak przepełnienia nagłówka

---

## Phase 4: Strona główna – drugi CTA, social proof, teaser mapy

### Overview

Home lepiej komunikuje obie ścieżki (fan szuka / fan zgłasza) i buduje zaufanie liczbami.

### Changes Required

#### 1. Dane statystyk w frontmatter

**File:** `src/pages/index.astro`

**Intent:** Po `createClient`: `listPublishedEvents(supabase, {})` → `eventCount`; `listDistinctCities` → `cityCount`. Obsłużyć brak Supabase (0/0, bez błędu strony).

**Contract:** Tylko nadchodzące opublikowane (jak discovery).

#### 2. Drugi CTA w hero

**File:** `src/components/home/HomeHero.astro`

**Intent:** Dodać props `submitEventHref` lub import `MY_EVENTS_NEW_PATH`. Drugi przycisk outline: „Zgłoś wydarzenie". Układ: flex gap na desktop, stack na mobile.

**Contract:** `index.astro` przekazuje href; styl spójny z primary CTA (`shellBtnOutline` lub odpowiednik w Astro).

#### 3. Social proof

**File:** `src/components/home/HomeStats.astro` (nowy) lub sekcja w `HomeAbout.astro`

**Intent:** Jedna linia: „{eventCount} wydarzeń w bazie · {cityCount} miast" (lub „działamy w {cityCount} miastach"). SSR tylko.

**Contract:** Liczby w `<strong>`; `aria-live` nie wymagane (statyczne).

#### 4. Teaser mapy

**File:** `src/components/home/HomeMapTeaser.astro` (nowy)

**Intent:** Sekcja między hero a „O nas": wizual (gradient + ikona mapy / statyczny crop stylu mapy), nagłówek „Zobacz wydarzenia na mapie", CTA do `DISCOVERY_PATH`. Bez MapLibre – czysty HTML/CSS, opcjonalnie `<img>` z lekkim assetem.

**Contract:** `min-height` ~240px; `alt=""` na dekoracyjnym tle.

#### 5. Meta home (jeśli faza 2 nie objęła)

**File:** `src/pages/index.astro`

**Intent:** `description` z social proof: „Polska mapa i lista eventów drum and bass – {eventCount}+ imprez."

### Success Criteria

#### Automated Verification

- `npm run check`
- `npm run lint:all`
- `npm test`

#### Manual Verification

- Home – dwa przyciski w hero
- Widać licznik eventów/miast (gdy baza ma dane)
- Teaser mapy linkuje do `/events`
- View Source – stats w HTML

---

## Phase 5: Stopka, kontakt, social, legal

### Overview

Spójna stopka na całym serwisie; Regulamin zsynchronizowany z Polityką; łatwy powrót ze stron prawnych.

### Changes Required

#### 1. Konfiguracja social projektu

**File:** `site.config.mjs`

**Intent:** Dodać opcjonalne `SITE_SOCIAL_INSTAGRAM_URL`, `SITE_SOCIAL_FACEBOOK_URL` (puste stringi domyślnie). Eksport przez `src/lib/site.ts`.

**Contract:** Walidacja URL przy renderze – pokaż link tylko gdy niepusty.

#### 2. Wspólna stopka

**File:** `src/components/SiteFooter.astro` (refaktor)

**Intent:** Rozszerzyć `<nav>` o: Kontakt (`mailto:CONTACT_EMAIL` lub `/#contact` na home), Zgłoś wydarzenie (`MY_EVENTS_NEW_PATH`), Instagram/Facebook (warunkowo), separator, Polityka, Regulamin.

**Contract:** `aria-label="Stopka serwisu"`; klasy jak dotąd.

#### 3. Home stopka

**File:** `src/components/home/HomeLegalLinks.astro`

**Intent:** Użyć tego samego komponentu co `SiteFooter` lub współdzielony `SiteFooterNav.astro` – uniknąć rozjazdu linków.

#### 4. Link powrotu na stronach prawnych

**File:** `src/components/legal/LegalDocumentShell.astro`

**Intent:** Pod nagłówkiem artykułu link „← Strona główna" → `HOME_PATH`.

#### 5. Regulamin §2 – komentarze

**File:** `src/pages/terms.astro`

**Intent:** W `<ul>` sekcji „2. Usługi" dodać bullet: „komentarze pod opublikowanymi wydarzeniami (po zalogowaniu; zasady w §5.13–5.14)". Zaktualizować `LEGAL_UPDATED_AT` w `src/lib/legal/paths.ts`.

**Contract:** En dash w copy; data aktualizacji zgodna z AGENTS.md.

### Success Criteria

#### Automated Verification

- `npm run check`
- `npm run lint:all`
- `node scripts/check-no-em-dash.mjs` (terms + privacy jeśli dotykane)

#### Manual Verification

- Stopka na `/events` – kontakt + zgłoś event
- Po uzupełnieniu URL w config – ikony/linki social widoczne
- `/terms` – nowy bullet §2; data aktualizacji w nagłówku
- Link „Strona główna" na polityce i regulaminie

---

## Phase 6: Testy i weryfikacja regresji

### Overview

Automatyzacja najważniejszych regresji SEO z audytu.

### Changes Required

#### 1. Test HTML listy (e2e lub integracyjny)

**File:** `tests/e2e/seo-discovery.spec.ts` (nowy)

**Intent:** Po `npm run build && npm run preview` (lub dev z seed): `page.goto("/events")`, `page.content()` zawiera znany fixture event name (wzorzec jak `smoke.spec.ts` + seed). Alternatywa: test integracyjny renderu Astro – jeśli e2e zbyt ciężkie, testuj helper SSR listy.

**Contract:** Nie flaky – użyć eventu z integration seed lub mock tylko na unit fallback builder.

#### 2. Smoke rozszerzony (meta)

**File:** `tests/e2e/smoke.spec.ts`

**Intent:** Asercja `meta[name="description"]` na `/` i `/events` (po Fazie 2). Aktualizacja asercji HTML listy na `/events` jest w **Fazie 1**.

#### 3. Dokumentacja smoke

**File:** `context/foundation/smoke-checklist.md` (jeśli istnieje – dopisek)

**Intent:** Punkt: View Source `/events`, OG debugger.

### Success Criteria

#### Automated Verification

- `npm run verify`
- `npm run build`
- `npm run test:e2e` (lub subset seo-discovery)

#### Manual Verification

- Pełna ścieżka z audytu (checklist z „Desired End State")
- `npm run verify:full` przed merge do `main`

---

## Testing Strategy

### Unit Tests

- `site-meta.test.ts` – budowanie opisów i URL OG
- Opcjonalnie test `buildEventsPageDescription(count, filters)`

### Integration Tests

- Brak nowych migracji; istniejące `fan-read-list.test.ts` bez zmian

### E2E

- `seo-discovery.spec.ts` – HTML zawiera nazwę eventu
- `smoke.spec.ts` – meta description na kluczowych URL

### Manual Testing Steps

1. View Source `/events` – lista eventów w HTML
2. Wyłącz JS – nawigacja i lista klikalne
3. Discord/FB preview `/` i `/events`
4. Home – dwa CTA, stats, teaser
5. Stopka – wszystkie linki
6. Regulamin §2 – komentarze

## Performance Considerations

- Home: +2 zapytania Supabase (`listPublishedEvents` count można optymalizować `select id` + length lub dedykowany `count` w przyszłości – na MVP akceptowalne przy małej bazie).
- `/events`: brak dodatkowych zapytań – tylko render Astro fallback z istniejących danych.
- OG: zero runtime – statyczne meta w HTML.

## Migration Notes

- Brak migracji DB.
- Właściciel produktu: uzupełnić `SITE_SOCIAL_*` w `site.config.mjs` gdy profile BassMap PL będą gotowe.
- Po deploy: odświeżyć cache OG w Facebook Debugger dla `/` i `/events`.

## References

- Research: `context/changes/ui-audit-seo-nav/research.md`
- Wzorzec SSR listy: `src/pages/archive.astro`, `src/components/archive/ArchiveEventList.tsx`
- Lekcja Radix: `context/foundation/lessons.md` (client:only)
- Archiwum OG: `context/archive/2026-06-12-event-cover-photos/plan.md`
- `src/lib/site.ts`, `site.config.mjs`

## Progress

> Convention: `- [ ]` pending, `- [x]` done.

### Phase 1: SSR treści na `/events`

#### Automated

- [x] 1.1 `npm run check` – 2c9de12
- [x] 1.2 `npm run lint:all` – 2c9de12
- [x] 1.3 `npm test` (w tym `event-discovery-ssr.test.ts`) – 2c9de12
- [x] 1.4 `smoke.spec.ts` – asercja SEO/hydratacji zaktualizowana – 2c9de12

#### Manual

- [x] 1.5 View Source `/events` zawiera nazwy eventów – 2c9de12
- [x] 1.6 Lista i filtr miasta działają bez JS – 2c9de12

### Phase 2: Meta description i Open Graph

#### Automated

- [x] 2.1 `npm run check` – 0ea8df2
- [x] 2.2 `npm run lint:all` – 0ea8df2
- [x] 2.3 `npm test` (`site-meta.test.ts`) – 0ea8df2

#### Manual

- [x] 2.4 Meta i OG na `/` i `/events` w View Source – 0ea8df2
- [x] 2.5 Podgląd linku w Discord/FB (pominięty – tylko View Source na localhost) – 0ea8df2

### Phase 3: Nawigacja SSR i desktop

#### Automated

- [x] 3.1 `npm run check` – 99792ca
- [x] 3.2 `npm run lint:all` – 99792ca

#### Manual

- [x] 3.3 Linki logowania i zgłoszenia w HTML nagłówka – 99792ca
- [x] 3.4 Desktop – linki poziome bez menu – 99792ca

### Phase 4: Strona główna (pominięta – decyzja użytkownika)

#### Automated

- [x] 4.1–4.3 Pominięte – bez zmian na home

#### Manual

- [x] 4.4 Pominięte – bez drugiego CTA, liczników i teasera mapy

### Phase 5: Stopka i legal

#### Automated

- [x] 5.1 `npm run check` – 2da17a3
- [x] 5.2 `npm run lint:all` – 2da17a3
- [x] 5.3 `scripts/check-no-em-dash.mjs` – 2da17a3

#### Manual

- [x] 5.4 Stopka z kontaktem i social – 2da17a3
- [x] 5.5 Regulamin §2 + link Strona główna na legal – 2da17a3

### Phase 6: Testy i weryfikacja

#### Automated

- [ ] 6.1 `npm run verify`
- [ ] 6.2 `npm run build`
- [ ] 6.3 `npm run test:e2e`

#### Manual

- [ ] 6.4 Pełna checklist audytu przed merge

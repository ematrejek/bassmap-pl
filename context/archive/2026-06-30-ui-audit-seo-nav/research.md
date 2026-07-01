---
date: 2026-06-30T12:00:00+02:00
researcher: Cursor Agent
git_commit: b2f34b018a85f23b1073bfcc1ef19258bd574df3
branch: main
repository: ematrejek/bassmap-pl
topic: "Audyt UI – SEO, SSR discovery, nawigacja, home, legal (ui-audit-seo-nav)"
tags: [research, seo, ssr, open-graph, discovery, navigation, footer, legal, astro]
status: complete
last_updated: 2026-06-30
last_updated_by: Cursor Agent
---

# Research: Audyt UI – SEO, SSR discovery, nawigacja, home, legal

**Date**: 2026-06-30  
**Researcher**: Cursor Agent  
**Git Commit**: [`b2f34b01`](https://github.com/ematrejek/bassmap-pl/commit/b2f34b018a85f23b1073bfcc1ef19258bd574df3)  
**Branch**: main  
**Repository**: [ematrejek/bassmap-pl](https://github.com/ematrejek/bassmap-pl)

## Research Question

Jaki jest aktualny stan kodu BassMap PL względem uwag audytu UI (pusty HTML na `/events`, brak OG/meta, nawigacja za JS, home/stopka/legal) i jakie wzorce historyczne oraz ograniczenia techniczne determinują implementację planu `ui-audit-seo-nav`?

## Summary

1. **Blocker SEO jest realny, ale wąski:** dane listy są już pobierane w SSR (`events.astro`), lecz `DiscoveryShell` z `client:only` sprawia, że pierwszy HTML to wyłącznie fallback „Ładowanie listy wydarzeń…". Naprawa to warstwa prezentacji (bogaty Astro fallback), nie nowy backend.

2. **Wzorzec do skopiowania istnieje:** `/archive` renderuje listę eventów w statycznym HTML przez React bez dyrektywy `client:`; szczegół eventu (`/events/[id]`) ma pełną treść w Astro. Discovery powinien dorównać widoczność crawlerom bez rezygnacji z `client:only` na shellu (Radix Checkbox w `SubgenreFilter`).

3. **Meta/OG były świadomie odłożone:** S-02 i S-03 wdrożyły tylko `title` + opcjonalne `og:image` na stronie eventu. Audyt domyka resztę (`description`, pełny OG/Twitter, canonical) – to naturalna kontynuacja S-03, nie zmiana architektury.

4. **Nawigacja i stopka rosły etapami (F-04, S-11):** minimalna stopka prawna i hamburger-only menu były akceptowalne na MVP; audyt wymaga SSR skrótów (`AppHeaderLinks`) i rozszerzonej stopki bez przepisywania `AppMenu`.

5. **Infrastruktura SEO częściowo gotowa:** sitemap statyczna + dynamiczna (`sitemap-events.xml`), `robots.txt`, `SITE_ORIGIN`, `absoluteUrl()` – brakuje meta w `<head>` i testów HTML/OG.

6. **Regulamin:** komentarze pod wydarzeniami są w §5.13–5.14; §2 Usługi ich nie wymienia – to jedyna realna luka prawna z audytu (nie brak funkcji w regulaminie).

## Detailed Findings

### 1. `/events` – dane SSR vs pusty HTML

**Serwer ma dane** – [`src/pages/events.astro`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/pages/events.astro#L15-L57):

- `listPublishedEvents(supabase, currentFilters)` z filtrami URL (`parseFanFilters`)
- `listDistinctCities`, liczniki RSVP (`getGoingCountsByEventIds`), attendance użytkownika
- `enrichEventWithCoverUrl` dla okładek

**HTML dla crawlerów jest pusty** – [`events.astro:63-76`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/pages/events.astro#L63-L76):

```astro
<DiscoveryShell ... client:only="react">
  <div slot="fallback">
    <h1>MAP THE BASS!</h1>
    <p>Ładowanie listy wydarzeń…</p>
  </div>
</DiscoveryShell>
```

**Po hydratacji** [`DiscoveryShell.tsx`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/components/discovery/DiscoveryShell.tsx):

- `EventList` → `EventDiscoveryCard` (grid, RSVP, hover ↔ mapa)
- `EventFilters` (GET form + `DateRangeFilter` + `SubgenreFilter`)
- Mapa: lazy `EventsMap` (MapLibre), montowana dopiero po `useIsClient()` / zakładce mobile

**Rekomendowana strategia (zgodna z planem):**

| Warstwa                | Technologia                                          | Widoczność bez JS                         |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------- |
| Lista eventów          | `EventDiscoveryListStatic.astro` w `slot="fallback"` | Tak – nazwa, data, miasto, link           |
| Filtry miasto/free     | `EventFiltersStatic.astro` (GET)                     | Tak                                       |
| Filtry data/podgatunek | `DateRangeFilter`, `SubgenreFilter`                  | Nie – wymaga JS                           |
| Mapa                   | lazy `EventsMap`                                     | Nie                                       |
| RSVP na karcie         | `EventDiscoveryCard` + `useEventAttendance`          | Nie – link do szczegółu wystarczy dla SEO |

### 2. Dlaczego `DiscoveryShell` musi zostać `client:only`

**Źródło:** [`context/foundation/lessons.md`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/context/foundation/lessons.md) – reguła Radix UI.

**`SubgenreFilter.tsx`** – Radix `Checkbox` + `useState` dla wielokrotnego wyboru; hidden inputs `name="subgenre"` zależą od stanu React ([`SubgenreFilter.tsx:1-42`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/components/discovery/SubgenreFilter.tsx)).

**`DateRangeFilter.tsx`** – Radix Popover, lazy `react-day-picker`, `window.location.assign` ([`DateRangeFilter.tsx:19-25`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/components/discovery/DateRangeFilter.tsx)).

**`EventFilters.tsx`** – natywne elementy bez Radix: `<select name="city">`, `<input type="checkbox" name="free">`, `<form method="GET">` ([`EventFilters.tsx:17-63`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/components/discovery/EventFilters.tsx)) – **gotowe do Astro static form**.

**Bundler:** [`astro.config.mjs`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/astro.config.mjs) – Radix w `optimizeDeps.exclude` i `ssr.noExternal` (wspiera islandy, nie zastępuje `client:only`).

**Konflikt historyczny:** S-02 impl-review zakładał `client:load` + lazy mapę; obecna lekcja i produkcja używają `client:only` na całym shellu. **ui-audit-seo-nav nie cofa tej decyzji** – SEO przez Astro fallback.

### 3. Wzorzec SSR listy – archiwum i szczegół eventu

**Archiwum** – [`archive.astro`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/pages/archive.astro):

- `ArchiveEventList` jako `.tsx` **bez** `client:` → Astro emituje statyczny `<ul>` z linkami, datą, miejscem, ceną, badge podgatunków.

**Szczegół eventu** – [`events/[id].astro`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/pages/events/%5Bid%5D.astro):

- `<h1>{event.name}</h1>`, `formatEventDate`, `formatEventVenueLine` w czystym Astro (linie 86–89)
- Islandy (`EventCoverImage`, komentarze, RSVP) z `client:load` / `client:only` – treść rdzenia jest w HTML

**Współdzielone formatowanie** – [`src/lib/events/format.ts`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/lib/events/format.ts):

- `formatEventDate`, `formatEventVenueLine`, `formatEventPrice` – użyć w Astro frontmatter (import w `---` bloku)

**Ryzyko duplikacji markupu:** karta discovery (grid + RSVP) vs statyczna lista – plan mitiguje przez wspólne `format*`, nie wspólny komponent wizualny (akceptowalne na MVP).

### 4. Meta / Open Graph – stan i luki

**Layout** – [`src/layouts/Layout.astro:10-38`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/layouts/Layout.astro):

| Obecne                                  | Brakuje                                           |
| --------------------------------------- | ------------------------------------------------- |
| `<title>`                               | `meta name="description"`                         |
| opcjonalne `og:image`                   | `og:title`, `og:description`, `og:url`, `og:type` |
| `lang="pl"`, viewport `initial-scale=1` | `link rel="canonical"`                            |
| PWA meta                                | `twitter:card`, `twitter:*`                       |

**Jedyna strona z `ogImage`:** [`events/[id].astro:53`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/pages/events/%5Bid%5D.astro#L53).

**~22 strony** używają `<Layout>` (grep `src/pages/**/*.astro`) – wszystkie wymagają props `description` po rozszerzeniu Layout.

**Infrastruktura URL:**

- [`site.config.mjs`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/site.config.mjs) – `SITE_ORIGIN = "https://bassmap.pl"`
- [`src/lib/site.ts`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/lib/site.ts) – `absoluteUrl(path)`

**Assety OG:**

- `public/pwa-512x512.png` – istnieje
- `public/og-default.png` – **brak** (plan: dodać 1200×630 lub reuse PWA)

**Pliki z planu nieistniejące:** `src/lib/site-meta.ts`, `public/og-default.png`.

### 5. Sitemap, robots, indeksacja

**Statyczna sitemap** – `@astrojs/sitemap` w `astro.config.mjs`; ścieżki z `SITEMAP_STATIC_PATHS`: `/`, `/events`, `/archive`, `/privacy-policy`, `/terms`, `/report-issue`, `/team`, `/forum`.

**Dynamiczna** – [`src/pages/sitemap-events.xml.ts`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/pages/sitemap-events.xml.ts) – do 5000 URL eventów z DB.

**robots.txt** – [`src/pages/robots.txt.ts`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/pages/robots.txt.ts) – Allow `/`, wskazuje `sitemap-index.xml` i `sitemap-events.xml`.

**Uwaga:** `/team` i `/forum` są w sitemap, ale middleware chroni je dla gości (redirect na signin) – crawler bez sesji nie zindeksuje treści chronionych (oczekiwane).

**Testy:** [`tests/unit/sitemap-xml.test.ts`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/tests/unit/sitemap-xml.test.ts) – escape XML; **brak** testów meta HTML.

### 6. Nawigacja – AppShell, AppMenu, middleware

**AppShell** – [`src/components/shell/AppShell.astro`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/components/shell/AppShell.astro):

- `AppBrand` → `/` (SSR)
- `NotificationBell` – `client:only` (zalogowany)
- `AppMenu` – `client:only`; fallback HTML: disabled przycisk „Menu" (linie 44–52)
- `SiteFooter` gdy `showFooter=true`

**AppMenu linki (po hydratacji):**

| Rola    | Linki                                                 |
| ------- | ----------------------------------------------------- |
| Wszyscy | Lista eventów, Archiwum, Zgłoś problem                |
| Gość    | + Zaloguj, Zarejestruj (**brak** „Dodaj wydarzenie")  |
| Fan     | + Profil, Moje eventy, Dodaj wydarzenie, Ekipa, Forum |
| Admin   | Panel admina, Ekipa, Forum                            |

**Middleware** – [`src/middleware.ts:8-48`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/middleware.ts):

```typescript
const PROTECTED_ROUTES = [PROFILE_PATH, MY_EVENTS_PATH, TEAM_PATH, FORUM_PATH];
// "/my-events/new".startsWith("/my-events") → redirect /auth/signin dla gościa
```

**Implikacja dla SSR linku „Zgłoś wydarzenie":** link do `/my-events/new` jest bezpieczny (middleware przekieruje na login); **brak** `returnUrl` – po logowaniu użytkownik nie wraca automatycznie na formularz (opcjonalne ulepszenie poza scope audytu).

**Redirecty pomocnicze:** `/?query` → `/events?query` (302); legacy legal 301.

**Plan:** `AppHeaderLinks.astro` – SSR na `md+`; `AppMenu` bez zmian na mobile.

### 7. Home, stopka, kontakt

**index.astro** – [`src/pages/index.astro`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/pages/index.astro):

- `AppShell showFooter={false} immersive`
- `HomeFluidScroll` – `client:only` (efekt wizualny; nie blokuje SEO hero/about)
- **Brak** zapytań Supabase w frontmatter (stats do dodania w Fazie 4)

**HomeHero** – jeden CTA „Znajdź swój event!" → `/events` ([`HomeHero.astro:28-33`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/components/home/HomeHero.astro)).

**HomeContact** – `mailto:kontakt@bassmap.pl` ([`HomeContact.astro`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/components/home/HomeContact.astro)); sekcja z `aria-label="Kontakt i współpraca"` – anchor `/#contact` możliwy w stopce.

**SiteFooter** – tylko Polityka + Regulamin ([`SiteFooter.astro:11-18`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/components/SiteFooter.astro)).

**HomeLegalLinks** – brand + Polityka + Regulamin ([`HomeLegalLinks.astro`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/components/home/HomeLegalLinks.astro)) – **rozjazd** z `SiteFooter` (plan: wspólny `SiteFooterNav`).

**Brak social BassMap w config:** `site.config.mjs` nie ma `SITE_SOCIAL_*` – plan: opcjonalne stałe, ukryte gdy puste.

### 8. Dokumenty prawne

**LegalDocumentShell** – tytuł, data `LEGAL_UPDATED_AT`, **brak** linku „Strona główna" ([`LegalDocumentShell.astro`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/components/legal/LegalDocumentShell.astro)).

**Regulamin §2 vs §5:**

| Dokument             | Komentarze pod wydarzeniami                                         |
| -------------------- | ------------------------------------------------------------------- |
| Polityka §2.8        | Pełna sekcja (linie 192–203)                                        |
| Regulamin §5.13–5.14 | Pełne zasady (linie 180–189)                                        |
| Regulamin §2 Usługi  | **Brak** bulletu o komentarzach pod eventami; jest forum (linia 47) |

**Audyt o viewport/lang na legal:** **nieaktualny** – wszystko przez `Layout.astro` z `lang="pl"` i `initial-scale=1`.

**Po edycji terms:** bump `LEGAL_UPDATED_AT` w [`src/lib/legal/paths.ts`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/src/lib/legal/paths.ts) (AGENTS.md).

### 9. Testy i regresje

**Smoke e2e** – [`tests/e2e/smoke.spec.ts:8-14`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/tests/e2e/smoke.spec.ts):

- Sprawdza, że „Ładowanie listy wydarzeń…" **znika** po hydratacji
- **Nie** sprawdza nazw eventów w HTML
- Po Fazie 1: fallback nie powinien zawierać „Ładowanie…" – test wymaga aktualizacji (asercja na nazwę eventu w `page.content()` lub widoczność linku)

**Brakujące (plan Faza 6):**

- `tests/e2e/seo-discovery.spec.ts`
- `tests/unit/site-meta.test.ts`
- meta `description` w smoke

**Lekcja zamknięcia slicu:** `npm run verify` + `build` + `test:e2e` przy zmianach UI ([`lessons.md`](https://github.com/ematrejek/bassmap-pl/blob/b2f34b018a85f23b1073bfcc1ef19258bd574df3/context/foundation/lessons.md)).

## Code References

| Plik                                          | Linie          | Opis                         |
| --------------------------------------------- | -------------- | ---------------------------- |
| `src/pages/events.astro`                      | 20–47, 63–76   | SSR danych; pusty fallback   |
| `src/components/discovery/DiscoveryShell.tsx` | 82–173         | Shell po hydratacji          |
| `src/components/discovery/SubgenreFilter.tsx` | 1–42           | Radix – wymusza client:only  |
| `src/components/discovery/EventFilters.tsx`   | 17–63          | Natywne GET filtry           |
| `src/pages/archive.astro`                     | 13–38          | Wzorzec SSR listy            |
| `src/components/archive/ArchiveEventList.tsx` | 14–67          | Markup listy do mirrorowania |
| `src/layouts/Layout.astro`                    | 10–38          | Minimalne meta               |
| `src/pages/events/[id].astro`                 | 53, 86–89      | ogImage + treść SSR          |
| `src/components/shell/AppShell.astro`         | 43–52          | AppMenu client:only          |
| `src/components/shell/AppMenu.tsx`            | 46–164         | Menu po hydratacji           |
| `src/middleware.ts`                           | 8–48           | Ochrona /my-events/\*        |
| `src/components/SiteFooter.astro`             | 11–18          | Minimalna stopka             |
| `src/components/home/HomeHero.astro`          | 28–33          | Jeden CTA                    |
| `src/pages/terms.astro`                       | 37–51, 180–189 | §2 vs §5 komentarze          |
| `site.config.mjs`                             | 2–14           | SITE_ORIGIN, sitemap paths   |
| `src/lib/site.ts`                             | 5–7            | absoluteUrl                  |
| `tests/e2e/smoke.spec.ts`                     | 8–14           | Test fallbacku               |

## Architecture Insights

### Progressive enhancement na `/events`

```
Request → events.astro (Supabase SSR)
    ├─→ HTML: fallback (Astro lista + opcj. static filters)  ← crawlers, no-JS
    └─→ JS: DiscoveryShell client:only (mapa, Radix filtry, RSVP)  ← interakcja
```

### Decyzje implementacyjne (potwierdzone researchiem)

1. **Nie** zmieniać `DiscoveryShell` na `client:load`.
2. **Tak** – bogaty `slot="fallback"` + ewentualnie `EventFiltersStatic.astro`.
3. **Tak** – `format*` z `@/lib/events/format` w Astro (import w frontmatter).
4. **Tak** – `site-meta.ts` + rozszerzony `Layout` dla wszystkich stron publicznych.
5. **Tak** – `AppHeaderLinks.astro` SSR; hamburger na mobile.
6. **Opcjonalnie później:** `returnUrl` na signin po kliknięciu „Zgłoś wydarzenie" jako gość.

### Pliki do utworzenia (plan vs repo)

| Plik                             | Status |
| -------------------------------- | ------ |
| `EventDiscoveryListStatic.astro` | Brak   |
| `EventFiltersStatic.astro`       | Brak   |
| `AppHeaderLinks.astro`           | Brak   |
| `HomeStats.astro`                | Brak   |
| `HomeMapTeaser.astro`            | Brak   |
| `SiteFooterNav.astro`            | Brak   |
| `src/lib/site-meta.ts`           | Brak   |
| `public/og-default.png`          | Brak   |

## Historical Context (from prior changes)

| Archiwum                                                                                                                                                       | Decyzja wpływająca na ui-audit-seo-nav                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`context/archive/2026-06-11-fan-event-discovery/`](https://github.com/ematrejek/bassmap-pl/tree/main/context/archive/2026-06-11-fan-event-discovery)          | SSR danych + filtry URL; mapa bez JS; **brak** meta description w scope                |
| [`context/archive/2026-06-12-event-cover-photos/`](https://github.com/ematrejek/bassmap-pl/tree/main/context/archive/2026-06-12-event-cover-photos)            | `og:image` na `/events/[id]` – wdrożone częściowo; pełny OG odłożony                   |
| [`context/archive/2026-06-14-app-shell-navigation/`](https://github.com/ematrejek/bassmap-pl/tree/main/context/archive/2026-06-14-app-shell-navigation)        | `/` marketing, `/events` discovery; `SiteFooter` minimalna; redirect `/?` → `/events?` |
| [`context/archive/2026-06-13-legal-pages/`](https://github.com/ematrejek/bassmap-pl/tree/main/context/archive/2026-06-13-legal-pages)                          | Stopka = Polityka + Regulamin; polskie slugi dla SEO                                   |
| [`context/archive/2026-06-13-event-description/plan-brief.md`](https://github.com/ematrejek/bassmap-pl/tree/main/context/archive/2026-06-13-event-description) | Meta description świadomie **osobny temat** – teraz realizowany przez audyt            |
| [`context/archive/2026-06-24-profile-share/`](https://github.com/ematrejek/bassmap-pl/tree/main/context/archive/2026-06-24-profile-share)                      | OG profilu `/u/[login]` – **poza scope** ui-audit-seo-nav                              |
| [`context/foundation/lessons.md`](https://github.com/ematrejek/bassmap-pl/blob/main/context/foundation/lessons.md)                                             | Radix → client:only; verify + e2e przy UI                                              |

**Ewolucja `client:only`:** S-02 impl-review opisywał `client:load` + lazy mapę; produkcja i lekcje ustabilizowały `client:only` na całym shellu po problemach z Radix Checkbox. ui-audit-seo-nav **kontynuuje obecny stan**, nie S-02 impl-review.

## Related Research

- Plan implementacji: [`context/changes/ui-audit-seo-nav/plan.md`](./plan.md)
- Brief: [`context/changes/ui-audit-seo-nav/plan-brief.md`](./plan-brief.md)
- Map provider (wydajność mapy, nie SEO): [`context/changes/map-provider-upgrade/research.md`](../map-provider-upgrade/research.md)

## Open Questions

| #   | Pytanie                                     | Rekomendacja z researchu                                             |
| --- | ------------------------------------------- | -------------------------------------------------------------------- |
| 1   | URL social BassMap (IG/FB)                  | Dodać do `site.config.mjs`; puste = ukryte linki                     |
| 2   | Asset `og-default.png` vs `pwa-512x512.png` | Krótkoterminowo PWA; docelowo banner 1200×630                        |
| 3   | `returnUrl` po signin z „Zgłoś wydarzenie"  | Poza scope audytu; UX improvement                                    |
| 4   | FOUC: fallback lista → React shell          | Akceptowalne; opcjonalnie ukryć fallback po hydratacji w przyszłości |
| 5   | `/team`, `/forum` w sitemap vs middleware   | Zostawić – strony istnieją; indeksacja treści wymaga logowania (OK)  |
| 6   | Aktualizacja `smoke.spec.ts`                | **Wymagane** po Fazie 1 – inny kontrakt fallbacku                    |

## Gap Matrix (plan vs repo)

| Faza planu      | Stan repo                      | Gotowość infrastruktury         |
| --------------- | ------------------------------ | ------------------------------- |
| 1 SSR `/events` | Fallback = „Ładowanie…"        | Dane SSR ✅; wzorzec archive ✅ |
| 2 Meta/OG       | Tylko title + og:image na [id] | absoluteUrl ✅; helper meta ❌  |
| 3 Nawigacja SSR | Tylko „Menu" w HTML            | routes.ts ✅; AppHeaderLinks ❌ |
| 4 Home          | 1 CTA, brak stats              | index SSR ✅; brak zapytań DB   |
| 5 Stopka/legal  | Minimalna stopka; §2 gap       | terms §5 OK; §2 bullet ❌       |
| 6 Testy SEO     | smoke bez meta HTML            | sitemap ✅; seo tests ❌        |

**Werdykt:** Plan jest wykonalny bez migracji DB i bez zmiany hydratacji Radix. Blocker to wyłącznie brak Astro fallback + meta w Layout – reszta to rozszerzenia istniejących wzorców (archive, [id].astro, SiteFooter, routes).

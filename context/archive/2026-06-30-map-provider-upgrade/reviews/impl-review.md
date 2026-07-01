<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Podmiana silnika mapy (MapLibre)

- **Plan**: brak `plan.md` – przegląd względem `context/changes/map-provider-upgrade/research.md`
- **Scope**: pełna implementacja (Faza 0–2 z research + zoom controls)
- **Date**: 2026-06-30
- **Verdict**: APPROVED (po triage)
- **Findings**: 0 critical · 6 warnings (5 fixed, 1 accepted) · 2 observations (1 fixed)

## Verdicts

| Dimension           | Verdict    |
| ------------------- | ---------- |
| Plan Adherence      | WARNING ⚠️ |
| Scope Discipline    | PASS ✅    |
| Safety & Quality    | WARNING ⚠️ |
| Architecture        | PASS ✅    |
| Pattern Consistency | PASS ✅    |
| Success Criteria    | WARNING ⚠️ |

## Automated verification

| Command                                                  | Result                 | Notes                                                                     |
| -------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| `npm run verify`                                         | **FAIL** (niezwiązane) | Pada na em dash w `context/changes/ui-audit-seo-nav/` – poza tym slice'em |
| `npm run check` (map files)                              | PASS                   | Brak błędów TS w `EventsMap.tsx` / `DiscoveryShell.tsx`                   |
| `npm run test:e2e -- tests/e2e/map-loading.perf.spec.ts` | PASS                   | desktop ~7,8 s / mobile tab ~1,1 s (dev server)                           |
| `npm run build`                                          | PASS                   | chunk `maplibre-gl` ~1 MB minified, `EventsMap` ~19 KB lazy               |

## Findings

### F1 – Brak E2E kliknięcia pinezki

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `tests/e2e/map-loading.perf.spec.ts` (brak); research `research.md:164`
- **Detail**: Research wymaga smoke E2E z kliknięciem pinu na zakładce Mapa. Obecny perf spec mierzy czasy i zoom, ale nie klika pinezki ani nie sprawdza nawigacji do `/events/[id]`.
- **Fix**: Dodać do `smoke.spec.ts` lub `map-loading.perf.spec.ts` jeden test: klik pierwszej pinezki (lub `[data-discovery-map] button`) → URL `/events/`.
- **Decision**: FIXED – smoke E2E w `tests/e2e/smoke.spec.ts`

### F2 – Podgląd pinu na mobile tylko przez hover

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: `src/components/discovery/EventsMap.tsx:106-121`
- **Detail**: Research Faza 0 pkt 3: highlight na tap/click, nie tylko hover. `onClick` od razu woła `onEventNavigate` (pełna nawigacja). `Popup` pojawia się tylko gdy `highlightedEventId` ustawione przez `mouseenter` – na dotyku użytkownik nie widzi tooltipa przed przejściem na stronę eventu.
- **Fix A ⭐ Recommended**: Na coarse pointer (`pointer: coarse`): pierwszy tap = `onHighlightEvent`, drugi tap = nawigacja; desktop bez zmian.
  - Strength: Zgodne z research i lepsze UX na telefonie.
  - Tradeoff: Dwa tapy zamiast jednego do szczegółów eventu.
  - Confidence: HIGH – standardowy wzorzec map mobile.
  - Blind spot: Nie zweryfikowano z użytkownikami produktu.
- **Fix B**: Zostawić jeden tap → nawigacja; usunąć wymaganie tooltipa na mobile z dokumentacji.
  - Strength: Szybsza ścieżka do eventu.
  - Tradeoff: Drift względem research; lista↔mapa sync słabszy na mobile.
  - Confidence: MED.
  - Blind spot: None significant.
- **Decision**: FIXED – dwa tapy na `(pointer: coarse)` w `EventsMap.tsx`

### F3 – Brak obsługi błędów runtime mapy

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/components/discovery/EventsMap.tsx:83-138`
- **Detail**: `DiscoveryShell` łapie tylko błąd `import()` chunku (`MapLoadError`). Awaria WebGL, timeout OpenFreeMap lub uszkodzony styl JSON kończy się pustym panelem bez komunikatu.
- **Fix**: Dodać `onError` na `MapGL` (lub Error Boundary wokół `EventsMap`) i pokazać ten sam UI co `MapLoadError`.
- **Decision**: FIXED – `onError` + fallback UI w `EventsMap.tsx`

### F4 – Zależność od OpenFreeMap bez SLA

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH – architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: `public/map/bassmap-dark.json:7-13`, `src/lib/map/constants.ts:2`
- **Detail**: Styl i kafelki wskazują na `tiles.openfreemap.org` (projekt darowiznowy, brak gwarancji SLA). Research świadomie rekomenduje to na MVP; przy komercyjnym bassmap.pl Faza 3 to MapTiler/Mapbox.
- **Fix A ⭐ Recommended**: Zaakceptować na MVP + dodać monitoring / komunikat przy błędzie ładowania (F3).
  - Strength: 0 zł, zgodne z research Tier 1.
  - Tradeoff: Ryzyko niedostępności zewnętrznego CDN.
  - Confidence: HIGH – opisane w research jako świadoma decyzja.
  - Blind spot: Brak alertów produkcyjnych.
- **Fix B**: Migracja na MapTiler Flex przed launch komercyjny.
  - Strength: SLA, licencja komercyjna.
  - Tradeoff: ~25 USD/mies.
  - Confidence: MED – zależy od ruchu i budżetu.
  - Blind spot: Nie oszacowano MAU.
- **Decision**: ACCEPTED – świadoma decyzja MVP (research Tier 1); komunikat przy awarii przez F3

### F5 – Smoke E2E nie weryfikuje mapy

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `tests/e2e/smoke.spec.ts:8-14`
- **Detail**: Smoke sprawdza filtry i nagłówek, ale nie `[data-discovery-map]` ani `.maplibregl-canvas`. Regresja „mapa się nie renderuje” może przejść CI.
- **Fix**: W smoke na desktopie dodać `await expect(page.locator('[data-discovery-map] .maplibregl-canvas')).toBeVisible()`.
- **Decision**: FIXED – smoke E2E obejmuje też widoczność canvas mapy

### F6 – Perf E2E w CI z luźnymi progami na dev server

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `tests/e2e/map-loading.perf.spec.ts:48-49, 66`
- **Detail**: Progi 15–20 s są sensowne dla `astro dev`, ale test jest uruchamiany razem z resztą E2E w CI – może maskować regresje lub flaky przy wolnym runnerze. Komentarz w pliku mówi „nie twardy gate CI”, lecz plik jest w `tests/e2e/`.
- **Fix**: Przenieść do `tests/e2e/perf/` z tagiem wykluczonym z CI albo uruchamiać tylko lokalnie / na `preview` z ostrzejszymi progami.
- **Decision**: FIXED – `grep` wyklucza `*.perf.spec.ts` w CI (`playwright.config.ts`)

### F7 – Małe cele dotykowe pinezek

- **Severity**: ⚠️ OBSERVATION
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency / a11y
- **Location**: `src/styles/global.css:236-248`
- **Detail**: Wizualna pinezka 10–14 px; poniżej zalecanego 44×44 px celu dotykowego WCAG. Na gęstej mapie może być trudno trafić.
- **Fix**: Powiększyć hit area przez `padding` / `::before` na `.discovery-map-pin` bez zmiany wizualnej kropki.
- **Decision**: FIXED – hit area 44×44 px przez `::after` w `global.css`

### F8 – Brak formalnego `plan.md`

- **Severity**: ⚠️ OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `context/changes/map-provider-upgrade/`
- **Detail**: Implementacja poszła bez `plan.md` i sekcji Progress – review opiera się na `research.md`. Utrudnia to śledzenie SHA faz i `/10x-archive`.
- **Fix**: Uzupełnić retrospektywny `plan.md` z fazami 0–2 i Progress `[x]` przed archive.
- **Decision**: FIXED – `context/changes/map-provider-upgrade/plan.md`

## Co jest zgodne (bez findingów)

- MapLibre + `react-map-gl`; Leaflet usunięty z `package.json` i `src/`.
- `public/map/bassmap-dark.json` + `BASSMAP_MAP_STYLE` – edytowalny styl Dark Matter.
- Overlaye zachowane: siatka, winietka, badge, neon piny, popup tooltip.
- Warunkowy mount mapy na mobile (`shouldMountMap`).
- Lazy load + `client:only` + `useIsClient` – zgodne z `lessons.md`.
- `scrollZoom` tylko przy `(pointer: fine)` + `NavigationControl`.
- Brak XSS w markerach (React text, nie `divIcon` HTML).
- Geokodowanie admina i PWA tile cache – słusznie poza zakresem tego slice'a.

## Triage complete

- **Fixed**: F1, F2, F3, F5, F6, F7, F8
- **Accepted**: F4 (OpenFreeMap na MVP)

## Overall (po triage)

**APPROVED** – migracja zgodna z research; luki z review domknięte w tej sesji.

---
date: 2026-06-30T12:00:00+02:00
researcher: Auto
git_commit: 4656409baa1aa03eb89d0daa7d73509f9fd6f18d
branch: main
repository: ematrejek/bassmap-pl
topic: "Podmiana API/silnika mapy – wydajność mobile i profesjonalny wygląd"
tags: [research, map, leaflet, maplibre, mobile, discovery]
status: complete
last_updated: 2026-06-30
last_updated_by: Auto
last_updated_note: "Follow-up – układ /events, kolorystyka, wymóg wyglądu jak teraz"
---

# Research: Podmiana silnika mapy

**Date**: 2026-06-30  
**Researcher**: Auto  
**Git Commit**: `4656409baa1aa03eb89d0daa7d73509f9fd6f18d`  
**Branch**: main  
**Repository**: [ematrejek/bassmap-pl](https://github.com/ematrejek/bassmap-pl)

## Research Question

Jak podmienić obecne API do generowania/wyświetlania mapy? Obecne rozwiązanie jest wolne i toporne, źle ładuje się na mobile. Szukamy czegoś bardziej profesjonalnego, z akceptowalnym niewielkim kosztem.

## Summary

W BassMap są **dwa osobne „API mapowe”**:

1. **Mapa dla fana** (`/events`) – Leaflet + react-leaflet + **rasterowe kafelki CARTO** (`basemaps.cartocdn.com/dark_all`). To użytkownik widzi jako „wolną mapę” na telefonie.
2. **Geokodowanie przy zapisie eventu** (panel admina) – **Nominatim** (OpenStreetMap), max ~1 żądanie/s, 2–3 zapytania na adres. To **nie** wpływa na ładowanie mapy u fana, tylko na czas zapisu w adminie.

Główna przyczyna słabego UX na mobile to prawdopodobnie **połączenie**: ciężki chunk JS (Leaflet), **wiele żądań HTTP po kafelki raster** przy zoomie/panowaniu, **waterfall ładowania** (React island → lazy import → CSS Leaflet → kafelki) oraz **mapa montowana nawet gdy użytkownik jest na zakładce „Lista”** (tylko ukryta CSS-em).

**Rekomendacja (tier 1 – najlepszy stosunek jakości do kosztu):**

- **MapLibre GL JS** + **react-map-gl** (MIT, bez klucza do samej biblioteki)
- **Kafelki wektorowe**: na start **OpenFreeMap Dark** (0 zł, styl `https://tiles.openfreemap.org/styles/dark` – pasuje do ciemnego UI BassMap)
- Opcjonalnie później: **MapTiler Flex (~25 USD/mies.)** lub **Mapbox** (50k „map loads”/mies. za darmo) dla SLA, własnego stylu neon i geokodowania

**Szybkie poprawki bez pełnej migracji** (niski koszt dev, 0 zł infra): warunkowe montowanie mapy na mobile, wyłączenie `scrollWheelZoom` na touch, tap zamiast hover, preload chunku przy pierwszym wejściu na `/events`.

Szacowany koszt przy małym ruchu (MVP): **0–25 USD/mies.** (OpenFreeMap + MapLibre = 0 zł; MapTiler Flex jeśli potrzebna licencja komercyjna i geokodowanie).

## Detailed Findings

### Obecna implementacja – mapa fana

| Element           | Plik                                                | Szczegóły                                                              |
| ----------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Komponent mapy    | `src/components/discovery/EventsMap.tsx`            | Leaflet 1.9.4, react-leaflet 5, pinezki jako `L.divIcon` (neon)        |
| Kafelki tła       | `EventsMap.tsx:14–16`                               | CARTO CDN raster PNG: `basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png` |
| Lazy load         | `src/components/discovery/DiscoveryShell.tsx:10–17` | `React.lazy()` import `EventsMap`                                      |
| SSR guard         | `DiscoveryShell.tsx:42–48, 129–141`                 | `useSyncExternalStore` – mapa tylko po stronie klienta                 |
| Island Astro      | `src/pages/events.astro:69`                         | `client:only="react"` na całym `DiscoveryShell`                        |
| Współrzędne pinów | `src/lib/geocoding/city-centers.ts`                 | Z bazy lub fallback centrum miasta – **bez geokodowania w runtime**    |
| Style tooltipów   | `src/styles/global.css:211–230`                     | Klasy `.leaflet-tooltip`, `.discovery-map-marker`                      |

Decyzja historyczna (S-02): Leaflet + OSM/CARTO „zero kosztu MVP” – `context/archive/2026-06-11-fan-event-discovery/plan-brief.md`.

### Obecna implementacja – geokodowanie (admin)

| Element        | Plik                                   | Szczegóły                                           |
| -------------- | -------------------------------------- | --------------------------------------------------- |
| Nominatim HTTP | `src/lib/geocoding/nominatim.ts`       | 2–3 zapytania na adres, `sleep(1100ms)` między nimi |
| Wywołanie      | `resolveCoordinates` w flow admin CRUD | Tylko server-side przy `locationMode: address`      |

To API jest **wolne przy zapisie**, ale **nie** przy otwieraniu mapy przez fana.

### Dlaczego mapa „ciężko” działa na mobile

1. **Raster tiles (CARTO)** – przy każdym przesunięciu/zoomie przeglądarka pobiera wiele osobnych obrazków PNG. Na słabszym LTE to widać jako „łatanie” mapy. Wektorowe kafelki (MapLibre) renderują się na GPU i zwykle wyglądają płynniej.
2. **Rozmiar paczki JS** – Leaflet ~42 KB gzip + react-leaflet + CSS; MapLibre ~290 KB – większy pierwszy download, ale lepsza interakcja po załadowaniu. Przy dziesiątkach pinów (typowy case BassMap) oba silniki są wystarczające pod kątem liczby markerów.
3. **Waterfall** – użytkownik widzi: „Ładowanie listy…” → island React → „Ładowanie mapy…” → chunk Leaflet → kafelki. Na mobile to odczuwalne opóźnienie.
4. **Mapa montowana mimo ukrycia** – w `DiscoveryShell` przy `mobileTab === "list"` kontener mapy ma klasę `hidden`, ale `EventsMap` **nadal się renderuje** i pobiera Leaflet + kafelki. To marnuje transfer i CPU na telefonie.
5. **Interakcje pod desktop** – `mouseover`/`mouseout` na markerach (`EventsMap.tsx:110–115`) nie działają sensownie na dotyk; `scrollWheelZoom` może kolidować ze scrollowaniem strony.
6. **Warstwy dekoracyjne** – gradient + grid nad mapą (`z-[401+]`) – kosmetyka, nie główny problem, ale dodaje warstw DOM.

### Opcje zastąpienia – porównanie

#### A. MapLibre GL JS + OpenFreeMap (rekomendacja startowa, ~0 zł)

|                |                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Biblioteka** | `maplibre-gl` (MIT) + `react-map-gl` (MapLibre mode)                                                             |
| **Kafelki**    | `https://tiles.openfreemap.org/styles/dark` – ciemny styl, dane OSM                                              |
| **Koszt**      | 0 zł, bez klucza API, bez rejestracji                                                                            |
| **Plusy**      | Wektor, płynny pan/zoom, styl dark blisko obecnego CARTO dark, brak vendor lock-in                               |
| **Minusy**     | Brak SLA; projekt oparty o darowizny; styl mniej „custom” niż Mapbox Studio; większy bundle niż Leaflet          |
| **Migracja**   | Zamiana `EventsMap.tsx`; markery jako warstwa GeoJSON lub custom HTML markers; usunąć `leaflet` z `package.json` |

#### B. MapLibre + MapTiler Cloud (~25 USD/mies. plan Flex)

|            |                                                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Koszt**  | Flex: **25 USD/mies.** – 25k sesji mapy, 500k requestów API; geokodowanie w pakiecie                                                      |
| **Plusy**  | Licencja komercyjna, SLA na wyższych planach, gotowe style (w tym dataviz dark), Maputnik do edycji stylu, geokodowanie zamiast Nominatim |
| **Minusy** | Plan Free tylko non-commercial; trzeba klucza API (env `MAPTILER_KEY` w Worker)                                                           |
| **Kiedy**  | Gdy bassmap.pl jest produktem komercyjnym i chcecie jednego dostawcy (mapa + geokodowanie admina)                                         |

#### C. Mapbox GL JS (0–~100 USD/mies. przy małym ruchu)

|            |                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| **Koszt**  | **50 000 map loads/mies. za darmo**; potem ~5 USD / 1000 loads                                              |
| **Plusy**  | Mapbox Studio – pixel-perfect ciemny styl „neon BassMap”; najlepsze narzędzia; geokodowanie 100k/mies. free |
| **Minusy** | Licencja proprietary; klucz w kliencie (typowy pattern: restricted token); vendor lock-in                   |
| **Kiedy**  | Gdy priorytetem jest **wygląd premium** i gotowość płacić po przekroczeniu free tier                        |

#### D. Zostać przy Leaflet – tylko optymalizacja (0 zł, mniejszy zysk)

| Zmiana                                                         | Efekt                                     |
| -------------------------------------------------------------- | ----------------------------------------- |
| Montować `EventsMap` tylko gdy `mobileTab === "map"` lub `md+` | Duża oszczędność na mobile                |
| `leaflet.markercluster` przy >50 pinach                        | Na razie prawdopodobnie zbędne            |
| Szybsze kafelki raster (np. MapTiler raster dark)              | Lepszy CDN, nadal raster                  |
| `@maplibre/maplibre-gl-leaflet` + wektor w Leaflet             | Pośrednie rozwiązanie – dwa silniki naraz |

Przy **<100 markerach** badania ([IJGI 2025](https://doi.org/10.3390/ijgi14090336)) pokazują, że Leaflet bywa szybszy przy inicjalizacji niż WebGL – więc sama zamiana biblioteki bez naprawy ładowania i kafelków może nie wystarczyć.

#### E. Google Maps

Wysoki koszt, styl trudny do dopasowania do dark/neon UI – **nie rekomendowane** dla BassMap.

### Geokodowanie – opcjonalna podmiana (admin)

| Provider              | Koszt orientacyjny | Uwagi                                   |
| --------------------- | ------------------ | --------------------------------------- |
| Nominatim (obecnie)   | 0 zł               | 1 req/s, 2–3 zapytania na zapis – wolne |
| MapTiler Geocoding    | w planie Flex      | Ten sam vendor co kafelki               |
| Mapbox Geocoding      | 100k/mies. free    | Dobre trafienia w PL                    |
| Geoapify / LocationIQ | od ~0              | Tańsze alternatywy komercyjne           |

Podmiana geokodowania jest **osobnym slice’em** od mapy fana; można zrobić później lub razem z MapTiler/Mapbox.

### Szacunek kosztów (mapa fanów, web)

Założenie: 2 000–10 000 odsłon `/events` miesięcznie, ~30% użytkowników otwiera zakładkę mapy.

| Scenariusz             | Map loads / sesje     | Szacowany koszt               |
| ---------------------- | --------------------- | ----------------------------- |
| OpenFreeMap + MapLibre | bez limitu formalnego | **0 zł**                      |
| Mapbox                 | 600–3 000 loads       | **0 zł** (w free tier)        |
| MapTiler Flex          | 600–3 000 sesji       | **25 USD/mies.** (commercial) |

Przy MVP ruchu wszystkie opcje mieszczą się w budżecie „niewielki koszt”.

### Proponowany plan migracji (wysoki poziom)

**Faza 0 – quick wins (1–2 h)** – bez zmiany providera:

1. Renderować `EventsMap` tylko gdy mapa jest widoczna (`mobileTab === "map"` || desktop).
2. `scrollWheelZoom={false}` na touch / `touchZoom` + `dragging` true.
3. `onHighlightEvent` na `click` markera zamiast tylko hover (mobile).
4. Opcjonalnie: `import()` chunku mapy po `requestIdleCallback` na desktop.

**Faza 1 – MapLibre + OpenFreeMap Dark (1–2 dni)**:

1. Dodać `maplibre-gl`, `react-map-gl`; usunąć `leaflet`, `react-leaflet`, `@types/leaflet`.
2. Przepisać `EventsMap.tsx` – ten sam kontrakt props (`events`, `highlightedEventId`, callbacks).
3. Markery: warstwa `circle` GeoJSON lub `Marker` z react-map-gl + neon CSS.
4. Zachować lazy load + `client:only` wzorzec z `lessons.md` (Radix vs mapa).
5. Testy: smoke E2E na `/events` (zakładka Mapa, klik pinu).
6. Attribution OSM w stopce mapy (wymóg OpenFreeMap).

**Faza 2 – opcjonalnie płatny provider**:

- MapTiler: własny styl dark + geokodowanie admina.
- Mapbox: styl w Studio pod brand BassMap.

**Faza 3 – PWA (S-27)**:

- Service worker: **nie cache’ować** kafelków mapy agresywnie (świeże tiles); statyczny chunk MapLibre może iść do precache.

### Zgodność ze stackiem

- Astro 6 SSR + Cloudflare Workers – klucz API (jeśli MapTiler/Mapbox) przez `astro:env` server-only **nie** wystarczy dla kafelków w przeglądarce; potrzebny **publiczny token z ograniczeniem URL** (referrer / domain restriction).
- React 19 – `react-map-gl` v7+ wspiera MapLibre.
- Brak zmian w Supabase / RLS – współrzędne bez zmian.

## Code References

- `src/components/discovery/EventsMap.tsx:14–16` – URL kafelków CARTO raster
- `src/components/discovery/EventsMap.tsx:93–124` – MapContainer, markery, tooltips
- `src/components/discovery/DiscoveryShell.tsx:10–17` – lazy import Leaflet
- `src/components/discovery/DiscoveryShell.tsx:128–141` – mapa ukryta ale montowana na mobile
- `src/pages/events.astro:63–69` – `client:only="react"` na DiscoveryShell
- `src/lib/geocoding/nominatim.ts` – geokodowanie admin (osobny problem)
- `src/lib/geocoding/city-centers.ts:33–47` – współrzędne pinów bez API
- `package.json` – `leaflet`, `react-leaflet`, `@types/leaflet`
- `src/styles/global.css:211–230` – style Leaflet tooltip

## Architecture Insights

- Mapa fana jest **read-only** względem współrzędnych – geokodowanie runtime nie jest potrzebne (rozstrzygnięte w S-02).
- Lazy loading + `client:only` rozwiązuje SSR (`window`), ale tworzy opóźnienie first paint mapy.
- Liczba eventów na mapie jest mała (dziesiątki, nie tysiące) – wąskie gardło to **kafelki i ładowanie JS**, nie render markerów.
- PWA (S-27) zwiększa wagę wydajności mapy na telefonie – migracja mapy warto zsynchronizować z lub tuż po PWA.

## Historical Context (from prior changes)

- `context/archive/2026-06-11-fan-event-discovery/plan-brief.md` – świadomy wybór Leaflet + OSM (zero kosztu).
- `context/archive/2026-06-11-fan-event-discovery/plan.md` – `client:only` vs obecny `lazy` + `useSyncExternalStore`.
- `context/archive/2026-06-12-testing-location-discovery/research.md` – testowanie pinów przez `resolveMapCoordinates`, nie Leaflet.
- `context/changes/mobile-app/research.md` – PWA na Cloudflare; uwaga na cache HTML (nie mylić z kafelkami mapy).

## Related Research

- `context/changes/mobile-app/research.md` – PWA (S-27)
- `context/foundation/pwa-research.md` – decyzje produktowe mobile

## Open Questions

1. Czy bassmap.pl traktujemy jako **użytek komercyjny** w rozumieniu MapTiler Free? (jeśli tak → od razu Flex 25 USD lub OpenFreeMap/Mapbox free).
2. Czy priorytetem jest **wygląd** (custom neon w Mapbox Studio) czy **koszt 0 zł** (OpenFreeMap)?
3. Czy w tym samym slice podmieniamy **Nominatim** w adminie, czy osobno?
4. Czy na mapie potrzebujemy **clusteringu** przy wzroście liczby eventów (np. >100)?

---

## Follow-up Research 2026-06-30

**Pytanie:** Co jest najsensowniejsze patrząc na obecny układ strony? Priorytet: możliwość dostosowania kolorystyki do stylu BassMap; mapa ma wyglądać tak jak teraz.

### Werdykt (krótko)

Najrozsądniejsza ścieżka: **zamienić silnik (Leaflet → MapLibre)**, ale **zachować cały „dekor” i układ strony bez zmian**, a pod spodem użyć **własnego stylu wektorowego opartego na Dark Matter** (ten sam rodzina co obecne kafelki CARTO `dark_all`). Kolory edytujesz wizualnie w **Maputnik** lub **MapTiler Cloud Editor** – plik stylu trzymamy w repozytorium (`public/map/bassmap-dark.json`).

**Nie polecamy** zostawać przy samym Leaflet + CARTO, jeśli zależy Ci na dopasowaniu kolorów tła mapy: raster CARTO ma tylko gotowe presety (`dark_all`, `dark_nolabels`…), bez wygodnej edycji kolorów wód/dróg. Dodatkowo CARTO basemaps w użyciu komercyjnym wymagają licencji Enterprise – BassMap jako produkt powinien iść na własny/hostowany styl wektorowy.

### Jak mapa wygląda dziś – warstwy (co musimy odtworzyć)

Wygląd „neon BassMap” to nie tylko kafelki – to **stos warstw**:

| Warstwa                       | Gdzie w kodzie                                 | Zależność od Leaflet?       |
| ----------------------------- | ---------------------------------------------- | --------------------------- |
| Ciemne tło geograficzne       | CARTO `dark_all` (Dark Matter raster)          | Tak – tylko jako TileLayer  |
| Siatka fioletowa 48px         | `EventsMap.tsx` → `.grid-backdrop`             | **Nie** – zwykły div CSS    |
| Ciemna „winietka” na brzegach | radial-gradient `oklch(0.13…)`                 | **Nie**                     |
| Ramka panelu                  | `shellPanelFlat`                               | **Nie**                     |
| Badge „Polska · mapa”         | Equalizer + mono uppercase                     | **Nie**                     |
| Pinezki neon                  | `oklch(0.62 0.25 300)` / `oklch(0.85 0.2 175)` | Częściowo – HTML w markerze |
| Tooltip karty eventu          | `global.css` `.discovery-map-tooltip`          | Tak – klasy Leaflet         |

**Wniosek:** ~70% charakteru wizualnego (siatka, winietka, ramka, badge, kolory pinów) to **Twój CSS i React** – przenosi się 1:1 na MapLibre. Zmienia się głównie sposób rysowania tła mapy i API tooltipów (Leaflet Tooltip → React Popup nad mapą).

Paleta brandu z `global.css`: tło `oklch(0.13 0.015 280)`, primary fiolet `oklch(0.62 0.25 300)`, accent miętowy `oklch(0.85 0.2 175)` – te same wartości można wpisać w edytorze stylu mapy dla dróg/obrysów albo zostawić stonowane na tle (jak teraz CARTO dark).

### Układ strony `/events` – co zostaje bez zmian

```
DiscoveryShell
├── Nagłówek MAP THE BASS
├── Mobile: zakładki [Lista | Mapa]
├── Grid md:grid-cols-2
│   ├── Lewa kolumna: EventFilters (desktop zawsze; mobile tylko na Liście)
│   └── Prawa kolumna: EventsMap (min-h 320px; desktop min(60vh,520px))
└── EventList (pełna szerokość pod gridem)
```

- **Desktop:** mapa w prawej połowie, obok filtrów – wysokość `min(60vh, 520px)`.
- **Mobile:** mapa na pełną szerokość po tapnięciu „Mapa”; lista pod spodem po powrocie do „Lista”.
- **Silnik mapy** siedzi w jednym `div` z `h-full min-h-[320px]` – MapLibre wypełnia ten sam kontener; **nie trzeba zmieniać layoutu Astro ani grida**.

Jedyna sensowna zmiana układu (niezależna od providera): **nie montować mapy na mobile**, dopóki użytkownik nie wybierze zakładki „Mapa” – dziś mapa ładuje się w tle nawet na Liście (`hidden` tylko wizualnie).

### Dopasowanie wizualne do obecnego CARTO `dark_all`

Obecny URL: `basemaps.cartocdn.com/dark_all` = styl **Dark Matter** CARTO (ciemna mapa pod wizualizacje danych, dane OSM).

W ekosystemie wektorowym ten sam styl to **OpenMapTiles Dark Matter GL**:

- JSON: `https://openmaptiles.github.io/dark-matter-gl-style/style-cdn.json`
- OpenFreeMap dark: fork Dark Matter – `https://tiles.openfreemap.org/styles/dark`

Uwaga z community: wersja OpenMapTiles bywa **nieco ciemniejsza** niż nowsze CARTO dark (2017+). Żeby mapa wyglądała **jak teraz**, w Maputnik podbijamy kontrast land/water/roads według screenshotu obecnej mapy – jednorazowa praca projektowa, potem plik JSON w repo.

### Opcje pod kątem kolorystyki i wyglądu

| Opcja                                                              | Wygląd jak teraz            | Edycja kolorów                  | Mobile / wydajność                  | Koszt MVP                      |
| ------------------------------------------------------------------ | --------------------------- | ------------------------------- | ----------------------------------- | ------------------------------ |
| **A. MapLibre + własny `bassmap-dark.json` + kafelki OpenFreeMap** | 95–100% po tuningu Maputnik | Pełna (Maputnik, plik w repo)   | Duża poprawa                        | **0 zł**                       |
| **B. MapLibre + MapTiler (styl Dark Matter w chmurze)**            | 95–100%                     | Edytor MapTiler w przeglądarce  | Duża poprawa                        | **~25 USD/mies.** (commercial) |
| **C. Mapbox GL + Studio (fork Dark)**                              | 95–100%                     | Najwygodniejszy edytor wizualny | Duża poprawa                        | **0 zł** do 50k loads/mies.    |
| **D. Leaflet + CARTO raster (zostajemy)**                          | 100%                        | Prawie brak (tylko inny preset) | Mała poprawa po optymalizacji mount | **0 zł\***                     |
| **E. Leaflet + MapLibre-gl-leaflet + wektor**                      | Wysoka                      | Średnia                         | Pośrednia; dwa silniki              | 0 zł                           |

\*CARTO w użyciu komercyjnym formalnie wymaga licencji Enterprise – ryzyko prawne przy skalowaniu produktu.

### Rekomendacja pod Twoje kryteria

**Tier 1 (zalecane): Opcja A – MapLibre + własny styl w repozytorium**

1. Silnik: `maplibre-gl` + `react-map-gl` (zamiast Leaflet).
2. Styl: fork `dark-matter-gl-style` → `public/map/bassmap-dark.json`; kafelki z OpenFreeMap (darmowe) lub MapTiler po przejściu na plan komercyjny.
3. **Ty lub designer** tunuje kolory w [Maputnik](https://maplibre.org/maputnik/) (darmowy edytor w przeglądarce) – bez kodowania.
4. W `EventsMap.tsx` **bez zmian wizualnych**: `grid-backdrop`, winietka, badge, te same `oklch` na pinach.
5. Tooltip: ten sam JSX `EventMapTooltip`, osadzony w Popup MapLibre zamiast Leaflet Tooltip – te same klasy CSS (po drobnej zmianie selektorów z `.leaflet-tooltip` na własną klasę).

**Tier 2 (jeśli wolisz edytor „jak Figma dla mapy”): Opcja C – Mapbox Studio**

- Ten sam układ strony i overlaye BassMap.
- Styl Dark w Studio → eksport pod MapLibre-compatible JSON lub natywny Mapbox GL.
- Wyższy komfort edycji kolorów, free tier wystarczy na MVP.

**Czego unikać przy Twoim wymaganiu:**

- **OpenFreeMap „out of the box” bez tuningu** – blisko, ale może minimalnie odbiegać od CARTO.
- **Google Maps** – trudno osiągnąć obecny dark/neon.
- **Sama optymalizacja Leaflet** – szybsze ładowanie, ale **nie daje kontroli nad kolorystyką tła mapy**.

### Plan implementacji (dopasowany do układu)

**Faza 0 – bez zmiany wyglądu (½ dnia)**  
Warunkowe montowanie mapy na mobile; gesty dotykowe – zero wizualnych różnic.

**Faza 1 – styl (projekt, 2–4 h)**  
Screenshot obecnej mapy na `/events` → Maputnik → dopasowanie Dark Matter → zapis `public/map/bassmap-dark.json`.

**Faza 2 – kod (1–2 dni)**  
Podmiana `EventsMap.tsx`; przeniesienie stylów tooltipa z `.leaflet-*` na `.discovery-map-popup`; test wizualny desktop + mobile (zakładka Mapa).

**Faza 3 – opcjonalnie**  
MapTiler hostowany styl + geokodowanie admina zamiast Nominatim.

### Otwarte pytania (zawężone)

1. Kto robi tuning kolorów w Maputnik – Ty, czy wystarczy „maksymalnie blisko” bez pixel-perfect?
2. Czy akceptujesz **Mapbox** (własnościowy) jeśli edytor kolorów okaże się wygodniejszy niż Maputnik?
3. Geokodowanie admina w tym samym slice, czy osobno?

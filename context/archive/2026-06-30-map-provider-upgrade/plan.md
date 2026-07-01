# Plan: Podmiana silnika mapy (MapLibre)

> Źródło: `research.md`. Plan retrospektywny po implementacji.

## Phase 0: Quick wins (mobile mount + gesty)

- Warunkowy mount mapy na mobile (`shouldMountMap`)
- `scrollZoom` tylko przy `(pointer: fine)`
- Dwa tapy na coarse pointer (podgląd → nawigacja)

## Phase 1: MapLibre + styl bassmap-dark.json

- `maplibre-gl`, `react-map-gl`; usunięcie Leaflet
- `public/map/bassmap-dark.json` (Dark Matter / OpenFreeMap)
- Overlaye BassMap zachowane (siatka, winietka, badge, piny, popup)

## Phase 2: Zoom, testy, jakość

- `NavigationControl` (+/−)
- Smoke E2E: canvas mapy + klik pinezki
- Perf E2E lokalnie (`*.perf.spec.ts`, wykluczone z CI)
- `onError` fallback UI

## Progress

### Phase 0

#### Automated

- [x] 0.1 `npm run check` – EventsMap / DiscoveryShell

#### Manual

- [x] 0.2 Mobile: mapa nie ładuje się na zakładce Lista

### Phase 1

#### Automated

- [x] 1.1 `npm run build` – chunk MapLibre + lazy EventsMap
- [x] 1.2 Brak importów `leaflet` w `src/`

#### Manual

- [x] 1.3 Wygląd mapy: dark + overlaye neon

### Phase 2

#### Automated

- [x] 2.1 `npm run test:e2e` – smoke z mapą
- [x] 2.2 `npm run test:e2e -- map-loading.perf.spec.ts` (lokalnie)

#### Manual

- [x] 2.3 Zoom +/− i kółko myszy na desktopie

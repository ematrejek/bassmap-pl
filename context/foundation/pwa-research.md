---
project: BassMap PL
status: active
created: 2026-06-30
roadmap_id: S-27
change_id: mobile-app
source: research session 2026-06-30
---

# Research: BassMap PL jako PWA (S-27)

> Kanoniczna roadmapa: @context/foundation/roadmap.md (S-27).  
> Decyzja produktowa: **PWA first**, bez App Store / Google Play w pierwszej wersji.

## Cel

Użytkownik na telefonie może **zainstalować BassMap na ekran główny** i korzystać z niego jak z aplikacji – bez publikacji w sklepach i bez osobnego kodu mobilnego.

**PWA** (Progressive Web App) to zwykła strona internetowa z dodatkowymi plikami, które mówią przeglądarce: „traktuj mnie jak aplikację”. Użytkownik widzi ikonę, pełny ekran (bez paska przeglądarki) i szybsze ponowne otwarcie.

## Stan obecny (2026-06-30)

| Element | BassMap PL |
| ------- | ---------- |
| Hosting | Cloudflare Workers, HTTPS na `https://bassmap.pl` |
| Framework | Astro 6 SSR + React islands |
| Manifest PWA | **brak** |
| Service worker | **brak** |
| Ikony PWA (192/512, maskable) | **brak** (tylko `favicon.svg` / `favicon.png`) |
| `theme-color` | jest w `Layout.astro` (`#08080c`) |
| Viewport meta | jest (`width=device-width`) |

Wniosek: aplikacja jest **gotowa technicznie na PWA** (HTTPS, responsywny layout), brakuje tylko warstwy instalowalności.

## Decyzja strategiczna

| Etap | Co | Kiedy |
| ---- | -- | ----- |
| **v1 (S-27)** | PWA instalowalna – manifest, ikony, service worker, ekran offline | teraz (po S-26 zalecane, nie blokuje research/planu) |
| **v2 (opcjonalnie)** | Capacitor – ta sama strona opakowana do sklepów | tylko jeśli PWA + dane GA pokażą potrzebę |
| **v3 (mało prawdopodobne)** | React Native od zera | tylko przy silnej potrzebie funkcji natywnych |

**Powód:** PWA to rozszerzenie istniejącej strony SSR – jeden kod, niski koszt utrzymania, brak opłat sklepowych i review w App Store / Google Play.

## Wymagania instalowalności (przeglądarki)

Źródła: [MDN – Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [Vite PWA – Astro](https://vite-pwa-org.netlify.app/frameworks/astro).

### Wspólne

- HTTPS (mamy na produkcji)
- Plik **manifest** z: `name`, `start_url`, `display` (`standalone`), ikony **192×192** i **512×512** PNG

### Android (Chrome, Edge, Samsung Internet)

- Zarejestrowany **service worker** z obsługą `fetch`
- Przeglądarka może pokazać automatyczny prompt instalacji lub ikonę w pasku adresu
- Można też własny przycisk „Zainstaluj” (`beforeinstallprompt`)

### iOS (Safari 16.4+)

- **Brak** automatycznego promptu jak na Androidzie
- Użytkownik: Udostępnij → **Dodaj do ekranu początkowego**
- Warto dodać `apple-touch-icon` i krótką instrukcję w UI (opcjonalnie w v1)

## Rekomendowana implementacja techniczna

### Integracja: `@vite-pwa/astro`

Oficjalna integracja Vite PWA dla Astro – generuje manifest i service worker (Workbox), pasuje do obecnego stacku (Astro 6 + Vite 7 + Cloudflare adapter).

```bash
npm install -D @vite-pwa/astro vite-plugin-pwa
```

Kluczowe elementy:

1. **`AstroPWA`** w `astro.config.mjs` – manifest, workbox, `registerType: "autoUpdate"`
2. **Rejestracja SW** w `src/layouts/Layout.astro` – `registerSW` z `virtual:pwa-register` (Astro nie wstrzykuje skryptów sam)
3. **Ikony** – `192`, `512`, `maskable` (Android adaptive icons)
4. **Strona `/offline`** – prosty komunikat przy braku sieci
5. **Typy** – `/// <reference types="vite-plugin-pwa/vanillajs" />` w `env.d.ts`

### Strategia cache (ważne dla SSR)

BassMap to **SSR** – treści (lista eventów, profile, forum) powstają na serwerze. Nie celujemy w pełny offline jak w aplikacji natywnej.

| Warstwa | v1 PWA | Uzasadnienie |
| ------- | ------ | ------------ |
| Shell aplikacji (CSS, JS, fonty, favicon) | cache przez SW | szybsze ponowne otwarcie |
| Strony publiczne (`/`, `/events`, szczegóły) | **network-first** lub brak agresywnego cache | świeże dane eventów |
| Strony prywatne (`/profile`, `/my-events`, `/admin`, API) | **nie cache’ować** | unikamy wycieku sesji / starych danych |
| Ekran offline | statyczna strona `/offline` | lepsze UX bez sieci |

`navigateFallback` w Workbox: np. `/offline` lub `/403` – do ustalenia w planie.

### Poza zakresem v1

- Push notifications (osobny temat: zgody, backend, RODO)
- Pełny offline listy wydarzeń
- Publikacja w App Store / Google Play (Capacitor – osobny slice)
- Natywne API (kamera, Bluetooth itd.)

## Proponowany zakres slice'a S-27 (MVP PWA)

1. Manifest + ikony + meta (theme-color, apple-touch-icon)
2. Service worker z auto-update i podstawowym precache statyków
3. Strona `/offline`
4. (Opcjonalnie) baner „Zainstaluj aplikację” na mobile po `beforeinstallprompt`
5. (Opcjonalnie) krótka podpowiedź iOS „Dodaj do ekranu głównego”
6. Testy: Lighthouse PWA, instalacja na Android + iOS, smoke e2e

**Prerequisites:** S-26 (GA4) – **zalecane**, nie twardy blocker na plan/implementację PWA.

## Ryzyka

| Ryzyko | Mitygacja |
| ------ | --------- |
| SSR + cache = nieaktualne dane | network-first dla HTML; nie precache’ować API |
| iOS bez auto-promptu | instrukcja w UI; test na prawdziwym iPhone |
| Sesja Supabase w PWA | cookies działają jak w przeglądarce; nie cache’ować chronionych tras |
| Aktualizacje kodu | `registerType: "autoUpdate"` + opcjonalny toast „Nowa wersja” |

## Następny krok

1. `/10x-new mobile-app` – folder zmiany (done 2026-06-30)
2. `/10x-plan mobile-app` – szczegółowy plan implementacji
3. Po wdrożeniu: `/10x-archive`, zamknięcie #48, kolumna Done na boardzie

## Linki

- [Vite PWA – Astro integration](https://vite-pwa-org.netlify.app/frameworks/astro)
- [MDN – Installable PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [web.dev – Promote PWA installation](https://web.dev/articles/promote-install)

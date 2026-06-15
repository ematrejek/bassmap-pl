---
date: 2026-06-14T12:00:00+02:00
researcher: Cursor Agent
git_commit: bab5d1e
branch: main
repository: bassmap-pl
topic: "Frontend app shell – benchmarki festiwali, frameworki, legalne narzędzia UI, estetyka DnB (ciemna + stonowane neonowe akcenty)"
tags: [research, frontend, app-shell, design-system, F-04, labiryntfestiwal, dnb]
status: complete
last_updated: 2026-06-14
last_updated_by: Cursor Agent
change_id: app-shell-navigation
roadmap_ref: F-04
---

# Research: Frontend app shell – benchmarki, narzędzia, estetyka DnB

**Data:** 2026-06-14  
**Zmiana:** F-04 `app-shell-navigation`  
**Commit:** `bab5d1e` (main)

> **Uwaga:** Użytkownik wywołał `/10x-infra-research`, ale pytanie dotyczy **frontendu i wyglądu**, nie hostingu. Decyzja infrastrukturalna jest już zamknięta → `context/foundation/infrastructure.md` (Cloudflare Workers + Astro SSR). Ten dokument to research **UI / app shell** pod F-04.

## Research Question

Jak zbudowany jest frontend stron festiwali/eventów (np. labiryntfestiwal.pl)? Jakie frameworki i legalne narzędzia można użyć? Jak pogodzić nowoczesny wygląd ze stylem imprez drum and bass: ciemna kolorystyka, mocne ale stonowane neonowe akcenty (jasnoszary, biały, jasnoniebieski, jasnozielony)?

## Summary

1. **Labirynt Festiwal** to **niestandardowa strona JavaScript** (nie WordPress) – długa, przewijana strona marketingowa z sekcjami statystyk, kartami scen i galerią; hosting LiteSpeed u polskiego providera (Seohost). Wzorzec: **single-page storytelling + mocna typografia + ciemne tło + neonowe nazwy scen** (np. „Cyberglow – Neonowy puls miasta”).

2. **Portale odkrywania eventów** (np. Resident Advisor) idą inną drogą: **aplikacja produktowa** – lista, filtry, szczegóły, ticketing – stack enterprise (Next.js + React + GraphQL), ale **UX** bliższy BassMap niż festiwalowy one-pager.

3. **Strony artystów/DnB** (np. Stackpackers) często używają **Next.js + Tailwind + animacje CSS/Motion** (gradienty, particle overlay) – dobry inspirator **klimatu**, nie architektury portalu.

4. **BassMap już ma ~70% właściwego kierunku wizualnego** (`bg-cosmic`, glassmorphism `border-white/10 bg-white/5`, ciemne karty). F-04 powinien **ułożyć to w spójny app shell** (nawigacja, role, layout), a nie zmieniać stacku.

5. **Rekomendacja stacku UI:** zostać przy **Astro 6 SSR + React islands + Tailwind 4 + shadcn/ui**; dodać tokeny designu pod stonowane neony; opcjonalnie **Motion** (MIT) tylko w islandach nawigacji/homepage; **nie** kopiować cudzych assetów, fontów komercyjnych ani kodu Labiryntu.

## Benchmarki – jak wyglądają strony w branży

### 1. labiryntfestiwal.pl (Labirynt Festiwal)

| Aspekt      | Obserwacja                                                                                                 | Źródło                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Typ strony  | Post-event / marketing: „Dziękujemy”, statystyki, 12 scen jako karty, galeria                              | [labiryntfestiwal.pl](https://labiryntfestiwal.pl/)                                 |
| Technologia | **JavaScript** (custom front); brak WordPress/CMS w wykryciu W3Techs; LiteSpeed, Brotli, HTTP/3            | [W3Techs – labiryntfestiwal.pl](https://w3techs.com/sites/info/labiryntfestiwal.pl) |
| Layout      | Długi scroll, sekcje full-width, duże liczby (25 000 m², 88 artystów), siatka kart scen                    | live site                                                                           |
| Estetyka    | Ciemne tło, sceny z własną tożsamością kolorystyczną; DnB scena „175 BPM”; copy „Cyberglow – neonowy puls” | live site                                                                           |
| Nawigacja   | Brak klasycznego portalu – **jedna opowieść**, nie menu aplikacji                                          | live site                                                                           |

**Wniosek dla BassMap:** Labirynt to wzór pod **S-09 marketing homepage** (scroll, emocja, sekcje), nie pod **F-04 app shell** listy/map. Warto skopiować **klimat** (ciemność, neon w copy i akcentach), nie strukturę.

### 2. Typowe strony festiwali (WordPress / Elementor)

Wiele mniejszych festiwali (np. porównywalne UK) stoi na **WordPress + Elementor + WooCommerce** (bilety). To szybkie dla organizatora, ciężkie dla produktu typu BassMap (filtry, mapa, SSR, auth).

**Wniosek:** **Nie migrować** do WordPress – BassMap ma już lepszy fundament pod portal.

### 3. Resident Advisor (portal eventów)

| Aspekt   | Obserwacja                                                                                 |
| -------- | ------------------------------------------------------------------------------------------ |
| Cel      | Odkrywanie + ticketing + editorial                                                         |
| Frontend | React, główna strona Next.js, GraphQL backend (.NET)                                       |
| UX       | Lista/wyszukiwarka, filtry geograficzne/gatunkowe, strona eventu – **blisko BassMap S-02** |

Źródła: [RA job posting – Next.js/React](https://app.welcometothejungle.com/jobs/WUNtNkF5), [echoloc tech stack](https://echoloc.ai/company/ra/).

**Wniosek:** App shell BassMap powinien przypominać **RA (nawigacja produktowa)**, a homepage marketingowa – **Labirynt (storytelling)**.

### 4. Stackpackers / Luminal (DnB / festiwal – design-heavy)

| Wzorzec            | Opis                                                      | Legalność inspiracji             |
| ------------------ | --------------------------------------------------------- | -------------------------------- |
| Next.js + Tailwind | Strona duetu DnB z gradientem, particle/lightning overlay | MIT stack – wzór architektury OK |
| Motion / GSAP      | Animacje wejścia, scroll                                  | MIT – OK komercyjnie             |
| Tiered motion      | Ciężkie efekty tylko gdy urządzenie da radę               | Dobry wzorzec wydajności         |

Źródła: [stackpackers-website](https://github.com/saradomincroft/stackpackers-website), [Luminal case study](https://www.thecodra.com/work/luminal).

**Wniosek:** Efekty „bass / neon” dodawać **oszczędnie** (nagłówek, CTA), nie na całej liście eventów – PRD mówi desktop-first + mapa Leaflet wymaga lekkiego DOM.

## Stan BassMap PL (baseline kodu)

### Layout dziś

`Layout.astro` to minimalna otoczka HTML – **bez globalnej nawigacji**; każda strona sama składa Topbar + treść:

```1:44:src/layouts/Layout.astro
---
import "../styles/global.css";
// ...
---
<!doctype html>
<html lang="pl">
  <!-- head -->
  <body>
    <slot />
    <CookieConsentBanner />
  </body>
</html>
```

Strona główna (`index.astro`): `bg-cosmic` + `Topbar` + `DiscoveryShell` + stopka.

### Istniejąca estetyka (zgodna z wymaganiami użytkownika)

| Element        | Implementacja                                                 | Ocena vs wymaganie                                                      |
| -------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Ciemne tło     | `@utility bg-cosmic` – gradient `#0a0e1a → #0f1529`           | ✅ ciemna kolorystyka DnB                                               |
| Szkło / panele | `border-white/10 bg-white/5 backdrop-blur-xl`                 | ✅ nowoczesne, czytelne                                                 |
| Tekst          | `text-white`, `text-blue-100/70`                              | ✅ jasnoszary / biały                                                   |
| Akcenty        | głównie **purple** (`purple-200`, `purple-300`, `purple-400`) | ⚠️ częściowo OK; user chce **jasnoniebieski + jasnozielony** jako neony |
| Nawigacja      | `Topbar.astro` – pasek linków, bez menu mobilnego / ról       | ❌ to właśnie F-04                                                      |

### shadcn/ui + Tailwind 4

Projekt ma już tokeny CSS w `global.css` (OKLCH, `.dark`) i komponenty w `src/components/ui/`. To **legalny, copy-paste model MIT** – idealny pod custom theme DnB bez vendor lock-in.

## Legalne narzędzia – co wolno, czego nie

### ✅ Zalecane (już w projekcie lub bezpieczne do dodania)

| Narzędzie                   | Licencja      | Zastosowanie w F-04 / Partia II                                            |
| --------------------------- | ------------- | -------------------------------------------------------------------------- |
| **Tailwind CSS 4**          | MIT           | layout, responsywność, tokeny kolorów                                      |
| **shadcn/ui** (Radix)       | MIT           | Sheet (menu mobilne), Navigation Menu, Tabs, Button, Dropdown              |
| **Lucide React**            | ISC           | ikony menu, hamburger, mapa, kalendarz                                     |
| **tw-animate-css**          | (w projekcie) | subtelne wejścia panelu menu                                               |
| **Motion** (`motion/react`) | MIT           | animacja otwarcia drawer / active tab (opcjonalnie)                        |
| **Lucide Animated**         | MIT           | animowane ikony hover w nav (opcjonalnie, mały bundle)                     |
| **Google Fonts (OFL)**      | SIL OFL       | np. **Space Grotesk** (nagłówki) + **Inter** (tekst) – darmowe komercyjnie |
| **Leaflet / react-leaflet** | BSD-2         | mapa – bez zmian                                                           |

### ⚠️ Ostrożnie

| Narzędzie                                 | Ryzyko                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| **Three.js / R3F**                        | MIT, ale ciężkie – tylko hero homepage (S-09), nie app shell                         |
| **GSAP**                                  | Standardowa licencja – darmowa dla większości użyć; sprawdzić przy pluginach premium |
| **Szablony ThemeForest / klon Labiryntu** | Prawa autorskie layoutu/grafik – **nie kopiować** kodu ani assetów                   |
| **Fonty z cudzych stron**                 | Wyciąganie WOFF z Labiryntu = naruszenie licencji                                    |

### ❌ Nie robić

- Kopiowanie HTML/CSS/JS z labiryntfestiwal.pl ani ich zdjęć/logo.
- „Scrapowanie” komponentów z cudzych stron bez licencji.
- Całkowita zmiana stacku (Next.js rewrite) – koszt >> korzyść przy działającym Astro SSR.

## Propozycja design systemu – „Muted Neon DnB”

Zgodnie z wymaganiami użytkownika: **ciemno + neony stonowane** (nie jaskrawy magenta/cyan jak w latach 90.).

### Paleta (propozycja tokenów CSS)

| Rola               | Token / wartość                                   | Użycie                               |
| ------------------ | ------------------------------------------------- | ------------------------------------ |
| Tło główne         | `#0a0e1a` (obecny cosmic)                         | cała aplikacja                       |
| Tło podniesione    | `oklch(0.18 0.02 260)` / `slate-900/80`           | karty, menu                          |
| Tekst główny       | `white` / `oklch(0.98 0 0)`                       | nagłówki, treść                      |
| Tekst drugorzędny  | `oklch(0.75 0.02 250)`                            | opisy, meta eventów                  |
| Obramowania        | `white/10`                                        | panele (już jest)                    |
| **Neon niebieski** | `oklch(0.78 0.12 220)` ≈ `sky-300`                | linki aktywne, focus ring, ikony nav |
| **Neon zielony**   | `oklch(0.78 0.14 155)` ≈ `emerald-300`            | CTA „Znajdź event”, badge „darmowe”  |
| **Neon szary**     | `oklch(0.85 0.02 250)`                            | hover tekstu, separators             |
| Akcent legacy      | `purple-300` → **stopniowo zastąpić** sky/emerald | spójność z obecnymi formularzami     |

### Wzorce UI (z benchmarków, dopasowane do BassMap)

1. **App shell (F-04):** sticky header z blur; logo + hamburger (mobile) / poziome zakładki (desktop); menu zależne od roli (gość / fan / admin).
2. **Glass panel:** `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl` – już używane w filtrach – **standard całego shellu**.
3. **Aktywna zakładka:** cienka linia neon (`border-b-2 border-sky-400/80`) + lekki glow `shadow-[0_0_20px_-8px_rgba(56,189,248,0.5)]` – **subtelnie**, nie cały przycisk świecący.
4. **Marketing (S-09):** sekcje jak Labirynt – duże liczby, scroll snap opcjonalny; **bez** przenoszenia listy eventów na `/`.
5. **Reduced motion:** `prefers-reduced-motion` wyłącza glow i animacje drawer.

### Typografia (propozycja)

| Warstwa        | Font                   | Uzasadnienie                             |
| -------------- | ---------------------- | ---------------------------------------- |
| Display / logo | Space Grotesk lub Sora | geometryczny, „elektronika”, darmowy OFL |
| UI / body      | Inter lub Geist        | czytelność filtrów i list na desktop     |

## Rekomendacja architektury frontendu (F-04)

**Nie zmieniać frameworka.** Rozszerzyć layout:

```
Layout.astro
  └── AppShell.astro (NOWY)
        ├── AppHeader (logo, nav, menu Sheet mobile)
        ├── RoleNav (zakładki zależne od auth + isAdmin)
        ├── <slot /> (treść strony)
        └── SiteFooter (już istnieje – wpiąć globalnie)
```

**Komponenty shadcn do dodania:** `sheet`, `navigation-menu` (lub prostsze linki + `tabs` na desktop), ewentualnie `dropdown-menu` dla konta.

**React vs Astro:** shell statyczny w Astro; interaktywny drawer/tabs jako **jeden** React island (`client:load` lub `client:visible`) – zgodnie z konwencją repo.

**Routing (open question):** research **nie rozstrzyga** `/` vs `/events` – to decyzja produktowa. App shell powinien przyjmować **ścieżki jako props**, żeby routing można było zmienić bez przebudowy nav.

## Porównanie frameworków (gdyby startować od zera – dla kontekstu)

| Framework             | Festiwale / eventy               | Verdict dla BassMap                               |
| --------------------- | -------------------------------- | ------------------------------------------------- |
| WordPress + Elementor | Bardzo częste u organizatorów    | ❌ zły fit pod mapę + SSR + auth                  |
| Next.js + Tailwind    | RA, artist sites, nowe festiwale | ✅ wzór branżowy, ale **migracja nieuzasadniona** |
| Astro + islands       | Mniej festiwali, dobry portal    | ✅ **już wybrany i wdrożony**                     |
| Webflow / Framer      | Szybki marketing                 | ❌ oddzielny hosting, brak Supabase SSR           |

## Code References (BassMap)

- `src/layouts/Layout.astro` – brak globalnego shellu
- `src/components/Topbar.astro` – prototyp nawigacji do zastąpienia/rozszerzenia
- `src/pages/index.astro` – wzorzec strony z `bg-cosmic`
- `src/styles/global.css` – tokeny shadcn + `bg-cosmic`
- `src/components/discovery/EventFilters.tsx` – glass panel pattern
- `context/foundation/infrastructure.md` – hosting Cloudflare (bez zmian)

## Open Questions

1. **`/` vs `/events`** – blokuje finalną mapę linków w nav (owner: user).
2. **Logo BassMap** – czy jest wektor/SVG brand book, czy tekstowy logotyp w Space Grotesk?
3. **Intensywność neonu** – mockup jednego ekranu (header + lista) przed `/10x-plan`?
4. **Font display** – Space Grotesk vs zostawić systemowy stack na MVP shell?

## Następny krok

1. **`/10x-frame`** – rozstrzygnąć routing `/` vs `/events` (jeśli user gotowy).
2. **`/10x-plan`** – fazowy plan: tokeny kolorów → `AppShell` → migracja stron z `Topbar` → testy wizualne mobile.

---

**Checked:** 2026-06-14 (web: W3Techs, labiryntfestiwal.pl, shadcn docs, Motion MIT, RA hiring pages)

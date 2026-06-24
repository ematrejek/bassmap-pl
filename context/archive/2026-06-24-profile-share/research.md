---
date: 2026-06-24T12:00:00+02:00
researcher: Auto
git_commit: 07695be4acac74e939d3c95cf37fe45d2e4a3651
branch: main
repository: bassmap-pl
topic: "S-28 profile-share – co istnieje w kodzie i jak zaimplementować udostępnianie profilu"
tags: [research, codebase, profile-share, S-28, fan-profile, clipboard, web-share]
status: complete
last_updated: 2026-06-24
last_updated_by: Auto
---

# Research: S-28 profile-share – udostępnianie profilu fana

**Date**: 2026-06-24T12:00:00+02:00  
**Researcher**: Auto  
**Git Commit**: `07695be4acac74e939d3c95cf37fe45d2e4a3651`  
**Branch**: main  
**Repository**: ematrejek/bassmap-pl

## Research Question

Jak zaimplementować slice **S-28 (profile-share)**: przycisk «Udostępnij» na `/profile` i `/u/login`, kopiowanie linku do publicznego profilu z potwierdzeniem „Skopiowano”, opcjonalnie Web Share API na mobile – w oparciu o istniejący kod po S-20?

## Summary

**S-28 to greenfield w warstwie UI** – w `src/` nie ma jeszcze schowka, Web Share API, toastów ani przycisku udostępniania. Infrastruktura URL jest gotowa po S-20:

- Ścieżka publiczna: `/u/{login}` (bez `@` w URL, lowercase)
- Helper: `fanPublicProfilePath(login)` w [`src/lib/routes.ts`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/lib/routes.ts#L12-L16)
- Pełny link: `absoluteUrl(fanPublicProfilePath(login))` → np. `https://bassmap.pl/u/siemema` ([`src/lib/site.ts`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/lib/site.ts#L5-L7))

**Najlepsze miejsce na przycisk:** wspólny komponent [`ProfileView.tsx`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/components/fan/ProfileView.tsx#L65-L70) (obok «Edytuj profil») – obsługuje zarówno `/profile` (przez `ProfileSection`), jak i `/u/[login]` (przez `PublicProfileView`).

**Wzorce feedbacku:** projekt nie używa toastów (brak sonner/shadcn toast). Potwierdzenie „Skopiowano” najlepiej zrobić jako **lokalny stan** (np. zmiana tekstu przycisku na 2 s) lub **zielony baner inline** – wzorzec z `FanEventsTable.tsx` / `index.astro`.

**Poza v1:** Facebook/Instagram share, Open Graph meta, QR – świadomie odłożone w roadmapie.

## Detailed Findings

### Trasy i strony profilu

| Trasa | Plik | Chroniona? | Komponent React |
|-------|------|------------|-----------------|
| `/profile` | [`src/pages/profile.astro`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/pages/profile.astro) | Tak (`middleware.ts`) | `ProfileSection` (`client:only="react"`) |
| `/u/[login]` | [`src/pages/u/[login].astro`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/pages/u/%5Blogin%5D.astro) | Nie (publiczna) | `PublicProfileView` (`client:only="react"`) |

Publiczna strona normalizuje login (`@` obcinane, lowercase, regex `FAN_LOGIN_REGEX`) i zwraca 404 gdy profil nie istnieje. Właściciel widzący własny profil pod `/u/login` dostaje `isOwner=true` i przycisk «Edytuj profil» przekierowujący na `/profile`.

### Architektura komponentów (S-20)

```
/profile.astro → ProfileSection → ProfileView (onEdit → tryb edycji)
/u/[login].astro → PublicProfileView → ProfileView (onEdit gdy isOwner)
```

- [`ProfileView.tsx`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/components/fan/ProfileView.tsx) – wspólny layout (avatar, bio, podgatunki, social). Jedyny przycisk akcji: «Edytuj profil» (linie 65–70).
- [`PublicProfileView.tsx`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/components/fan/PublicProfileView.tsx) – cienki wrapper; `isOwner` używany tylko do `onEdit`.
- [`ProfileSection.tsx`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/components/fan/ProfileSection.tsx) – orchestracja edycji + sekcja «Idę»; nagłówek «Mój profil» bez przycisków akcji.

**Rekomendacja implementacyjna:** nowy komponent `ProfileShareButton` (lub logika w `ProfileView`) renderowany **zawsze gdy `profile.login` jest ustawiony**, obok/pod «Edytuj profil». Nie w `ProfileEditor` (tryb edycji).

### Budowanie URL do skopiowania

```typescript
import { fanPublicProfilePath } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";

const shareUrl = absoluteUrl(fanPublicProfilePath(profile.login));
// → "https://bassmap.pl/u/siemema"
```

| Element | Źródło |
|---------|--------|
| Origin produkcyjny | [`site.config.mjs`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/site.config.mjs#L2) – `SITE_ORIGIN = "https://bassmap.pl"` |
| Astro `site` | [`astro.config.mjs`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/astro.config.mjs) – import `SITE_ORIGIN` |
| Wzorzec absolutnego URL | już używany w [`sitemap-events.xml.ts`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/pages/sitemap-events.xml.ts) |

`fanPublicProfilePath` jest **przetestowany** ([`routes.test.ts`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/tests/unit/routes.test.ts)) ale **nieużywany w UI** – S-28 będzie pierwszym konsumentem.

**Uwaga lokalnego dev:** `SITE_ORIGIN` jest zawsze `https://bassmap.pl` – przy kopiowaniu na localhost link wskazuje na produkcję (zgodnie z roadmapą: kanoniczny URL). Jeśli to problem w dev, rozważyć warunek `import.meta.env.DEV` – **nie ma precedensu** w kodzie; domyślnie trzymać produkcyjny origin.

### Clipboard i Web Share API

**Brak istniejącej implementacji** w `src/`:
- `navigator.clipboard` – 0 użyć
- `navigator.share` – 0 użyć
- Tekst „Skopiowano” – tylko w roadmapie

**Proponowany flow v1 (zgodny z roadmapą):**

1. Klik «Udostępnij»
2. Jeśli `navigator.share` dostępne → `navigator.share({ title, text, url: shareUrl })`
3. W przeciwnym razie (lub po anulowaniu share) → `navigator.clipboard.writeText(shareUrl)` + feedback „Skopiowano”
4. Fallback gdy clipboard zablokowany → `window.prompt` z linkiem (ostateczność; brak wzorca w repo)

**Bez nowych zależności** – wystarczy React state + natywne API przeglądarki.

### Wzorce potwierdzenia UI (bez toastów)

| Wzorzec | Plik | Zastosowanie dla S-28 |
|---------|------|------------------------|
| Zielony baner sukcesu | [`FanEventsTable.tsx`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/components/fan/FanEventsTable.tsx) L24–27 | Opcjonalny baner pod przyciskiem |
| Zmiana tekstu przycisku | brak precedensu | **Preferowane** – prostsze, bez layout shift |
| `ServerError` (czerwony) | [`ServerError.tsx`](https://github.com/ematrejek/bassmap-pl/blob/07695be4acac74e939d3c95cf37fe45d2e4a3651/src/components/auth/ServerError.tsx) | Błąd kopiowania |

shadcn toast / sonner **nie są zainstalowane** – dodawanie ich tylko dla S-28 byłoby over-engineeringiem.

### Ikony i styl

Projekt używa `lucide-react`. Dla share: `Share2` lub `Link2` (już importowany w formularzach eventów). Przycisk powinien pasować do istniejącego `Button` z shadcn – ten sam wzorzec co «Edytuj profil» (`uppercase`, `tracking-wider`).

### Testy – istniejące i proponowane

**Istniejące (S-20):**

| Plik | Zakres |
|------|--------|
| `tests/unit/routes.test.ts` | `fanPublicProfilePath` |
| `tests/unit/profile-section.test.tsx` | przełączanie edycji |
| `tests/unit/fan-profile-api.test.ts` | API GET/PATCH |
| `tests/integration/fan-profile-rls.test.ts` | RLS |
| `tests/e2e/smoke.spec.ts` | `/profile` redirect; `/u/nieistniejacy` → 404 |

**Proponowane dla S-28:**

| Typ | Scenariusz |
|-----|------------|
| Unit helper | `fanPublicProfileAbsoluteUrl(login)` → pełny URL (nowy helper lub test inline) |
| Unit komponent | mock `navigator.clipboard.writeText`; mock `navigator.share`; klik → „Skopiowano” |
| E2E | opcjonalnie – wymaga fixture profilu w CI (S-20 nie dodał pełnego E2E profilu) |

### Poza zakresem v1 (roadmapa)

- Przyciski Facebook / Instagram – wymagają OG meta na `/u/login`
- Open Graph na stronie profilu – `Layout.astro` ma opcjonalny `ogImage`, `[login].astro` go nie przekazuje
- QR kod – parked
- Backend – nie potrzebny

## Code References

- `src/lib/routes.ts:12-16` – `fanPublicProfilePath(login)` → `/u/{login}`
- `src/lib/site.ts:5-7` – `absoluteUrl(path)` z `SITE_ORIGIN`
- `src/components/fan/ProfileView.tsx:17-22` – props interfejs (brak share)
- `src/components/fan/ProfileView.tsx:65-70` – slot na przyciski akcji
- `src/pages/u/[login].astro` – publiczny profil SSR
- `src/pages/profile.astro` – własny profil (chroniony)
- `site.config.mjs:2` – `SITE_ORIGIN = "https://bassmap.pl"`

## Architecture Insights

1. **Jeden widok, dwie trasy** – S-20 celowo używa `ProfileView` na obu stronach; S-28 powinien trafić tam samo (DRY).
2. **Helpery URL gotowe, UI nie** – `fanPublicProfilePath` + `absoluteUrl` to kompletny stack do linku; brakuje tylko komponentu klienckiego.
3. **Inline feedback > toasty** – konsekwentny wzorzec w całym projekcie; nie wprowadzać sonner tylko dla jednego przycisku.
4. **`client:only="react"`** – profile islands już używają tego wzorca (Radix/SSR lesson); nowy przycisk share działa po hydratacji – clipboard i Web Share wymagają przeglądarki.
5. **Profil zawsze publiczny** (brak przełącznika prywatności w S-20) – każdy zapisany login = link do udostępnienia; share widoczny dla wszystkich odwiedzających `/u/login` (roadmapa nie ogranicza do właściciela).

## Historical Context (from prior changes)

- [`context/archive/2026-06-23-fan-profile-edit/change.md`](context/archive/2026-06-23-fan-profile-edit/change.md) – S-20 outcome; udostępnianie świadomie odłożone do S-28
- [`context/archive/2026-06-23-fan-profile-edit/plan.md`](context/archive/2026-06-23-fan-profile-edit/plan.md) – `fanPublicProfilePath` zaplanowany „do linków przyszłych”; architektura `ProfileView` reuse
- [`context/foundation/roadmap.md`](context/foundation/roadmap.md) L494–514 – pełny scope S-28 v1 i iteracje późniejsze
- Brak `research.md` w archiwum S-20 – kontekst planistyczny w `plan.md` + `plan-brief.md`

## Related Research

- Brak wcześniejszego `research.md` dla `profile-share`
- Archiwum S-20: `context/archive/2026-06-23-fan-profile-edit/` (plan, impl-review)

## Open Questions

1. **Widoczność przycisku** – roadmapa mówi „fan widzi przycisk” na obu stronach; czy gość na cudzym `/u/login` też może udostępniać? (Domyślnie: tak – to promuje profil.)
2. **Profil bez loginu** – lazy-create sugeruje login z e-maila; czy ukryć «Udostępnij» dopóki login nie jest zapisany? (Prawdopodobnie tak – bez loginu brak sensownego URL.)
3. **Web Share vs copy** – roadmapa: copy + Web Share gdy dostępne. Kolejność: share first na mobile, copy jako fallback – do potwierdzenia w planie.
4. **Dev origin** – czy na localhost kopiować `https://bassmap.pl/u/...` (kanoniczny) czy bieżący origin? Roadmapa wskazuje kanoniczny; brak precedensu w kodzie.

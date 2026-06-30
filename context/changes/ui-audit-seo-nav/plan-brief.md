# Audyt UI – SEO, SSR discovery, nawigacja – Plan Brief

> Pełny plan: `context/changes/ui-audit-seo-nav/plan.md`  
> Research: `context/changes/ui-audit-seo-nav/research.md`

## Co i dlaczego

BassMap ma żyć z wyszukiwania w Google i wklejania linków w grupach DnB. Audyt wykazał, że główna strona listy (`/events`) wysyła pusty HTML mimo SSR w stacku, brakuje meta/OG, nawigacja i CTA dla organizatorów są ukryte za JavaScriptem, a stopka i home nie komunikują pełnego zakresu produktu.

Plan domyka wszystkie uwagi audytu w sześciu fazach – od blockera SEO po drobne porządki prawne i stopkę.

## Punkt wyjścia

- Dane na `/events` są już pobierane na serwerze, ale `DiscoveryShell` używa `client:only` → w HTML tylko „Ładowanie listy wydarzeń…”.
- `Layout.astro` ma `<title>` i opcjonalne `og:image` (tylko na `/events/[id]` z okładką).
- `AppMenu` to hamburger na wszystkich szerokościach; login i „Dodaj wydarzenie” są w Sheet po hydratacji.
- Regulamin opisuje komentarze w §5, ale nie w §2 Usługi.

## Stan docelowy

- `/events` w pierwszym responsie zawiera nazwy, daty, miasta i linki do eventów (oraz uproszczone filtry GET w HTML).
- Każda publiczna strona ma sensowny `description` i pełny zestaw OG/Twitter Card.
- Na desktopie w nagłówku widać Lista · Zgłoś event · Zaloguj (SSR); home ma dwa CTA i licznik eventów/miast.
- Stopka: kontakt, zgłoś event, social (gdy skonfigurowane), dokumenty prawne.
- Regulamin §2 wymienia komentarze pod wydarzeniami; strony prawne mają link „Strona główna”.

## Kluczowe decyzje

| Decyzja                     | Wybór                                                      | Dlaczego                                           | Źródło          |
| --------------------------- | ---------------------------------------------------------- | -------------------------------------------------- | --------------- |
| SSR listy na `/events`      | Bogaty `fallback` Astro + `EventDiscoveryListStatic.astro` | Nie psuje Radix w `SubgenreFilter`; minimalny diff | Research / Plan |
| `DiscoveryShell` hydratacja | Zostaje `client:only`                                      | Lekcja z `lessons.md` – Checkbox Radix             | Plan            |
| OG image domyślny           | `/pwa-512x512.png` lub dedykowany `public/og-default.png`  | Już w repo; brak nowego designu                    | Plan            |
| Nawigacja desktop           | `AppHeaderLinks.astro` SSR + hamburger na mobile           | Drugi CTA widoczny bez JS                          | Audyt           |
| Social w stopce             | Stałe w `site.config.mjs`, render gdy URL niepusty         | Brak URL w repo – konfiguracja bez hardcode        | Plan            |
| Map teaser home             | Statyczny blok + link do `/events`                         | Bez MapLibre przed hydracją                        | Audyt           |
| Legal sync                  | Bullet w §2 Regulamin + bump `LEGAL_UPDATED_AT`            | AGENTS.md – legal sync przy zmianie copy           | Plan            |

## Zakres

**W scope:** SSR treści `/events`, meta/OG globalnie, nagłówek SSR, home (2. CTA, stats, teaser), stopka, §2 Regulamin, link powrotu na legal, testy jednostkowe meta + e2e smoke HTML.

**Poza scope:** FAQ, paginacja, redesign karty eventu, osobny CMS OG, pełna nawigacja bez hamburgera na mobile.

## Architektura

```
events.astro (SSR data)
  ├── EventDiscoveryListStatic.astro  → HTML w fallback client:only
  ├── EventFiltersStatic.astro (opcj.) → GET form miasto/free
  └── DiscoveryShell client:only      → mapa, filtry Radix, RSVP

Layout.astro ← description, og*, twitter* ← każda strona (.astro frontmatter)

AppShell.astro
  ├── AppHeaderLinks.astro (SSR, md+)
  └── AppMenu client:only (mobile + pełne menu)
```

## Fazy w skrócie

| Faza              | Dostarcza                        | Główne ryzyko                                          |
| ----------------- | -------------------------------- | ------------------------------------------------------ |
| 1. SSR discovery  | Lista eventów w HTML `/events`   | Duplikacja markupu karty – trzymać jeden format helper |
| 2. Meta / OG      | Udostępnianie linków z podglądem | Złe `SITE_ORIGIN` w dev – testować na build            |
| 3. Nawigacja SSR  | Login i Zgłoś event bez JS       | Rozjazd linków menu SSR vs AppMenu                     |
| 4. Home           | Drugi CTA, stats, teaser         | +2 zapytania Supabase na `/`                           |
| 5. Stopka + legal | Kontakt, social, §2 Regulamin    | Brak URL social – ukryć do konfiguracji                |
| 6. Testy          | Regresja SEO w CI                | Flaky fetch HTML w e2e                                 |

**Wymagania:** Supabase w dev/build; URL social opcjonalnie od właściciela produktu.  
**Szacunek:** ~2–3 sesje implementacji, 6 faz sekwencyjnych (1–2 można częściowo równolegle z 2 po fazie 1).

## Ryzyka

- `client:only` + Radix: nie zmieniać na `client:load` bez refaktoru `SubgenreFilter`.
- Podwójna lista przy wolnej hydratacji (flash) – akceptowalne; opcjonalnie `sr-only` na fallback po hydratacji w przyszłości.
- Audyt viewport na legal był nieaktualny – nie duplikować meta poza `Layout`.

## Kryteria sukcesu

- `curl` / View Source na `/events` zawiera co najmniej jedną nazwę eventu i datę.
- Facebook Sharing Debugger / Discord preview pokazuje tytuł, opis i obrazek dla `/` i `/events`.
- Nagłówek w HTML bez JS zawiera link do logowania i zgłaszania eventu.
- Regulamin §2 wymienia komentarze pod wydarzeniami.

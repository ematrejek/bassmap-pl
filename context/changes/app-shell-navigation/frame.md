---
change_id: app-shell-navigation
framed_at: 2026-06-14
status: accepted
owner: user
---

# Frame: App shell + strona główna + nawigacja gościa

## Decyzja produktowa (2026-06-14)

**`/ ` = strona główna (okładka marketingowa).**  
**`/events` = obecny widok odkrywania (lista + mapa).**

Właściciel produktu potwierdziła routing i pełny szkic strony głównej oraz menu gościa. Obecny wygląd `/` (statyczna lista od razu) **nie pasuje** – ma być dynamiczny, festiwalowy, DnB; na razie **bez logo/grafik**, tylko fonty i kolory.

## Obserwacja vs rozwiązanie

| Obserwacja | Rozwiązanie (zaakceptowane) |
|------------|----------------------------|
| Strona wygląda zbyt statycznie, nie jak impreza DnB | Nowa `/` z płynnym scrollem, typografią display, stonowanymi neonami, lekkimi animacjami |
| Brak spójnej nawigacji | Mały rozwijany kafelek menu (globalny app shell) |
| Lista+mapa na `/` | Przeniesienie na `/events`; `/` tylko marketing |

## Mapa tras (docelowa)

| Ścieżka | Cel | Uwagi |
|---------|-----|--------|
| `/` | Strona główna – scroll, hero, CTA, o nas, kontakt | **Nowa treść** |
| `/events` | Lista + mapa + filtry (obecny `index.astro`) | Stare linki `/?city=…` → **redirect 302** na `/events?…` |
| `/events/[id]` | Szczegóły wydarzenia | bez zmian ścieżki |
| `/auth/signin` | Logowanie | istnieje |
| `/auth/signup` | Rejestracja | istnieje |
| `/archive` | Minione wydarzenia – **tylko lista, bez mapy** | `published` + **data &lt; dziś** (Europe/Warsaw, odwrotność `is_upcoming()`) |
| `/report-issue` | Formularz „Zgłoś problem” | **Wysyłka e-mail** na kontakt@bassmap.pl (2026-06-14) |
| `/polityka-prywatnosci` | Polityka | istnieje – **dyskretny link** na `/` |
| `/regulamin` | Regulamin | istnieje – **dyskretny link** na `/` |
| `/admin/*` | Panel admina | bez zmian |

## Strona główna `/` – sekcje (kolejność scroll)

1. **Hero**
   - Wielki napis logotypu (typografia – brak pliku logo): np. **BassMap PL**
   - Slogan: **Find the place, drop the bass!** (potwierdzony 2026-06-14)
   - Tło dynamiczne: gradient cosmic + subtelny ruch (CSS/Motion), nie statyczna karta

2. **CTA (po scroll w dół)**
   - Przycisk: **„Znajdź swój event!”** → `/events`

3. **Sekcja „Kim jesteśmy i co robimy?”** (copy finalny 2026-06-14)

   > BassMap PL to projekt tworzony przez fanów dla fanów. Tworzymy ten projekt w 100% z pasji i for fun. Naszym celem jest zebranie całej polskiej sceny drum and bass w jednym miejscu, żeby żadna dobra impreza już nigdy Wam nie umknęła. BassMap PL robimy dla Was i dla siebie – po prostu z miłości do muzyki!

4. **Sekcja kontakt / współpraca**
   - Tekst: *Masz jakieś sugestie? Chcesz zaangażować się w projekt? Napisz do nas!*
   - Link mailto: **kontakt@bassmap.pl**

5. **Stopka prawna (mniej widoczna)**
   - Linki: Polityka prywatności, Regulamin (mały tekst, np. `text-white/40`)

6. **Menu (kafelek) – widoczne od początku na `/`, potem globalnie w app shell**
   - Ikona/kafelek rozwijający panel (Sheet / drawer)
   - Pozycje menu gościa:
     - **Lista eventów** → `/events`
     - **Zaloguj się** → `/auth/signin`
     - **Zarejestruj się** → `/auth/signup`
     - **Zgłoś problem** → `/report-issue`
     - **Archiwum wydarzeń** → `/archive`

## Zachowanie menu i auth

- **Lista eventów:** ten sam widok co dziś na `/` (DiscoveryShell, filtry, mapa).
- **Zaloguj się / Zarejestruj się:** istniejące strony auth (nie modal w MVP – chyba że plan uzasadni Sheet).
- Menu zależne od roli (fan/admin) – **poza zakresem tego frame** dla gościa; rozszerzenie w S-12.

## Kierunek wizualny (wymagania właścicielki)

| Aspekt | Wymaganie |
|--------|-----------|
| Nastrój | Impreza DnB, dynamiczny, nowoczesny – **nie** statyczny panel admina |
| Kolory | Ciemna baza; akcenty neon **stonowane**: biały, jasnoszary, jasnoniebieski, jasnozielony |
| Logo/grafiki | Brak assetów – **typografia jako logo** (display font + slogan) |
| Fonty | Lepsze niż domyślne systemowe – propozycja z research: **Space Grotesk** (nagłówki) + **Inter** (tekst), OFL |
| Ruch | Płynny scroll; lekkie wejścia sekcji; `prefers-reduced-motion` respektowane |
| Czego unikać | Kopiowanie cudzych stron; ciężkie WebGL na całej stronie; jaskrawe „raver” neony |

## Powiązanie z roadmapą

Ten frame łączy elementy trzech slice’ów – sensownie **jeden plan implementacji**, potem ewentualny podział PR:

| Roadmap | Element w tym frame |
|---------|---------------------|
| **F-04** | App shell, globalny kafelek menu, Layout, tokeny designu, `/events` |
| **S-09** | Sekcje `/`, fluid scroll, CTA, o nas, kontakt |
| **S-10** | Pozycje menu, archiwum, zgłoś problem |

## Archiwum – reguła biznesowa (resolved 2026-06-14)

- **Definicja:** opublikowane eventy, których **data rozpoczęcia jest wcześniejsza niż dzisiejszy dzień kalendarzowy** (strefa **Europe/Warsaw** – ta sama co `is_upcoming()` w migracji `20260610100000_create_events.sql`).
- **W kodzie:** `status = 'published' AND NOT public.is_upcoming(starts_at)` (nie osobna logika daty – spójność z resztą app).
- **RLS:** nowa polityka `SELECT` dla `anon`/`authenticated` na przeszłe + published (obecna `events_select_public` zostaje tylko dla nadchodzących).
- **UI:** `/archive` – sama lista (bez mapy), sort np. malejąco po dacie.

## Redirect (resolved 2026-06-14)

- **`/` z query string** (np. `/?city=Warszawa&subgenre=…`) → **302** na **`/events?`** z tym samym query – żeby stare zakładki z filtrami dalej działały po przeniesieniu discovery.

## Rozstrzygnięte (2026-06-14)

| Pytanie | Decyzja |
|---------|---------|
| Copy „Kim jesteśmy” | Tekst od właścicielki – patrz sekcja 3 powyżej |
| Slogan | **Find the place, drop the bass!** (bez zmian) |
| Formularz „Zgłoś problem” | **Wysyłka mailem** na **kontakt@bassmap.pl** (nie ticket w bazie); URL **`/report-issue`** |
| Archiwum | **Data &lt; dziś** (Warsaw) + `published`; RLS: `NOT is_upcoming(starts_at)`; URL **`/archive`** |
| Adresy URL | **Po angielsku** dla nowych tras (`/events`, `/archive`, `/report-issue`); legal bez zmian |
| Redirect `/` + query | **Tak** → `/events?…` (302) |

## Rekomendacja zakresu planu

**Jeden vertical slice:** F-04 + minimalna S-09 + minimalna S-10 w jednym `/10x-plan`, fazy:

1. Design tokens + fonty + AppShell
2. `/events` (przeniesienie discovery) + redirecty
3. Nowa `/` (scroll sections)
4. Menu pozycje + archiwum + formularz kontaktowy
5. Testy + aktualizacja linków wewnętrznych

## Następny krok

`/10x-plan` – plan implementacji na podstawie tego frame + `research.md`.

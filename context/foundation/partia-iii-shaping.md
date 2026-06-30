---
project: BassMap PL
status: active
created: 2026-06-22
source: user notes + shaping session z agentem (2026-06-22)
prd_version: 2
roadmap_version: 3
---

# Partia III – notatki shaping (2026-06-22)

> Kanoniczna kolejność slice'ów i statusy: @context/foundation/roadmap.md (Partia III).
> Ten plik zachowuje **oryginalne pomysły właścicielki** oraz **ustalone decyzje** z sesji planowania – żeby nic nie zginęło między rozmowami.

## Kontekst

- **Partia I** (odkrywanie, filtry, cena) – **done**
- **Partia II** (layout, konta fanów, UGC, komentarze, usuwanie konta) – **done** (2026-06-19)
- W kodzie są **placeholdery** gotowe na Partię III: sekcje «Idę» / «Obserwuję» w `MyEventsPage`, wyłączony «Edytuj profil», puste `/team` i `/forum`
- **North star Partii III:** **S-18** (kafelki UI) → **S-19** (Idę / Interesuję się)

## Oryginalna lista pomysłów (właścicielka, 2026-06-22)

1. Opcja «Idę» oraz «Interesuję się» przy evencie + licznik ile osób kliknęło + dodanie konkretnych eventów do sekcji «Moje eventy» (idę / interesuję się)
2. Mój profil: login, linki do Instagrama, SoundClouda, Facebooka, Spotify
3. Mój profil: sekcja «Moja muzyka» – link do playlisty Spotify lub piosenki (pytanie o integrację API)
4. Mój profil: ulubione gatunki, miasto, opis – wszystko w «Edytuj profil»
5. Zmiana kafelków eventów na zgodne z bassmap-pl-ui (kwadratowe; na kafelku: nazwa, subgenres, miejsce, czas, cena; na karcie wydarzenia pełne info o lineupie, opis itp.)
6. Forum: wątki «Szukam ekipy», «Mamy ekipę – szukamy ludzi» i inne + komentowanie
7. Znajomi; polecanie eventów; panel powiadomień (np. „anna.nowak poleciła Ci wydarzenie” + opcjonalny e-mail); łączenie się w ekipy
8. Moja ekipa: znajomi; «Dodaj ekipę» (nazwa, opcjonalnie miasto, subgenres, opis); publikacja ekipy na forum; szablon wątku «Szukam ludzi do ekipy» (wybór ekipy) → prośba o przyjęcie → zatwierdzenie/odrzucenie + dane kontaktowe
9. Panel organizatora: nowy typ konta Organizator; weryfikacja (brak pomysłu jak chronić); organizator dodaje eventy bez zatwierdzania; wątki «Ogłoszenie wydarzenia»; promowanie eventów w przyszłości (na razie bez monetyzacji)
10. Google Analytics – śledzenie ruchu
11. Aplikacja mobilna Android i iOS

## Ustalone decyzje (sesja 2026-06-22)

### Nazewnictwo UI

- W kodzie jest **«Obserwuję»** – w produkcie ujednolicić na **«Interesuję się»** (zgodnie z językiem właścicielki).
- «Idę» zostaje bez zmian.

### Podział na slice'y (nie jeden wielki release)

| Temat | Decyzja |
| ----- | ------- |
| Profil (login, social, gatunki, miasto, opis) | **S-20** – jeden slice |
| Moja muzyka Spotify | **S-21** – osobny slice po S-20 |
| Kafelki UI | **S-18** – **przed** RSVP (S-19) |
| RSVP Idę / Interesuję się | **S-19** |
| Forum | **S-22** MVP (wątki + komentarze) – **bez** ekip i szablonów |
| Znajomi + polecenia + powiadomienia | **S-23** |
| Moja ekipa (pełna) | **S-24** – po forum i znajomych |
| Organizator | **F-05** (rola + weryfikacja) → **S-25** (funkcje) |
| GA | **S-26** – wymaga aktualizacji prawnej (cookies) |
| Mobile | **S-27** – PWA instalowalna v1 (bez sklepów); research 2026-06-30 |

### Spotify – bez pełnego API na start

- **Nie** integrujemy Spotify API (OAuth, wyszukiwanie, Client ID) w pierwszej wersji «Moja muzyka».
- Użytkownik **wkleja link** `open.spotify.com/...` (utwór lub playlista).
- Strona pokazuje **oficjalny embed Spotify** (iframe) – zero kosztów, działa od razu.
- Pełne API Spotify – dopiero jeśli embed okaże się niewystarczający (v2+).

### Weryfikacja organizatora – MVP

- Wzorzec jak moderacja zgłoszeń fanów (S-12):
  1. Użytkownik składa **wniosek** (nazwa działalności, linki FB/IG, krótki opis).
  2. **Admin ręcznie zatwierdza lub odrzuca** w panelu.
  3. Po akceptacji konto dostaje rolę `organizer`.
- Organizator publikuje eventy **od razu** (`published`), bez kolejki `pending`.
- **Promowanie płatne** – parked (bez monetyzacji na razie).
- Automatyczna weryfikacja (KRS, NIP, scraping) – **nie** w MVP; do rozważenia później.

### Google Analytics a RODO

- PRD v2: brak ciasteczek marketingowych / śledzących przy anonimowym przeglądaniu.
- GA4 wymaga: **baner zgody na cookies**, aktualizacja **Polityki prywatności** i ewentualnie Regulaminu.
- S-26 to nie „wklejenie skryptu” – to slice z warstwą prawną.

### Aplikacja mobilna – ścieżka (zaktualizowano 2026-06-30)

**Decyzja v1:** PWA instalowalna – bez App Store / Google Play. Pełny research: `context/foundation/pwa-research.md`.

1. **PWA** (Dodaj do ekranu głównego) – **S-27 v1**, integracja `@vite-pwa/astro`
2. **Capacitor** (owijka wokół istniejącej strony → sklepy) – tylko jeśli PWA + dane GA nie wystarczą
3. **React Native od zera** – tylko przy silnej potrzebie funkcji natywnych

Mierzyć ruch na web (**S-26**) zanim inwestować w Capacitor / sklepy.

### Kafelki bassmap-pl-ui

- Design reference: **bassmap-pl-ui** (osobny projekt / design system – nie w tym repo).
- Na kafelku listy: **nazwa, podgatunki, miejsce, czas, cena**.
- Szczegóły wydarzenia (lineup, opis, komentarze) – strona `/events/[id]` (większość pól już istnieje).

## Kolejność slice'ów (skrót)

```
S-18 → S-19 → S-20 → S-21
              ↘
               S-22 → S-23 → S-24
                              ↓
                    F-05 → S-25 → S-26 → S-27
```

## Mapowanie pomysłów → slice ID

| # | Pomysł właścicielki | Slice |
| - | ------------------- | ----- |
| 5 | Kafelki UI | S-18 |
| 1 | Idę + Interesuję się + liczniki + Moje eventy | S-19 |
| 2, 4 | Profil: login, social, gatunki, miasto, opis | S-20 |
| 3 | Moja muzyka Spotify | S-21 |
| 6 | Forum wątki + komentarze | S-22 |
| 7 | Znajomi, polecenia, powiadomienia | S-23 |
| 8 | Moja ekipa (pełna) | S-24 |
| 9 | Organizator + weryfikacja + eventy + ogłoszenia | F-05 + S-25 |
| 10 | Google Analytics | S-26 |
| 11 | Aplikacja mobilna | S-27 |

## Otwarte pytania (do rozstrzygnięcia przy /10x-plan)

1. **Login publiczny** – unikalność, dozwolone znaki, zmiana loginu, widoczność profilu dla gości?
2. **Liczniki RSVP** – czy pokazywać dokładną liczbę, czy zaokrąglenie („10+”) przy małej skali?
3. **Powiadomienia e-mail** – które zdarzenia wymagają maila (polecenie eventu, prośba o znajomość, akceptacja do ekipy)?
4. **Dane kontaktowe po akceptacji do ekipy** – e-mail z konta, wybrane social z profilu, oba?
5. **Organizator** – czy jeden użytkownik może być fanem i organizatorem jednocześnie?
6. **bassmap-pl-ui** – gdzie leży repo / Figma i kto jest źródłem prawdy dla komponentów kafelków?

## Research PWA (2026-06-30)

- Slice **S-27** (`mobile-app`): v1 = PWA z `@vite-pwa/astro`, manifest, service worker, ikony, `/offline`.
- Bez App Store / Google Play w pierwszej wersji.
- Szczegóły: `context/foundation/pwa-research.md`
- Następny krok: `/10x-plan mobile-app`

## Następny krok implementacyjny

Pierwszy slice do `/10x-plan`: **S-18** (`event-card-redesign`) lub **S-19** (`event-attendance`) – rekomendacja: **S-18**, potem **S-19**.

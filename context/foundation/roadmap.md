---
project: BassMap PL
version: 3
status: active
created: 2026-06-10
updated: 2026-06-25
subgenre_catalog_version: 1
prd_version: 2
main_goal: market-feedback
top_blocker: decisions
---

# Roadmap: BassMap PL

> Derived from `context/foundation/prd.md` (v2) + auto-researched codebase baseline + user notes 2026-06-13 (Partia I / Partia II) + shaping Partia III 2026-06-22 (`partia-iii-shaping.md`).
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

BassMap PL to pierwsza scentralizowana wyszukiwarka wydarzeń drum'n'bass w Polsce. Fani DnB nie mają jednego źródła prawdy o nadchodzących eventach \u2013 muszą ręcznie sprawdzać Facebooka, Instagram, znajomych i fragmentaryczne portale biletowe. Produkt wypełnia tę lukę: jedno miejsce, po polsku, z filtrowaniem po mieście i podgatunku oraz pełnymi szczegółami wydarzenia.

MVP (F-01…F-03, S-01…S-03) jest **done** i działa na https://bassmap.pl. **Partia I** (odkrywanie) i **Partia II** (layout, konta, UGC) są **done**. Kolejne prace to **Partia III** (zaangażowanie fanów, profil, społeczność, organizatorzy, analityka, mobile) – szczegóły w `partia-iii-shaping.md`.

## North star

**S-22** (Forum MVP) – north star Partii III po zamknięciu S-21.

> Poprzednia north star: **S-21** (My vibes – Spotify + SoundCloud embed) – **done** 2026-06-24. Wcześniej: **S-28** (udostępnianie profilu) – **done** 2026-06-24.

## At a glance

| ID   | Change ID                 | Outcome (user can …)                                                                        | Prerequisites | PRD refs                         | Status      |
| ---- | ------------------------- | ------------------------------------------------------------------------------------------- | ------------- | -------------------------------- | ----------- |
| F-01 | event-data-foundation     | (foundation) schemat wydarzeń w bazie z migracjami i politykami RLS                         | \u2013             | Business Logic, NFR              | done        |
| F-02 | admin-role-guard          | (foundation) ścieżki zapisu chronione rolą admina                                           | \u2013             | Access Control                   | done        |
| S-01 | admin-event-management    | admin dodaje, edytuje i usuwa wydarzenia DnB                                                | F-01, F-02    | FR-006, FR-007                   | done        |
| S-02 | fan-event-discovery       | fan filtruje po mieście/podgatunku, widzi listę, mapę i szczegóły wydarzenia                | F-01, S-01    | US-01, FR-001–FR-005             | done        |
| F-03 | production-deploy         | (foundation) aplikacja działa pod publicznym adresem z poprawnymi sekretami                 | S-01          | NFR Operating cost               | done        |
| S-03 | event-cover-photos        | fan widzi zdjęcia okładek na kartach i stronie szczegółów wydarzenia                        | S-02          | post-MVP                         | done        |
| S-04 | event-description         | fan czyta opis wydarzenia; admin edytuje pole opis                                          | S-02          | FR-004, notes 2026-06-13         | done        |
| S-05 | date-range-filter         | fan filtruje po dacie (kalendarz + skróty dziś/tydzień/miesiąc)                             | S-02          | FR-008, notes 2026-06-13         | done        |
| S-06 | free-events-filter        | fan włącza „Pokaż tylko darmowe” i widzi tylko darmowe wydarzenia                           | S-02          | FR-004, Business Logic           | done        |
| S-11 | legal-pages               | fan otwiera Politykę prywatności i Regulamin; rejestrujący widzi tekst akceptacji z linkami | S-02          | NFR Privacy, notes 2026-06-13    | done        |
| S-07 | mobile-subgenre-dropdown  | fan na telefonie wybiera podgatunki z rozwijanej listy wielokrotnego wyboru                 | S-02          | FR-003, NFR Device               | done        |
| S-08 | structured-price-currency | admin wpisuje cenę jako liczbę (od X / X–Y) z walutą PLN/EUR/CZK; fan widzi poprawnie       | S-01          | FR-004, FR-006, notes 2026-06-13 | done        |
| F-04 | app-shell-navigation      | (foundation) własny layout z nawigacją zakładkową zamiast domyślnego Astro                  | S-04–S-08     | Access Control, notes 2026-06-13 | done        |
| S-09 | marketing-homepage        | fan widzi płynnie przewijaną stronę główną z logo, sloganem, sekcjami i CTA                 | F-04          | notes 2026-06-13                 | done        |
| S-10 | guest-nav-and-archive     | gość korzysta z menu (lista, logowanie, rejestracja, zgłoszenie problemu, archiwum)         | F-04, S-09    | notes 2026-06-13                 | done        |
| S-12 | fan-account-zone          | zalogowany fan ma zakładki profil, moje eventy, dodaj event, placeholdery, wyloguj          | F-04, S-10    | Access Control, notes 2026-06-13 | done        |
| S-17 | event-content-copyright   | zgłaszający wybiera źródło okładki i składa wymagane oświadczenie praw autorskich           | S-12          | FR-025, notes 2026-06-15         | done        |
| S-13 | duplicate-event-detection | system wykrywa podobne wydarzenie (nazwa/adres/data) i pokazuje właściwy komunikat          | S-12, S-17    | notes 2026-06-13                 | done        |
| S-14 | change-suggestions        | fan/admin zgłasza sugestię zmian; admin ocenia w panelu „Sugestie zmian”                    | S-12, S-13    | notes 2026-06-13                 | done        |
| S-15 | event-comments            | zalogowany fan komentuje wydarzenie; wszyscy czytają; autor usuwa własny komentarz; admin usuwa dowolny | S-12          | notes 2026-06-13                 | done        |
| S-16 | account-deletion          | zalogowany użytkownik usuwa swoje konto; komentarze zostają jako „Usunięty użytkownik”      | S-12, S-15    | FR-022, NFR Privacy              | done        |
| S-18 | event-card-redesign       | fan widzi kwadratowe kafelki eventów (nazwa, podgatunki, miejsce, czas, cena) na liście     | S-16          | notes 2026-06-22                 | done        |
| S-19 | event-attendance          | fan klika «Idę» lub «Interesuję się»; liczniki; sekcje w Moje eventy i profilu              | S-18          | notes 2026-06-22                 | done        |
| S-20 | fan-profile-edit          | fan edytuje login, bio, miasto, ulubione podgatunki, linki social; publiczny profil `/u/login` | S-19          | notes 2026-06-22                 | done        |
| S-28 | profile-share             | fan udostępnia profil: przycisk «Udostępnij», kopiowanie linku (później FB/IG)              | S-20          | notes 2026-06-24                 | done        |
| S-21 | profile-spotify-embed     | fan dodaje link do utworu (Spotify/SoundCloud); sekcja My vibes z embedem i tytułem z oEmbed | S-20          | notes 2026-06-22                 | done        |
| S-22 | forum-threads             | fan tworzy wątki (Szukam ekipy / Mamy ekipę / Ogólne) i komentuje; admin moderuje           | S-20          | notes 2026-06-22                 | done        |
| S-23 | friends-and-recommendations | znajomi, polecenia eventów, panel powiadomień in-app (+ opcjonalny e-mail)                | S-20, S-19    | notes 2026-06-22                 | done        |
| S-24 | crew-teams                | ekipa (nazwa, miasto, podgatunki, opis), rekrutacja przez forum, akceptacja + kontakt        | S-22, S-23    | notes 2026-06-22                 | in_progress |
| F-05 | organizer-role-foundation | (foundation) rola organizatora + wniosek i ręczna weryfikacja admina                        | S-16          | notes 2026-06-22                 | proposed    |
| S-25 | organizer-self-service    | zweryfikowany organizator publikuje eventy bez moderacji; ogłoszenia na forum                 | F-05, S-22    | notes 2026-06-22                 | proposed    |
| S-26 | analytics-consent         | GA4 + baner zgody cookies + aktualizacja dokumentów prawnych                                | S-19          | NFR Privacy, notes 2026-06-22    | proposed    |
| S-27 | mobile-app                | PWA lub aplikacja mobilna (Android/iOS) – po stabilnym web i pomiarze ruchu                 | S-26          | notes 2026-06-22                 | proposed    |

## Streams

Nawigacja \u2013 grupy elementów współdzielących łańcuch zależności. Kanoniczna kolejność jest w grafie poniżej.

| Stream | Theme                   | Chain                                                                      | Note                                                                                                                                             |
| ------ | ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A      | MVP (zamknięte)         | `F-01` → `S-01` → `S-02` → `S-03`                                          | Done \u2013 odkrywanie i okładki na produkcji.                                                                                                        |
| B      | Partia I \u2013 odkrywanie   | `S-04` / `S-05` / `S-06` / `S-11` / `S-07` / `S-08` (równolegle po `S-02`) | Must-have przed Partią II; `S-11` podniesione z Partii II (RODO + gotowe dokumenty).                                                             |
| C      | Partia II \u2013 layout      | `F-04` → `S-09` → `S-10`                                                   | **Done** (2026-06-14) \u2013 jeden slice `app-shell-navigation`.                                                                                      |
| D      | Partia II \u2013 konta i UGC | `S-12` → `S-17` → `S-13` → `S-14` → `S-15` → `S-16`                         | **Done** (2026-06-19) \u2013 pełny łańcuch konta fana + UGC + usuwanie konta. |
| E      | Partia III \u2013 odkrywanie UI + RSVP | `S-18` → `S-19`                                                    | Kafelki bassmap-pl-ui, potem «Idę» / «Interesuję się». |
| F      | Partia III \u2013 profil   | `S-20` → `S-28` / `S-21` (równolegle po S-20)                               | Edycja + profil publiczny; udostępnianie linku; My vibes (Spotify + SoundCloud embed, bez API). |
| G      | Partia III \u2013 społeczność | `S-22` → `S-23` → `S-24`                                                 | Forum MVP → znajomi i polecenia → pełna Moja ekipa. |
| H      | Partia III \u2013 organizator | `F-05` → `S-25`                                                           | Rola + ręczna weryfikacja → self-service eventów i ogłoszeń. |
| I      | Partia III \u2013 pomiar i mobile | `S-26` → `S-27`                                                       | GA4 + RODO, potem PWA / native. |

## Baseline

What's already in place in the codebase as of `2026-06-15` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present \u2013 Astro 6 SSR + React 19 + Tailwind 4; AppShell + Sheet menu; `/` marketing homepage; `/events` discovery; `/archive`, `/report-issue`; strefa fana: `/profile`, `/my-events`, `/my-events/new`, `/team`, `/forum`
- **Backend / API:** present \u2013 Astro SSR na Cloudflare; trasy auth + admin events + fan event submit/moderation + contact report-issue + change suggestions + duplicate check + event comments + account deletion
- **Data:** present \u2013 tabela `events` z opisem, ustrukturyzowaną ceną, `created_by` (fan submit), audytem okładki S-17; tabele `change_suggestions`, `event_comments` (S-15); RLS archiwum
- **Auth:** present \u2013 Supabase Auth, sesje cookie SSR, middleware, rola admin; strefa fana (profil, zgłoszenia, moderacja, usuwanie konta z anonimizacją komentarzy)
- **Deploy / infra:** present \u2013 https://bassmap.pl na Cloudflare Workers; CI lint/build/deploy
- **Observability:** partial \u2013 `observability.enabled` w Wrangler; brak logowania i error trackingu w aplikacji

## Foundations

### F-01: Schemat danych wydarzeń

- **Outcome:** (foundation) tabela wydarzeń z migracjami, politykami RLS i regułami biznesowymi (nadchodzące vs przeszłe, wymagane pola, tagi podgatunków ze stałej listy 25 wartości \u2013 PRD §Business Logic).
- **Change ID:** event-data-foundation
- **PRD refs:** Business Logic, NFR Scale path, Access Control
- **Unlocks:** S-01, S-02; reguła ukrywania przeszłych eventów; wielokrotne tagi podgatunków
- **Prerequisites:** \u2013
- **Parallel with:** F-02
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Bez schematu żaden pionowy slice nie ma danych \u2013 fundament musi być pierwszy mimo że nie jest widoczny dla fana.
- **Status:** done

### F-02: Ochrona roli admina

- **Outcome:** (foundation) tylko użytkownicy z rolą admina mogą dodawać, edytować i usuwać wydarzenia; publiczny odczyt bez logowania.
- **Change ID:** admin-role-guard
- **PRD refs:** Access Control, FR-006, FR-007
- **Unlocks:** S-01; bramka weryfikacji admina z guardrails PRD
- **Prerequisites:** \u2013
- **Parallel with:** F-01
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Istniejący scaffold auth obsługuje logowanie, ale nie rozróżnia admina od zwykłego użytkownika \u2013 bez tego S-01 nie spełnia guardrails.
- **Status:** done

### F-03: Wdrożenie produkcyjne

- **Outcome:** (foundation) aplikacja dostępna pod publicznym adresem Cloudflare z poprawnie ustawionymi sekretami Supabase.
- **Change ID:** production-deploy
- **PRD refs:** NFR Operating cost
- **Unlocks:** walidacja sygnału od rynku z prawdziwym URL; ścieżka weryfikacji dla S-02
- **Prerequisites:** S-01
- **Parallel with:** S-02
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Przy blokerze umiejętności pierwszy deploy bywa zaskoczeniem \u2013 lepiej po zasileniu bazy pierwszymi eventami niż na pustej aplikacji.
- **Status:** done

### F-04: App shell i nawigacja zakładkowa

- **Outcome:** (foundation) wspólny layout aplikacji z rozwijanym menu (kafelek) i zakładkami zależnymi od roli (gość / fan / admin); odejście od domyślnego layoutu Astro na rzecz dedykowanego szkieletu nawigacji.
- **Change ID:** app-shell-navigation
- **PRD refs:** Access Control, NFR Device, notes 2026-06-13
- **Unlocks:** S-09, S-10, S-12; spójna nawigacja Partii II
- **Prerequisites:** S-04, S-05, S-06, S-07, S-08
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Duży refactor layoutu \u2013 zrealizowany w jednym slice po Partii I.
- **Status:** done \u2013 archived 2026-06-14 → `context/archive/2026-06-14-app-shell-navigation/` (issues #21, #22, #23)

## Slices

### S-01: Zarządzanie wydarzeniami przez admina

- **Outcome:** admin dodaje, edytuje i usuwa wydarzenia DnB z wymaganymi polami (nazwa, data, miasto, venue) i opcjonalnymi (lineup, link biletowy, cena, tagi podgatunków); adres geokodowany automatycznie (Nominatim) lub ręczne współrzędne w trybie „lokalizacja tajna”.
- **Change ID:** admin-event-management
- **PRD refs:** FR-006, FR-007
- **Prerequisites:** F-01, F-02
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Admin jest jedynym źródłem danych w MVP \u2013 bez tego slice'a S-02 nie ma czego pokazać fanowi.
- **Status:** done

### S-02: Odkrywanie wydarzeń przez fana

- **Outcome:** fan filtruje nadchodzące wydarzenia po mieście i podgatunku, widzi listę posortowaną po dacie, pinezki na interaktywnej mapie Polski i pełne szczegóły po kliknięciu.
- **Change ID:** fan-event-discovery
- **PRD refs:** US-01, FR-001, FR-002, FR-003, FR-004, FR-005
- **Prerequisites:** F-01, S-01
- **Parallel with:** F-03
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Mapa Leaflet + hydratacja w Astro/Cloudflare to największa luka umiejętnościowa \u2013 plan: `context/changes/fan-event-discovery/plan.md`. Eventy bez współrzędnych: fallback centrum miasta na mapie (rzadkie po S-01).
- **Status:** done

### S-03: Okładki wydarzeń

- **Outcome:** fan widzi zdjęcia okładek na kartach listy, w podglądzie i na stronie szczegółów; admin opcjonalnie wgrywa plakat (pion/poziom).
- **Change ID:** event-cover-photos
- **PRD refs:** post-MVP
- **Prerequisites:** S-02
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Upload przez Worker API \u2013 lesson w `context/archive/2026-06-12-event-cover-photos/`.
- **Status:** done

---

## Partia I \u2013 must-have (po MVP)

> Ustalone 2026-06-13. **Partia I zamknięta** (2026-06-14). **F-04 + S-09 + S-10 done** (2026-06-14). **S-12 + S-17 done** (2026-06-15 / 2026-06-16). Następny krok Partii II: **S-13** (wykrywanie duplikatów).

### S-04: Pole opisu wydarzenia

- **Outcome:** fan czyta opis wydarzenia na stronie szczegółów; admin dodaje i edytuje opis w formularzu wydarzenia.
- **Change ID:** event-description
- **PRD refs:** FR-004, notes 2026-06-13
- **Prerequisites:** S-02
- **Parallel with:** S-05, S-06, S-07
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Wymaga migracji kolumny `description` + aktualizacji formularza admina i widoku szczegółów \u2013 niski zakres, dobry pierwszy krok Partii I.
- **Status:** done \u2013 archived 2026-06-13 → `context/archive/2026-06-13-event-description/`

**FR (propozycja do PRD):**

- **FR-009:** Wydarzenie ma opcjonalne pole opis (tekst); fan widzi je w szczegółach. Priority: must-have (Partia I).

### S-05: Filtrowanie po datach

- **Outcome:** fan filtruje wydarzenia wybierając dowolną datę lub zakres dat z kalendarza albo skrót „dziś”, „w tym tygodniu”, „w tym miesiącu”; lista i mapa respektują filtr; filtry w URL.
- **Change ID:** date-range-filter
- **PRD refs:** FR-008, notes 2026-06-13
- **Prerequisites:** S-02
- **Parallel with:** S-04, S-06, S-07, S-08
- **Blockers:** \u2013
- **Unknowns:**
  - Strefa czasu zakresu: Europe/Warsaw (jak RLS `is_upcoming`) \u2013 Owner: team. Block: no.
- **Risk:** FR-008 elevated to must-have (Partia I) \u2013 PRD updated 2026-06-13.
- **Status:** done \u2013 archived 2026-06-13 → `context/archive/2026-06-13-date-range-filter/`

**FR (elevacja PRD):**

- **FR-008** (elevated): Fan filtruje po dacie pojedynczej lub zakresie + presety dziś/tydzień/miesiąc. Priority: must-have (Partia I).

### S-06: Filtr „Pokaż tylko darmowe”

- **Outcome:** fan włącza przełącznik „Pokaż tylko darmowe” i widzi wyłącznie wydarzenia oznaczone jako darmowe (`is_free`); filtr łączy się z miastem, podgatunkiem i datą.
- **Change ID:** free-events-filter
- **PRD refs:** FR-004, Business Logic
- **Prerequisites:** S-02
- **Parallel with:** S-04, S-05, S-07
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Działa na istniejącym polu `is_free` \u2013 nie wymaga S-08, ale spójność z nowym modelem ceny (S-08) poprawi jakość danych.
- **Status:** done \u2013 archived 2026-06-13 → `context/archive/2026-06-13-free-events-filter/`

**FR (propozycja do PRD):**

- **FR-010:** Fan filtruje listę do wyłącznie darmowych wydarzeń. Priority: must-have (Partia I).

### S-11: Polityka prywatności i regulamin

- **Outcome:** fan otwiera Politykę prywatności i Regulamin z linków w stopce (strona główna, szczegóły wydarzenia, logowanie/rejestracja); strony statyczne i czytelne; przy rejestracji tekst: „Rejestrując się, akceptujesz Politykę prywatności i Regulamin strony” z podlinkowanymi dokumentami.
- **Change ID:** legal-pages
- **PRD refs:** NFR Privacy, notes 2026-06-13
- **Prerequisites:** S-02
- **Parallel with:** S-07, S-08
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Rejestracja działa bez dokumentów prawnych \u2013 luka RODO; treść gotowa w `BassMap_PL_dokumenty_prawne.docx` (13.06.2026). Research: `context/archive/2026-06-13-legal-pages/research.md`. Podniesione z Partii II \u2013 nie wymaga F-04 ani marketing homepage.
- **Status:** done \u2013 archived 2026-06-13 → `context/archive/2026-06-13-legal-pages/`

**FR (propozycja do PRD):**

- **FR-016:** Strona udostępnia Politykę prywatności i Regulamin; przy rejestracji tekst akceptacji z linkami do obu dokumentów. Priority: must-have (Partia I \u2013 podniesione z Partii II).

### S-07: Subgatunki na mobile \u2013 dropdown wielokrotnego wyboru

- **Outcome:** na telefonie fan wybiera podgatunki z rozwijanej listy wielokrotnego wyboru zamiast długiego scrolla checkboxów; desktop może zostać bez zmian lub dostać ten sam wzorzec.
- **Change ID:** mobile-subgenre-dropdown
- **PRD refs:** FR-003, NFR Device
- **Prerequisites:** S-02
- **Parallel with:** S-04, S-05, S-06, S-08
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Czysto UI \u2013 niski koszt, duży zysk miejsca na ekranie telefonu.
- **Status:** done \u2013 archived 2026-06-13 → `context/archive/2026-06-13-mobile-subgenre-dropdown/`

**FR (propozycja do PRD):**

- **FR-011:** Filtr podgatunków na urządzeniach mobilnych nie zajmuje nadmiernie ekranu (dropdown multichoice). Priority: must-have (Partia I).

### S-08: Ustrukturyzowana cena i waluta

- **Outcome:** admin wpisuje cenę jako liczbę z trybem „od X” lub „X–Y” i wybiera walutę z listy PLN / EUR / CZK; system waliduje dane; fan widzi sformatowaną cenę w liście i szczegółach; migracja istniejących wartości tekstowych `price`.
- **Change ID:** structured-price-currency
- **PRD refs:** FR-004, FR-006, notes 2026-06-13
- **Prerequisites:** S-01
- **Parallel with:** S-04, S-05, S-06, S-07
- **Blockers:** \u2013
- **Unknowns:**
  - Strategia migracji starych wartości `price text` (ręczna vs heurystyka) \u2013 Owner: team. Block: no.
- **Risk:** Zmiana schematu bazy + formularz admina \u2013 warto zrobić przed masowym zasilaniem bazy przez admina.
- **Status:** done \u2013 archived 2026-06-14 → `context/archive/2026-06-14-structured-price-currency/`; PR #16

**FR (propozycja do PRD):**

- **FR-012:** Cena wydarzenia to liczba (lub przedział) z walutą PLN/EUR/CZK; nie dowolny string. Priority: must-have (Partia I).

---

## Partia II \u2013 idziemy w świat

> Ustalone 2026-06-13. **F-04, S-09, S-10, S-12 done** (2026-06-14–15). Rozszerza PRD poza pierwotne Non-Goals (konta fanów, UGC, komentarze).

### S-09: Strona główna marketingowa

- **Outcome:** fan widzi płynnie przewijaną stronę główną z dużym logo i sloganem; sekcje „Kim jesteśmy i co robimy?”, przycisk „Znajdź swój event!” (→ lista wydarzeń), stopka z kontaktem kontakt@bassmap.pl i zaproszeniem do współpracy.
- **Change ID:** marketing-homepage (dostarczone w `app-shell-navigation`)
- **PRD refs:** notes 2026-06-13
- **Prerequisites:** F-04
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** \u2013
- **Status:** done \u2013 archived 2026-06-14 w `context/archive/2026-06-14-app-shell-navigation/` (issue #22)

**FR (propozycja do PRD):**

- **FR-013:** Strona główna prezentuje produkt (logo, slogan, sekcje informacyjne, CTA do listy eventów). Priority: must-have (Partia II).

### S-10: Nawigacja gościa, zgłoszenie problemu i archiwum

- **Outcome:** gość rozwija menu z kafelka i przechodzi do: Lista eventów (obecny widok lista+mapa), Zaloguj się, Zarejestruj się, Zgłoś problem (formularz kontaktowy), Archiwum wydarzeń (przeszłe eventy \u2013 lista bez mapy).
- **Change ID:** guest-nav-and-archive (dostarczone w `app-shell-navigation`)
- **PRD refs:** notes 2026-06-13
- **Prerequisites:** F-04, S-09
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** \u2013
- **Status:** done \u2013 archived 2026-06-14 w `context/archive/2026-06-14-app-shell-navigation/` (issue #23)

**FR (propozycja do PRD):**

- **FR-014:** Gość korzysta z menu nawigacji (lista, auth, zgłoszenie problemu, archiwum). Priority: must-have (Partia II).
- **FR-015:** Fan przegląda archiwum minionych wydarzeń (lista, bez mapy). Priority: must-have (Partia II).

### S-12: Strefa zalogowanego użytkownika (nie-admin)

- **Outcome:** po zalogowaniu fan (nie admin) widzi zakładki: Lista wydarzeń, Mój profil, Moje eventy, Dodaj wydarzenie, Moja ekipa (placeholder), Forum (placeholder), Wyloguj się; admin widzi nav publiczne + Panel admina + Wyloguj (bez zakładek fana). **W tym slice:** fan wysyła nowe wydarzenie (`pending`), admin w panelu **publikuje lub odrzuca** zgłoszenie (FR-023) \u2013 to podstawowa moderacja UGC, nie mylić z kolejką sugestii zmian w S-14.
- **Change ID:** fan-account-zone
- **PRD refs:** FR-017, FR-018, FR-023, Access Control, notes 2026-06-13
- **Prerequisites:** F-04, S-10
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Duży skok zakresu (konta + submit + moderacja) \u2013 plan fazowy w `context/archive/2026-06-15-fan-account-zone/plan.md`. MVP rozszerzone o okładki fana (zaakceptowany drift).
- **Status:** done \u2013 archived 2026-06-15 → `context/archive/2026-06-15-fan-account-zone/` (PR #29, issue #24). Legal sync S-12: checkbox `acceptContentRights` + aktualizacja regulaminu/polityki (commity audytu 2026-06-15).

**FR (w PRD v2):**

- **FR-017:** Zalogowany fan ma dedykowaną nawigację i profil. Priority: must-have (Partia II).
- **FR-018:** Fan może dodać wydarzenie do moderacji (nie od razu publiczne). Priority: must-have (Partia II).
- **FR-023:** Admin publikuje lub odrzuca zgłoszenia fanów w statusie `pending`. Priority: must-have (Partia II).

### S-17: Prawa autorskie treści zgłoszenia (okładka + opis)

- **Outcome:** przy zgłoszeniu wydarzenia (formularz fana \u2013 także gdy jest okładka) użytkownik **nie może wysłać okładki bez oświadczenia**. Dropdown **Źródło grafiki:** Facebook, Instagram, Strona organizatora, Własna. Po wyborze Facebook / Instagram / Strona organizatora \u2013 obowiązkowy checkbox: _„Oświadczam, że posiadam zgodę twórcy na publikację grafiki”_. Po wyborze **Własna** \u2013 checkbox: _„Oświadczam, że posiadam prawa autorskie do grafiki”_. Bez zaznaczenia \u2013 submit zablokowany (frontend + walidacja API). Wybór źródła i timestamp oświadczenia zapisywane w bazie (audyt). Regulamin i polityka prywatności: zapis o odpowiedzialności zgłaszającego; dla **opisów** \u2013 informacja o dozwolonym cytowaniu fragmentów w zakresie art. 29 ustawy o prawie autorskim (nie jako blankiet na pełne kopiowanie). Ten sam wzorzec **nice-to-have** w formularzu admina \u2013 poza MVP slice, chyba że owner wskaże inaczej.
- **Change ID:** event-content-copyright
- **PRD refs:** FR-025, notes 2026-06-15
- **Prerequisites:** S-12 (formularz zgłoszenia + upload okładki fana)
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:**
  - Czy ten sam dropdown + checkbox w panelu admina od razu \u2013 Owner: user. Block: no (domyślnie fan-only w S-17).
  - Final legal copy art. 29 (zakres cytatu vs pełny opis) \u2013 Owner: user + weryfikacja prawna. Block: no (roadmap actionable; tekst regulaminu przed deployem).
- **Risk:** Ogólny checkbox w regulaminie (§5.6) **nie zastępuje** UI \u2013 bez S-17 brak dowodu źródła i rodzaju oświadczenia. **Prawo cytatu (art. 29) dotyczy opisów tekstowych, nie grafik** \u2013 cytat wymaga wskazania autora/źródła i uzasadnionego zakresu; pełne wklejenie cudzego opisu może wykraczać poza cytat.
- **Status:** done \u2013 archived 2026-06-16 → `context/archive/2026-06-15-event-content-copyright/` (issue #30). Fan + admin: dropdown źródła okładki, warunkowe oświadczenia, audyt w DB; legal sync §5.6–5.9 + polityka.

**FR (propozycja do PRD):**

- **FR-025:** Przy zgłoszeniu wydarzenia z okładką fan wybiera źródło grafiki (Facebook / Instagram / Strona organizatora / Własna) i akceptuje wymagane oświadczenie praw autorskich; system odrzuca submit bez oświadczenia. Priority: must-have (Partia II \u2013 compliance, zaraz po S-12).

### S-13: Wykrywanie duplikatów wydarzeń

- **Outcome:** przy dodawaniu wydarzenia system sprawdza podobieństwo po nazwie (fuzzy match), adresie i dacie; admin widzi komunikat „Podobne wydarzenie już istnieje: [nazwa], kliknij aby wprowadzić zmiany”; użytkownik widzy „Podobne wydarzenie już istnieje: [nazwa], czy chcesz zasugerować zmiany?” i może wysłać sugestię do admina zamiast duplikować.
- **Change ID:** duplicate-event-detection
- **PRD refs:** notes 2026-06-13
- **Prerequisites:** S-12, S-17
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:**
  - Próg fuzzy match (np. Levenshtein / pg_trgm) \u2013 Owner: team. Block: no.
- **Risk:** Fałszywe pozytywy irytują; fałszywe negatywy = duplikaty w bazie \u2013 warto zacząć konserwatywnie.
- **Status:** done

**FR (propozycja do PRD):**

- **FR-019:** System ostrzega przed duplikatem wydarzenia (nazwa/adres/data). Priority: must-have (Partia II).

### S-14: Sugestie zmian wydarzeń

- **Outcome:** na stronie szczegółów **już opublikowanego** wydarzenia fan klika „Zasugeruj zmiany”, wypełnia formularz ze szczegółami; admin w panelu ma **osobną** sekcję „Sugestie zmian” (nie ta sama kolejka co Opublikuj/Odrzuć dla nowych zgłoszeń w S-12) do oceny i wdrożenia lub odrzucenia.
- **Change ID:** change-suggestions
- **PRD refs:** FR-020, notes 2026-06-13
- **Prerequisites:** S-12, S-13
- **Parallel with:** S-15
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Nakłada się z flow duplikatów (S-13) \u2013 jeden model danych „zgłoszenie użytkownika” może obsłużyć oba przypadki; **nie** nakłada się z moderacją nowych eventów (S-12).
- **Status:** done

**FR (w PRD v2):**

- **FR-020:** Fan zgłasza sugestię zmian wydarzenia; admin ją przegląda w panelu. Priority: must-have (Partia II).

### S-15: Komentarze pod wydarzeniami

- **Outcome:** pod szczegółami wydarzenia fan czyta komentarze (publicznie); tylko zalogowany użytkownik może dodać komentarz; autor usuwa własny komentarz; administrator usuwa dowolny komentarz.
- **Change ID:** event-comments
- **PRD refs:** notes 2026-06-13
- **Prerequisites:** S-12
- **Parallel with:** S-14
- **Blockers:** \u2013
- **Unknowns:**
  - Moderacja treści (słowa wulgarne, spam) \u2013 Owner: user. Block: no (MVP: author delete + admin delete).
- **Risk:** UGC wymaga RLS, rate limitu i polityki prywatności (S-11).
- **Status:** done – archived `context/archive/2026-06-19-event-comments/`; issue [#27](https://github.com/ematrejek/bassmap-pl/issues/27) zamknięte 2026-06-19

**FR (propozycja do PRD):**

- **FR-021:** Zalogowany fan komentuje wydarzenie; komentarze widoczne publicznie; admin moderuje. Priority: must-have (Partia II).

### S-16: Usuwanie konta

- **Outcome:** zalogowany użytkownik usuwa swoje konto (z potwierdzeniem); dane osobowe konta są usuwane; **komentarze pozostają**, autor wyświetlany jako „Usunięty użytkownik” (anonimizacja \u2013 treść zostaje, powiązanie z tożsamością znika). Zgłoszenia wydarzeń i sugestie \u2013 zgodnie z polityką prywatności (S-16 plan).
- **Change ID:** account-deletion
- **PRD refs:** FR-022, NFR Privacy, notes 2026-06-13
- **Prerequisites:** S-12, S-15
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Wymaga integracji z Supabase Auth (delete user) i kaskady w bazie (anonimizacja autora na komentarzach).
- **Status:** done – archived `context/archive/2026-06-19-account-deletion/`; issue [#28](https://github.com/ematrejek/bassmap-pl/issues/28) zamknięte 2026-06-19

**FR (w PRD v2):**

- **FR-022:** Użytkownik może trwale usunąć konto; komentarze zostają z etykietą „Usunięty użytkownik”. Priority: must-have (Partia II).

---

## Partia III \u2013 zaangażowanie, społeczność, organizatorzy

> Ustalone 2026-06-22 z notatek właścicielki + sesja shaping. Pełny zapis decyzji: `context/foundation/partia-iii-shaping.md`.

**Ustalenia cross-cutting (Partia III):**

- Copy RSVP: **«Interesuję się»** (nie «Obserwuję») – wdrożone w S-19 (2026-06-23).
- My vibes (S-21): **embed z URL** Spotify lub SoundCloud (tylko utwór), tytuł przez oEmbed, bez logowania do platform i bez pełnego API.
- Weryfikacja organizatora MVP: **wniosek + ręczna akceptacja admina** (F-05).
- GA4 (S-26): wymaga **baneru cookies** i aktualizacji polityki prywatności (konflikt z PRD „brak tracking cookies” – rozwiązać przy implementacji).
- Mobile (S-27): preferować **PWA → Capacitor → native** w tej kolejności kosztowej.

### S-18: Kafelki wydarzeń (bassmap-pl-ui)

- **Outcome:** fan na liście `/events` widzi kwadratowe kafelki zgodne z designem bassmap-pl-ui: nazwa, podgatunki, miejsce (miasto/venue), czas, cena. Strona szczegółów `/events/[id]` pokazuje pełne informacje (lineup, opis, komentarze – pola już istnieją).
- **Change ID:** event-card-redesign
- **PRD refs:** FR-001, FR-004, notes 2026-06-22
- **Prerequisites:** S-16
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:**
  - Lokalizacja design systemu bassmap-pl-ui (repo / Figma) \u2013 Owner: user. Block: planowanie S-18.
- **Risk:** Refactor UI listy – nie dotyka schematu bazy; warto przed S-19 żeby przyciski RSVP weszły w gotowy layout.
- **Status:** done

### S-19: «Idę» i «Interesuję się» (RSVP)

- **Outcome:** zalogowany fan na stronie wydarzenia klika **«Idę»** lub **«Interesuję się»**; wszyscy widzą **liczniki**; wydarzenia trafiają do sekcji **Moje eventy** (`#ide`, `#interesuje-sie`) i skrótu na **profilu** (UI-placeholder już w kodzie).
- **Change ID:** event-attendance
- **PRD refs:** notes 2026-06-22
- **Prerequisites:** S-18 (zalecane)
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:**
  - Dokładna liczba vs zaokrąglenie liczników przy małej skali \u2013 Owner: user. Block: no.
- **Risk:** Nowa tabela + RLS; rename «Obserwuję» → «Interesuję się» w całym UI.
- **Status:** done

**FR (propozycja do PRD v3):**

- **FR-026:** Zalogowany fan oznacza udział w wydarzeniu («Idę» / «Interesuję się»); liczniki publiczne; lista w Moje eventy. Priority: must-have (Partia III).

### S-20: Edycja profilu fana

- **Outcome:** fan w «Edytuj profil» ustawia **login** (publiczny), **opis**, **miasto**, **ulubione podgatunki** (katalog 25 wartości), **linki**: Instagram, SoundCloud, Facebook, Spotify (profil). Placeholdery w `ProfileSection` zastąpione działającym formularzem. Gość widzi **publiczny profil** pod `/u/login` (bez e-maila). Udostępnianie linku – slice **S-28**.
- **Change ID:** fan-profile-edit
- **PRD refs:** FR-017, notes 2026-06-22
- **Prerequisites:** S-19 (zalecane; można równolegle)
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:**
  - Unikalność loginu, widoczność profilu dla gości, dozwolone znaki \u2013 Owner: user. Block: planowanie S-20.
- **Risk:** Dane profilu publiczne \u2013 legal sync polityki prywatności.
- **Status:** done

**FR (propozycja do PRD v3):**

- **FR-027:** Fan edytuje publiczny profil (login, bio, miasto, podgatunki, linki social). Priority: must-have (Partia III).

### S-28: Udostępnianie profilu

- **Outcome:** na własnym profilu (`/profile`) i publicznym (`/u/login`) fan widzi przycisk **«Udostępnij»**; po kliknięciu może **skopiować link** do publicznego profilu (schowek) z potwierdzeniem „Skopiowano”. Na urządzeniach z Web Share API – opcjonalnie natywny panel udostępniania systemu (zamiast samego kopiowania).
- **Change ID:** profile-share
- **PRD refs:** FR-027, notes 2026-06-24
- **Prerequisites:** S-20 (publiczny URL `fanPublicProfilePath(login)`)
- **Parallel with:** S-21
- **Blockers:** \u2013
- **Unknowns:**
  - Czy v1 wystarczy samo kopiowanie, czy od razu Web Share API na mobile \u2013 Owner: user. Block: no (domyślnie: copy + Web Share gdy dostępne).
- **Risk:** Niski \u2013 bez backendu; wymaga poprawnego `site` w URL (kanoniczny `https://bassmap.pl`).
- **Status:** done

**Iteracje późniejsze (poza MVP slice):**

- Przyciski **Facebook / Instagram** (share URL platformy lub deep link) \u2013 po meta **Open Graph** na stronie profilu (podgląd linku w social).
- Ewentualnie QR kod profilu \u2013 parked.

**FR (propozycja do PRD v3):**

- **FR-028:** Fan udostępnia publiczny profil kopiując link (i opcjonalnie przez Web Share API). Priority: nice-to-have (Partia III, zaraz po S-20).

### S-21: My vibes (Spotify + SoundCloud embed)

- **Outcome:** fan wybiera **Spotify** lub **SoundCloud**, wkleja link do **pojedynczego utworu**; na profilu w sekcji **My vibes** widać tytuł (pobrany automatycznie przez oEmbed) i osadzony odtwarzacz (iframe). Bez logowania do platform i bez pełnego Spotify API.
- **Change ID:** profile-spotify-embed
- **PRD refs:** notes 2026-06-22
- **Prerequisites:** S-20
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Niski – walidacja URL track + oEmbed + embed iframe.
- **Status:** done (2026-06-24)
- **Legal:** polityka prywatności §2.1 (My vibes, cookies embedów)

### S-22: Forum MVP

- **Outcome:** zalogowany fan tworzy **wątek** w kategorii: «Szukam ekipy», «Mamy ekipę – szukamy ludzi», «Ogólne»; czyta listę, wchodzi w wątek, **komentuje**; admin usuwa wątki/komentarze. Placeholder `/forum` zastąpiony działającym forum.
- **Change ID:** forum-threads
- **PRD refs:** notes 2026-06-22
- **Prerequisites:** S-20
- **Parallel with:** S-21
- **Blockers:** \u2013
- **Unknowns:**
  - Kategorie na start vs pełna taksonomia \u2013 Owner: user. Block: no (3 kategorie + Ogólne).
- **Risk:** UGC – legal sync regulamin + polityka; moderacja admin.
- **Status:** done (2026-06-25)

**Świadomie poza S-22:** szablony ekip, prośby o dołączenie (S-24); kategoria «Ogłoszenie wydarzenia» dla organizatorów (S-25).

### S-23: Znajomi, polecenia eventów, powiadomienia

- **Outcome:** fan wysyła/akceptuje **zaproszenie do znajomych**; **poleca wydarzenie** znajomemu; widzi **panel powiadomień** in-app (np. „anna.nowak poleciła Ci wydarzenie X»); opcjonalnie **e-mail** (Resend – wzorzec jak `/report-issue`).
- **Change ID:** friends-and-recommendations
- **PRD refs:** notes 2026-06-22
- **Prerequisites:** S-20, S-19
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:**
  - Które zdarzenia wysyłają e-mail \u2013 Owner: user. Block: no (MVP: in-app; e-mail jako faza 2 w slice).
- **Risk:** Średni zakres – rozważyć podział na PR: znajomi → polecenia → e-mail.
- **Status:** done

### S-24: Moja ekipa (pełna funkcja)

- **Outcome:** fan tworzy **ekipę** (nazwa, opcjonalnie miasto, podgatunki, opis); widzi członków; publikuje wątek forum z szablonem **«Szukam ludzi do ekipy»** (wybór ekipy); kandydat składa **prośbę** → właściciel **akceptuje/odrzuca** → udostępnienie **danych kontaktowych**. Placeholder `/team` zastąpiony.
- **Change ID:** crew-teams
- **PRD refs:** notes 2026-06-22
- **Prerequisites:** S-22, S-23
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Decisions:** Dane kontaktowe po akceptacji: login + linki social z profilu (bez e-maila) \u2013 resolved 2026-06-25.
- **Risk:** Największy slice społecznościowy Partii III – nie łączyć z S-22.
- **Status:** in_progress

### F-05: Rola organizatora i weryfikacja

- **Outcome:** (foundation) nowa rola `organizer`; formularz **wniosku** o status organizatora; kolejka **Zatwierdź / Odrzuć** w panelu admina; guardy API i middleware.
- **Change ID:** organizer-role-foundation
- **PRD refs:** Access Control, notes 2026-06-22
- **Unlocks:** S-25
- **Prerequisites:** S-16
- **Parallel with:** S-22 (po S-20)
- **Blockers:** \u2013
- **Unknowns:**
  - Czy fan i organizator na jednym koncie \u2013 Owner: user. Block: no (domyślnie: tak, rola dodatkowa).
- **Risk:** Zaufanie – MVP = ręczna weryfikacja; bez automatyzacji KRS/NIP.
- **Status:** proposed

### S-25: Panel organizatora (self-service)

- **Outcome:** zweryfikowany organizator **dodaje wydarzenia od razu opublikowane** (bez `pending`); tworzy wątek forum **«Ogłoszenie wydarzenia»** powiązany z eventem. **Promowanie płatne** – parked.
- **Change ID:** organizer-self-service
- **PRD refs:** notes 2026-06-22
- **Prerequisites:** F-05, S-22
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** Jakość danych bez moderacji – mitigacja: tylko zweryfikowani organizatorzy.
- **Status:** proposed

### S-26: Google Analytics i zgoda na cookies

- **Outcome:** integracja **GA4**; **baner RODO** na cookies śledzące; aktualizacja polityki prywatności (i ewentualnie regulaminu); `LEGAL_UPDATED_AT`.
- **Change ID:** analytics-consent
- **PRD refs:** NFR Privacy, notes 2026-06-22
- **Prerequisites:** stabilny feature set web (min. S-19)
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:** \u2013
- **Risk:** PRD v2 mówi o braku tracking cookies – wymaga świadomej zmiany NFR przy wdrożeniu.
- **Status:** proposed

### S-27: Aplikacja mobilna

- **Outcome:** użytkownik korzysta z BassMap na telefonie jako **PWA** (minimum) lub aplikacja w sklepach (**Capacitor** / native – decyzja przy planowaniu). Po S-26 (pomiar czy mobile jest potrzebne).
- **Change ID:** mobile-app
- **PRD refs:** NFR Device, notes 2026-06-22
- **Prerequisites:** S-26 (zalecane)
- **Parallel with:** \u2013
- **Blockers:** \u2013
- **Unknowns:**
  - PWA vs Capacitor vs React Native \u2013 Owner: user + dane z GA. Block: planowanie S-27.
- **Risk:** Native od zera = wielokrotność kosztu utrzymania vs SSR web.
- **Status:** proposed

## Backlog Handoff

**External backlog (public):** [GitHub Project \u2013 Bassmap PL Roadmap](https://github.com/users/ematrejek/projects/2) · [Issues `label:roadmap`](https://github.com/ematrejek/bassmap-pl/issues?q=label%3Aroadmap) · [Indeks #6](https://github.com/ematrejek/bassmap-pl/issues/6)

**Sync rule (agents):** `roadmap.md` and the GitHub board stay aligned throughout work \u2013 not only at generation or archive. When picking up, blocking, or finishing a slice/foundation: update `Status` here, the matching issue, and the project column in the **same session** (`Todo` / `In Progress` / `Done`; close issue on `done`). See @AGENTS.md §Roadmap & external backlog.

**Legal sync (UGC):** slice'y z treścią od użytkowników (`S-12`, **`S-17`**, `S-14`, `S-15`, `S-16`, **`S-20`**, **`S-22`**, **`S-23`**, **`S-24`**) oraz **`S-26`** (analytics/cookies) – przy `/10x-archive` zaktualizuj w tej samej sesji @src/pages/privacy-policy.astro, @src/pages/terms.astro oraz `LEGAL_UPDATED_AT` w @src/lib/legal/paths.ts.

| Roadmap ID | Change ID                 | GitHub | Suggested issue title                          | Ready for `/10x-plan` | Notes                                              |
| ---------- | ------------------------- | ------ | ---------------------------------------------- | --------------------- | -------------------------------------------------- |
| F-01       | event-data-foundation     | #1     | Schemat wydarzeń: migracje + RLS               | \u2013                     | Done                                               |
| F-02       | admin-role-guard          | #2     | Rola admina: guard zapisu wydarzeń             | \u2013                     | Done                                               |
| S-01       | admin-event-management    | #3     | Panel admina: CRUD wydarzeń DnB                | \u2013                     | Done                                               |
| S-02       | fan-event-discovery       | #4     | Odkrywanie: lista, filtry, mapa, szczegóły     | \u2013                     | Done                                               |
| F-03       | production-deploy         | #5     | Deploy produkcyjny na Cloudflare               | \u2013                     | Done \u2013 https://bassmap.pl                          |
| S-03       | event-cover-photos        | #18    | Okładki wydarzeń                               | \u2013                     | Done                                               |
| S-04       | event-description         | #10    | Pole opisu wydarzenia                          | \u2013                     | Done \u2013 archived 2026-06-13                         |
| S-05       | date-range-filter         | #11    | Filtr dat: kalendarz + presety                 | \u2013                     | Done \u2013 archived 2026-06-13; PR #12                 |
| S-06       | free-events-filter        | #19    | Przełącznik „Pokaż tylko darmowe”              | \u2013                     | Done \u2013 archived 2026-06-13; PR #13                 |
| S-11       | legal-pages               | #20    | Polityka prywatności i Regulamin               | \u2013                     | Done \u2013 archived 2026-06-13                         |
| S-07       | mobile-subgenre-dropdown  | #14    | Mobile: dropdown multichoice podgatunków       | \u2013                     | Done \u2013 archived 2026-06-13; issue #14              |
| S-08       | structured-price-currency | #15    | Cena liczbowa + waluta PLN/EUR/CZK             | \u2013                     | Done \u2013 archived 2026-06-14; PR #16                 |
| F-04       | app-shell-navigation      | #21    | Własny layout i nawigacja zakładkowa           | \u2013                     | Done \u2013 archived 2026-06-14; covers S-09+S-10       |
| S-09       | marketing-homepage        | #22    | Strona główna marketingowa (scroll)            | \u2013                     | Done \u2013 w slice F-04                                |
| S-10       | guest-nav-and-archive     | #23    | Menu gościa, formularz problemu, archiwum      | \u2013                     | Done \u2013 w slice F-04                                |
| S-12       | fan-account-zone          | #24    | Strefa zalogowanego fana + nawigacja           | \u2013                     | Done \u2013 archived 2026-06-15; PR #29                 |
| S-17       | event-content-copyright   | #30    | Prawa autorskie: źródło okładki + oświadczenia | \u2013                     | Done \u2013 archived 2026-06-16                         |
| S-13       | duplicate-event-detection | #25    | Wykrywanie duplikatów wydarzeń                 | \u2013                     | Done \u2013 archived 2026-06-18                         |
| S-14       | change-suggestions        | #26    | Sugestie zmian wydarzeń                        | \u2013                     | Done \u2013 archived 2026-06-19                         |
| S-15       | event-comments            | #27    | Komentarze pod wydarzeniami                    | \u2013                     | Done \u2013 archived 2026-06-19                         |
| S-16       | account-deletion          | #28    | Usuwanie konta użytkownika                     | \u2013                     | Done \u2013 archived 2026-06-19                         |
| S-18       | event-card-redesign       | #38    | Kafelki wydarzeń (bassmap-pl-ui)              | po S-16               | Done – archived 2026-06-22                         |
| S-19       | event-attendance          | #39    | Idę / Interesuję się + liczniki               | po S-18               | Done – archived 2026-06-23                         |
| S-20       | fan-profile-edit          | #40    | Edycja profilu fana                           | po S-19               | Legal sync profil publiczny                        |
| S-28       | profile-share             | #50    | Udostępnianie profilu: copy link (+ Web Share) | po S-20               | FB/IG share – iteracja 2; OG meta opcjonalnie      |
| S-21       | profile-spotify-embed     | #41    | My vibes: Spotify + SoundCloud embed           | po S-20               | Done 2026-06-24; tylko track; oEmbed tytuł        |
| S-22       | forum-threads             | #42    | Forum: wątki i komentarze                     | po S-20               | Legal sync UGC forum                               |
| S-23       | friends-and-recommendations | #43  | Znajomi, polecenia, powiadomienia             | po S-20, S-19         | E-mail opcjonalnie w slice                         |
| S-24       | crew-teams                | #44    | Moja ekipa: pełna funkcja                     | po S-22, S-23         | Szablony forum + akceptacja                        |
| F-05       | organizer-role-foundation | #45    | Rola organizatora + weryfikacja               | po S-16               | Ręczna akceptacja admina                           |
| S-25       | organizer-self-service    | #46    | Panel organizatora                            | po F-05, S-22         | Promowanie – parked                                |
| S-26       | analytics-consent         | #47    | GA4 + baner cookies RODO                      | po S-19+              | Aktualizacja NFR Privacy                           |
| S-27       | mobile-app                | #48    | Aplikacja mobilna / PWA                       | po S-26               | PWA → Capacitor → native                           |

## Open Roadmap Questions

1. **Routing po Partii II:** **`/` = strona marketingowa (okładka), `/events` = lista+mapa** \u2013 Owner: user. **Resolved 2026-06-14** → `context/archive/2026-06-14-app-shell-navigation/frame.md`.
2. **Próg fuzzy match duplikatów** \u2013 Owner: team. Block: S-13 planning only.
3. **Treść Polityki prywatności / Regulaminu** \u2013 Owner: user. Block: no \u2013 **resolved:** gotowe dokumenty w `BassMap_PL_dokumenty_prawne.docx` (13.06.2026); archived `context/archive/2026-06-13-legal-pages/`. Aktualizacja §2.2 (zgłoszenia eventów) + §2.1/§2.6 \u2013 2026-06-15 (S-12 archive). **S-17 done:** dropdown źródła okładki + art. 29 dla opisów + audyt w DB \u2013 archived 2026-06-16.
4. **Formularz admina \u2013 te same oświadczenia co fan?** \u2013 Owner: user. Block: no \u2013 **resolved 2026-06-16:** fan + admin (decyzja planowania S-17).
5. **Login publiczny (unikalność, znaki, widoczność profilu)** \u2013 Owner: user. Block: planowanie S-20.
6. **Liczniki RSVP – dokładna liczba vs zaokrąglenie** \u2013 Owner: user. Block: no.
7. **Dane kontaktowe po akceptacji do ekipy** \u2013 Owner: user. **Resolved 2026-06-25:** login + linki social z profilu (bez e-maila); decyzja w `context/changes/s-24/change.md`.
8. **Fan + organizator na jednym koncie?** \u2013 Owner: user. Block: no (domyślnie: tak).
9. **Lokalizacja design systemu bassmap-pl-ui** \u2013 Owner: user. Block: planowanie S-18.
10. **PWA vs Capacitor vs native (S-27)** \u2013 Owner: user + dane GA. Block: planowanie S-27.

## Resolved (history)

### 2026-06-23 \u2013 archiwum S-19 (event-attendance)

- **S-19 done** \u2013 archived `context/archive/2026-06-23-event-attendance/`; issue #39 zamknięte.
- **North star** przeniesiona z **S-19** na **S-20** (edycja profilu fana).
- **Legal sync S-19:** §2.9 polityki, `LEGAL_UPDATED_AT` 2026-06-23.
- **Deploy note:** migracja `20260623100000` (`event_attendance`) przed kodem z API/UI na produkcji.

### 2026-06-22 \u2013 shaping Partia III

- **Partia III** zdefiniowana: slice'y **S-18…S-27** + fundament **F-05**; pełny zapis w `context/foundation/partia-iii-shaping.md`.
- **North star** przeniesiona na **S-18** (kafelki UI).
- **Decyzje:** «Interesuję się» (nie «Obserwuję»); Spotify embed bez API; weryfikacja organizatora ręczna; GA wymaga cookies RODO; mobile na końcu (PWA first).
- **Parked items** forum/ekipa/organizer przeniesione z `## Parked` do proponowanych slice'ów Partii III.
- **GitHub issues** Partia III: **#38–#48** (S-18…S-27, F-05); indeks [#6](https://github.com/ematrejek/bassmap-pl/issues/6). Duplikat #37 zamknięty.

### 2026-06-19 \u2013 archiwum S-16 (account-deletion)

- **S-16 done** \u2013 archived `context/archive/2026-06-19-account-deletion/`; issue #28 zamknięte.
- **North star Partii II (konta i UGC) zamknięta** \u2013 łańcuch S-12…S-16 kompletny.
- **Legal sync S-16:** §5.1 polityki, §3.6 regulaminu, `LEGAL_UPDATED_AT` 2026-06-19 (wdrożone w implementacji).
- **Deploy note:** migracja `20260620100000` (FK sugestii SET NULL) przed kodem na produkcji.

### 2026-06-19 \u2013 archiwum S-15 (event-comments)

- **S-15 done** \u2013 archived `context/archive/2026-06-19-event-comments/`; issue #27 zamknięte.
- **North star** przeniesiona z **S-15** na **S-16** (usuwanie konta + anonimizacja komentarzy).
- **Legal sync S-15:** §2.8 polityki, §5.13–5.14 regulaminu, `LEGAL_UPDATED_AT` 2026-06-19 (wdrożone w implementacji).
- **Lesson:** `npm run verify` przed pushem \u2013 CI uruchamia `astro check`, którego lokalny `npm test` nie obejmuje.

### 2026-06-16 \u2013 archiwum S-17 (event-content-copyright)

- **S-17 done** \u2013 archived `context/archive/2026-06-15-event-content-copyright/`; issue #30 zamknięte.
- **North star** przeniesiona z **S-17** na **S-13** (duplikaty przed skalowaniem sugestii).
- **Legal sync S-17:** §5.6–5.9 regulaminu, §2.2/§4 polityki, `LEGAL_UPDATED_AT` 2026-06-16.
- **Manual QA pending:** pełna ścieżka fan/admin w przeglądarce \u2013 nie blokuje archive.

### 2026-06-15 \u2013 archiwum S-12 (fan-account-zone)

- **S-12 done** \u2013 PR #29, archived `context/archive/2026-06-15-fan-account-zone/`; issue #24 zamknięte.
- **North star** przeniesiona z **S-12** na **S-17** (compliance okładki + opis przed duplikatami).
- **Legal sync S-12:** checkbox praw autorskich, aktualizacja regulaminu/polityki (`ad53a46`–`76d8d7d`); pełny S-17 (dropdown + audyt DB) \u2013 osobny slice.
- **Manual QA pending:** migracja remote `db push`, E2E w przeglądarce \u2013 nie blokuje archive.

### 2026-06-15 \u2013 prawa autorskie zgłoszeń (S-17)

- Nowy slice **S-17** (`event-content-copyright`) między **S-12** a **S-13**: dropdown źródła okładki + warunkowe checkboxy oświadczeń; zapis w regulaminie o cytacie opisów (art. 29 \u2013 z zastrzeżeniem zakresu).
- **S-13** wymaga **S-17** (compliance przed skalowaniem zgłoszeń).

### 2026-06-15 \u2013 komentarze po usunięciu konta (S-16)

- **Decyzja (Option B):** treść komentarzy zostaje; autor wyświetlany jako „Usunięty użytkownik” (anonimizacja, bez powiązania z usuniętym kontem).
- **S-16** wymaga **S-15** (komentarze muszą istnieć przed wdrożeniem usuwania konta).
- Zapis w `prd.md` FR-022 + Business Logic.

### 2026-06-15 \u2013 PRD sync (Partia I + Partia II)

- **`context/foundation/prd.md` v2** \u2013 FR-009, FR-016, FR-013–FR-024; zaktualizowane Non-Goals, Access Control, NFR Privacy, Business Logic.
- **North star** przeniesiona z S-05 (done) na **S-12** (fan submit → moderacja → discovery).

### 2026-06-14 \u2013 angielskie URL (F-04 / plan-review)

- **`/archive`** \u2013 archiwum minionych eventów (etykieta menu PL: „Archiwum wydarzeń”).
- **`/report-issue`** \u2013 formularz zgłoszenia (etykieta menu PL: „Zgłoś problem”).
- **`/privacy-policy`**, **`/terms`** – strony prawne (redirect 301 ze starych `/polityka-prywatnosci`, `/regulamin`).

### 2026-06-14 \u2013 archiwum i redirect (F-04 / S-10)

- **Archiwum:** publiczny odczyt `published` + data rozpoczęcia **przed dzisiejszym dniem** (Europe/Warsaw); w SQL: `NOT is_upcoming(starts_at)`.
- **Redirect:** `/` z parametrami filtrów → `/events?…` (302).

### 2026-06-14 \u2013 copy strony głównej i formularz (F-04 / S-09 / S-10)

- **Slogan:** Find the place, drop the bass! (bez zmian).
- **Kim jesteśmy:** tekst od właścicielki \u2013 `context/archive/2026-06-14-app-shell-navigation/frame.md`.
- **Zgłoś problem:** wysyłka mailem na kontakt@bassmap.pl (nie ticket w DB).

### 2026-06-14 \u2013 routing strony głównej (F-04)

- **`/`** = okładka marketingowa (scroll, hero, CTA, o nas, kontakt, menu kafelkowe).
- **`/events`** = odkrywanie (lista + mapa \u2013 obecny widok z `index.astro`).
- Frame: `context/archive/2026-06-14-app-shell-navigation/frame.md`.

### 2026-06-11 \u2013 F-03 domena

- **Domena na start:** własna `.pl` \u2013 zakup u polskiego rejestratora, DNS w Cloudflare, Custom Domain na Workerze.

### 2026-06-10 \u2013 współrzędne pinezek

- Geokodowanie adresu venue przy zapisie w S-01 (Nominatim/OSM); tryb alternatywny \u2013 ręczne współrzędne.

### 2026-06-11 \u2013 UX odkrywania

- `/` = lista + mapa (split desktop, zakładki mobile); podgląd → `/events/[id]`; filtry w URL; multi podgatunek OR.

## Parked

- **Promowanie wydarzeń (płatne)** \u2013 Why parked: właścicielka – na razie bez monetyzacji; wraca po S-25 i walidacji organizatorów.
- **Spotify API (pełna integracja)** \u2013 Why parked: S-21 wystarczy embed z URL; API tylko jeśli embed nie wystarczy.
- **Udostępnianie profilu na Facebook / Instagram (dedykowane przyciski)** \u2013 Why parked: S-28 v1 = kopiowanie linku + Web Share API; przyciski FB/IG wymagają share URL platform i sensownych tagów Open Graph na `/u/login`.
- **Automatyczna weryfikacja organizatora (KRS/NIP)** \u2013 Why parked: F-05 = ręczna akceptacja admina na start.
- **Podgląd audio artystów** \u2013 Why parked: PRD §Non-Goals v2.
- **Monetyzacja / linki afiliacyjne** \u2013 Why parked: PRD §Non-Goals post-launch.
- **Wydarzenia poza Polską** \u2013 Why parked: PRD §Non-Goals v2+.
- **Subdomena www** \u2013 Why parked: mały nakład DNS; nie blokuje Partii III \u2013 można dorzucić ad hoc.
- **Portal organizatora (branding, statystyki, bulk)** \u2013 Why parked: S-25 = self-service eventów + ogłoszenia; pełny portal to v2+ poza S-25.

## Done

- **F-01: (foundation) tabela wydarzeń z migracjami, politykami RLS i regułami biznesowymi.** \u2013 Archived 2026-06-11 → `context/archive/2026-06-10-event-data-foundation/`. Lesson: \u2013.
- **F-02: (foundation) tylko użytkownicy z rolą admina mogą dodawać, edytować i usuwać wydarzenia.** \u2013 Archived 2026-06-10 → `context/archive/2026-06-10-admin-role-guard/`. Lesson: allowlist e-mail musi dokładnie pasować do konta Auth.
- **S-01: admin dodaje, edytuje i usuwa wydarzenia DnB.** \u2013 Archived 2026-06-11 → `context/archive/2026-06-10-admin-event-management/`. Lesson: \u2013.
- **S-02: fan filtruje nadchodzące wydarzenia po mieście i podgatunku, widzi listę, mapę i szczegóły.** \u2013 Archived 2026-06-11 → `context/archive/2026-06-11-fan-event-discovery/`. Lesson: jawne filtry fan read (`context/foundation/lessons.md`).
- **F-03: (foundation) aplikacja dostępna pod publicznym adresem Cloudflare.** \u2013 Archived 2026-06-11 → `context/archive/2026-06-11-production-deploy/`. Lesson: propagacja DNS .pl może opóźniać dostęp z lokalnego Wi‑Fi.
- **S-03: fan widzi zdjęcia okładek na kartach i stronie szczegółów.** \u2013 Archived 2026-06-13 → `context/archive/2026-06-12-event-cover-photos/`. Lesson: upload okładek przez Worker API + klucz serwisowy.
- **S-04: fan czyta opis wydarzenia; admin edytuje pole opis.** \u2013 Archived 2026-06-13 → `context/archive/2026-06-13-event-description/`. Lesson: \u2013
- **S-11: fan otwiera Politykę prywatności i Regulamin; rejestrujący widzi tekst akceptacji z linkami.** \u2013 Archived 2026-06-13 → `context/archive/2026-06-13-legal-pages/`. Lesson: integracje SMTP (Resend) mogą być poza repo \u2013 weryfikuj przed review polityki prywatności.
- **S-08: admin wpisuje cenę jako liczbę z walutą PLN/EUR/CZK; fan widzi sformatowaną cenę.** \u2013 Archived 2026-06-14 → `context/archive/2026-06-14-structured-price-currency/`. Lesson: domyślna waluta w formularzu admina musi być `null`, dopóki admin nie poda kompletnej ceny \u2013 inaczej blokuje „Cena do ustalenia”.
- **S-07: fan na telefonie wybiera podgatunki z rozwijanej listy wielokrotnego wyboru.** \u2013 Archived 2026-06-13 → `context/archive/2026-06-13-mobile-subgenre-dropdown/`. Lesson: \u2013
- **S-12: zalogowany fan ma strefę konta, zgłasza wydarzenia do moderacji; admin publikuje lub odrzuca.** \u2013 Archived 2026-06-15 → `context/archive/2026-06-15-fan-account-zone/`. Lesson: okładki fana w MVP \u2013 zaakceptowany drift; pełny compliance (S-17) przed skalowaniem zgłoszeń.
- **S-17: zgłaszający wybiera źródło okładki i składa wymagane oświadczenie praw autorskich.** \u2013 Archived 2026-06-16 → `context/archive/2026-06-15-event-content-copyright/`. Lesson: fan + admin ten sam wzorzec okładki; manual QA w przeglądarce odłożone po archive.
- **S-13: przy dodawaniu wydarzenia system sprawdza podobieństwo po nazwie (fuzzy match), adresie i dacie; admin widzi komunikat „Podobne wydarzenie już istnieje: [nazwa], kliknij aby wprowadzić zmiany”; użytkownik widzy „Podobne wydarzenie już istnieje: [nazwa], czy chcesz zasugerować zmiany?” i może wysłać sugestię do admina zamiast duplikować.** \u2013 Archived 2026-06-18 → `context/archive/2026-06-16-duplicate-event-detection/`. Lesson: \u2013.
- **S-14: fan na stronie opublikowanego nadchodzącego wydarzenia wypełnia formularz z proponowanymi zmianami pól; admin w panelu otwiera sugestię, porównuje pola i po „Przyjmij” zapisuje zmiany w wydarzeniu (flow duplikatu z S-13 pozostaje tekstowy).** \u2013 Archived 2026-06-19 → `context/archive/2026-06-19-change-suggestions/`. Lesson: \u2013.
- **S-15: pod szczegółami opublikowanego wydarzenia każdy czyta komentarze; zalogowany użytkownik dodaje komentarz i może usunąć własny; administrator usuwa dowolny komentarz.** \u2013 Archived 2026-06-19 → `context/archive/2026-06-19-event-comments/`. Lesson: przed pushem na `main` uruchom `npm run verify` (`astro check` łapie błędy typów w testach API).
- **S-16: zalogowany fan trwale usuwa konto z profilu po potwierdzeniu hasłem; komentarze zostają z etykietą „Usunięty użytkownik”; zgłoszenia i sugestie tracą powiązanie z kontem.** \u2013 Archived 2026-06-19 → `context/archive/2026-06-19-account-deletion/`. Lesson: jawny UPDATE `author_label` przed `deleteUser`; migracja FK sugestii przed deployem.
- **S-18: fan na liście `/events` widzi kwadratowe kafelki zgodne z designem bassmap-pl-ui: nazwa, podgatunki, miejsce, czas, cena.** \u2013 Archived 2026-06-22 → `context/archive/2026-06-22-event-card-redesign/`. Lesson: \u2013.
- **S-19: zalogowany fan na stronie wydarzenia klika «Idę» lub «Interesuję się»; wszyscy widzą liczniki; wydarzenia trafiają do sekcji Moje eventy (`#ide`, `#interesuje-sie`) i skrótu na profilu.** \u2013 Archived 2026-06-23 → `context/archive/2026-06-23-event-attendance/`. Lesson: \u2013.
- **S-20: fan w «Edytuj profil» ustawia login (publiczny), opis, miasto, ulubione podgatunki i linki social; gość widzi publiczny profil pod `/u/login` (bez e-maila).** \u2013 Archived 2026-06-24 → `context/archive/2026-06-23-fan-profile-edit/`. Lesson: `db push` na produkcję przed deployem kodu wymagającego nowych tabel; E2E w CI musi budować preview z lokalnym Supabase (`.env.test`).
- **S-28: na własnym profilu (`/profile`) i publicznym (`/u/login`) fan widzi przycisk «Udostępnij»; po kliknięciu może skopiować link do publicznego profilu (schowek) z potwierdzeniem „Skopiowano”. Na urządzeniach z Web Share API – opcjonalnie natywny panel udostępniania systemu (zamiast samego kopiowania).** \u2013 Archived 2026-06-24 → `context/archive/2026-06-24-profile-share/`. Lesson: \u2013.
- **S-21: fan wybiera Spotify lub SoundCloud, wkleja link do pojedynczego utworu; na profilu w sekcji My vibes widać tytuł (pobrany automatycznie przez oEmbed) i osadzony odtwarzacz (iframe). Bez logowania do platform i bez pełnego Spotify API.** \u2013 Archived 2026-06-24 → `context/archive/2026-06-24-profile-spotify-embed/`. Lesson: \u2013.
- **S-22: zalogowany fan tworzy wątek w kategorii: «Szukam ekipy», «Mamy ekipę – szukamy ludzi», «Ogólne»; czyta listę, wchodzi w wątek, komentuje; admin usuwa wątki/komentarze. Placeholder `/forum` zastąpiony działającym forum.** \u2013 Archived 2026-06-25 → `context/archive/2026-06-24-forum-threads/`. Lesson: \u2013.
- **S-23: znajomi, polecenia eventów i panel powiadomień in-app.** \u2013 Archived 2026-06-25 → `context/archive/2026-06-25-friends-and-recommendations/`. Lesson: \u2013.

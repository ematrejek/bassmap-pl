---
project: BassMap PL
version: 2
status: active
created: 2026-06-10
updated: 2026-06-13
subgenre_catalog_version: 1
prd_version: 1
main_goal: market-feedback
top_blocker: decisions
---

# Roadmap: BassMap PL

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline + user notes 2026-06-13 (Partia I / Partia II).
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

BassMap PL to pierwsza scentralizowana wyszukiwarka wydarzeń drum'n'bass w Polsce. Fani DnB nie mają jednego źródła prawdy o nadchodzących eventach — muszą ręcznie sprawdzać Facebooka, Instagram, znajomych i fragmentaryczne portale biletowe. Produkt wypełnia tę lukę: jedno miejsce, po polsku, z filtrowaniem po mieście i podgatunku oraz pełnymi szczegółami wydarzenia.

MVP (F-01…F-03, S-01…S-03) jest **done** i działa na https://bassmap.pl. Kolejne prace dzielą się na **Partię I** (must-have ulepszenia odkrywania i danych) oraz **Partię II** (własny layout, konta fanów, społeczność i moderacja).

## North star

**S-05: Fan filtruje wydarzenia po dacie** — fan wybiera dowolną datę lub zakres z kalendarza albo skrót „dziś / w tym tygodniu / w tym miesiącu” i widzi dopasowaną listę z mapą.

> Gwiazda przewodnia — najmniejszy przepływ end-to-end, którego udane dowiezienie udowadnia, że BassMap realnie ułatwia planowanie wyjścia na event (nie tylko przeglądanie listy). Partia I jest must-have przed Partią II; filtr dat to najczęstszy sygnał od fanów po launchu MVP.

## At a glance

| ID   | Change ID                 | Outcome (user can …)                                                                 | Prerequisites | PRD refs                          | Status   |
| ---- | ------------------------- | ------------------------------------------------------------------------------------ | ------------- | --------------------------------- | -------- |
| F-01 | event-data-foundation     | (foundation) schemat wydarzeń w bazie z migracjami i politykami RLS                  | —             | Business Logic, NFR               | done     |
| F-02 | admin-role-guard          | (foundation) ścieżki zapisu chronione rolą admina                                    | —             | Access Control                    | done     |
| S-01 | admin-event-management    | admin dodaje, edytuje i usuwa wydarzenia DnB                                         | F-01, F-02    | FR-006, FR-007                    | done     |
| S-02 | fan-event-discovery       | fan filtruje po mieście/podgatunku, widzi listę, mapę i szczegóły wydarzenia       | F-01, S-01    | US-01, FR-001–FR-005              | done     |
| F-03 | production-deploy         | (foundation) aplikacja działa pod publicznym adresem z poprawnymi sekretami          | S-01          | NFR Operating cost                | done     |
| S-03 | event-cover-photos        | fan widzi zdjęcia okładek na kartach i stronie szczegółów wydarzenia                 | S-02          | post-MVP                          | done     |
| S-04 | event-description         | fan czyta opis wydarzenia; admin edytuje pole opis                                   | S-02          | FR-004, notes 2026-06-13          | done     |
| S-05 | date-range-filter         | fan filtruje po dacie (kalendarz + skróty dziś/tydzień/miesiąc)                      | S-02          | FR-008, notes 2026-06-13          | done     |
| S-06 | free-events-filter        | fan włącza „Pokaż tylko darmowe” i widzi tylko darmowe wydarzenia                    | S-02          | FR-004, Business Logic            | done     |
| S-07 | mobile-subgenre-dropdown  | fan na telefonie wybiera podgatunki z rozwijanej listy wielokrotnego wyboru          | S-02          | FR-003, NFR Device                | ready    |
| S-08 | structured-price-currency | admin wpisuje cenę jako liczbę (od X / X–Y) z walutą PLN/EUR/CZK; fan widzi poprawnie | S-01          | FR-004, FR-006, notes 2026-06-13  | ready    |
| F-04 | app-shell-navigation      | (foundation) własny layout z nawigacją zakładkową zamiast domyślnego Astro           | S-04–S-08     | Access Control, notes 2026-06-13  | proposed |
| S-09 | marketing-homepage        | fan widzi płynnie przewijaną stronę główną z logo, sloganem, sekcjami i CTA         | F-04          | notes 2026-06-13                  | proposed |
| S-10 | guest-nav-and-archive     | gość korzysta z menu (lista, logowanie, rejestracja, zgłoszenie problemu, archiwum)  | F-04, S-09    | notes 2026-06-13                  | proposed |
| S-11 | legal-pages               | fan otwiera Politykę prywatności i Regulamin z dyskretnego linku na stronie głównej  | S-09          | NFR Privacy, notes 2026-06-13     | proposed |
| S-12 | fan-account-zone          | zalogowany fan ma zakładki profil, moje eventy, dodaj event, placeholdery, wyloguj   | F-04, S-10    | Access Control, notes 2026-06-13  | proposed |
| S-13 | duplicate-event-detection | system wykrywa podobne wydarzenie (nazwa/adres/data) i pokazuje właściwy komunikat   | S-12          | notes 2026-06-13                  | proposed |
| S-14 | change-suggestions        | fan/admin zgłasza sugestię zmian; admin ocenia w panelu „Sugestie zmian”             | S-12, S-13    | notes 2026-06-13                  | proposed |
| S-15 | event-comments            | zalogowany fan komentuje wydarzenie; wszyscy czytają; admin usuwa komentarze         | S-12          | notes 2026-06-13                  | proposed |
| S-16 | account-deletion          | zalogowany użytkownik usuwa swoje konto                                              | S-12          | NFR Privacy, notes 2026-06-13     | proposed |

## Streams

Nawigacja — grupy elementów współdzielących łańcuch zależności. Kanoniczna kolejność jest w grafie poniżej.

| Stream | Theme                    | Chain                                                                 | Note                                                                 |
| ------ | ------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| A      | MVP (zamknięte)          | `F-01` → `S-01` → `S-02` → `S-03`                                   | Done — odkrywanie i okładki na produkcji.                            |
| B      | Partia I — odkrywanie    | `S-04` / `S-05` / `S-06` / `S-07` / `S-08` (równolegle po `S-02`)   | Must-have przed Partią II; `S-05` to gwiazda przewodnia fazy.        |
| C      | Partia II — layout       | `F-04` → `S-09` → `S-10` → `S-11`                                   | Własny shell, homepage, nawigacja gościa, dokumenty prawne.          |
| D      | Partia II — konta i UGC  | `S-12` → `S-13` → `S-14` / `S-15` / `S-16`                          | Dołącza do Stream C przy `F-04`; komentarze i usuwanie konta równolegle z `S-14`. |

## Baseline

What's already in place in the codebase as of `2026-06-13` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present (partial UI) — Astro 6 SSR + React 19 + Tailwind 4; routing plikowy w `src/pages/`; shadcn/ui; odkrywanie w `DiscoveryShell.tsx`, filtry miasto/podgatunek w `EventFilters.tsx`; brak filtra dat, opisu, własnego app shell
- **Backend / API:** partial — Astro SSR na Cloudflare; trasy auth + admin events; brak API komentarzy, sugestii, archiwum, wykrywania duplikatów
- **Data:** partial — tabela `events` z `is_free`, `price text` (bez opisu, bez ustrukturyzowanej ceny/waluty); brak tabel komentarzy, sugestii, zgłoszeń użytkowników
- **Auth:** present — Supabase Auth, sesje cookie SSR, middleware, rola admin; brak strefy fana, usuwania konta, flow zgłoszeń użytkownika
- **Deploy / infra:** present — https://bassmap.pl na Cloudflare Workers; CI lint/build/deploy
- **Observability:** partial — `observability.enabled` w Wrangler; brak logowania i error trackingu w aplikacji

## Foundations

### F-01: Schemat danych wydarzeń

- **Outcome:** (foundation) tabela wydarzeń z migracjami, politykami RLS i regułami biznesowymi (nadchodzące vs przeszłe, wymagane pola, tagi podgatunków ze stałej listy 25 wartości — PRD §Business Logic).
- **Change ID:** event-data-foundation
- **PRD refs:** Business Logic, NFR Scale path, Access Control
- **Unlocks:** S-01, S-02; reguła ukrywania przeszłych eventów; wielokrotne tagi podgatunków
- **Prerequisites:** —
- **Parallel with:** F-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Bez schematu żaden pionowy slice nie ma danych — fundament musi być pierwszy mimo że nie jest widoczny dla fana.
- **Status:** done

### F-02: Ochrona roli admina

- **Outcome:** (foundation) tylko użytkownicy z rolą admina mogą dodawać, edytować i usuwać wydarzenia; publiczny odczyt bez logowania.
- **Change ID:** admin-role-guard
- **PRD refs:** Access Control, FR-006, FR-007
- **Unlocks:** S-01; bramka weryfikacji admina z guardrails PRD
- **Prerequisites:** —
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Istniejący scaffold auth obsługuje logowanie, ale nie rozróżnia admina od zwykłego użytkownika — bez tego S-01 nie spełnia guardrails.
- **Status:** done

### F-03: Wdrożenie produkcyjne

- **Outcome:** (foundation) aplikacja dostępna pod publicznym adresem Cloudflare z poprawnie ustawionymi sekretami Supabase.
- **Change ID:** production-deploy
- **PRD refs:** NFR Operating cost
- **Unlocks:** walidacja sygnału od rynku z prawdziwym URL; ścieżka weryfikacji dla S-02
- **Prerequisites:** S-01
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Przy blokerze umiejętności pierwszy deploy bywa zaskoczeniem — lepiej po zasileniu bazy pierwszymi eventami niż na pustej aplikacji.
- **Status:** done

### F-04: App shell i nawigacja zakładkowa

- **Outcome:** (foundation) wspólny layout aplikacji z rozwijanym menu (kafelek) i zakładkami zależnymi od roli (gość / fan / admin); odejście od domyślnego layoutu Astro na rzecz dedykowanego szkieletu nawigacji.
- **Change ID:** app-shell-navigation
- **PRD refs:** Access Control, NFR Device, notes 2026-06-13
- **Unlocks:** S-09, S-10, S-12; spójna nawigacja Partii II
- **Prerequisites:** S-04, S-05, S-06, S-07, S-08
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Czy `/` zostaje stroną marketingową, a lista+mapa przechodzi na `/events` (lub inna ścieżka)? — Owner: user. Block: yes (blokuje S-09, S-10).
- **Risk:** Duży refactor layoutu — sensownie dopiero po domknięciu Partii I, żeby nie przebudowywać filtrów dwa razy.
- **Status:** proposed

## Slices

### S-01: Zarządzanie wydarzeniami przez admina

- **Outcome:** admin dodaje, edytuje i usuwa wydarzenia DnB z wymaganymi polami (nazwa, data, miasto, venue) i opcjonalnymi (lineup, link biletowy, cena, tagi podgatunków); adres geokodowany automatycznie (Nominatim) lub ręczne współrzędne w trybie „lokalizacja tajna”.
- **Change ID:** admin-event-management
- **PRD refs:** FR-006, FR-007
- **Prerequisites:** F-01, F-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Admin jest jedynym źródłem danych w MVP — bez tego slice'a S-02 nie ma czego pokazać fanowi.
- **Status:** done

### S-02: Odkrywanie wydarzeń przez fana

- **Outcome:** fan filtruje nadchodzące wydarzenia po mieście i podgatunku, widzi listę posortowaną po dacie, pinezki na interaktywnej mapie Polski i pełne szczegóły po kliknięciu.
- **Change ID:** fan-event-discovery
- **PRD refs:** US-01, FR-001, FR-002, FR-003, FR-004, FR-005
- **Prerequisites:** F-01, S-01
- **Parallel with:** F-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Mapa Leaflet + hydratacja w Astro/Cloudflare to największa luka umiejętnościowa — plan: `context/changes/fan-event-discovery/plan.md`. Eventy bez współrzędnych: fallback centrum miasta na mapie (rzadkie po S-01).
- **Status:** done

### S-03: Okładki wydarzeń

- **Outcome:** fan widzi zdjęcia okładek na kartach listy, w podglądzie i na stronie szczegółów; admin opcjonalnie wgrywa plakat (pion/poziom).
- **Change ID:** event-cover-photos
- **PRD refs:** post-MVP
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Upload przez Worker API — lesson w `context/archive/2026-06-12-event-cover-photos/`.
- **Status:** done

---

## Partia I — must-have (po MVP)

> Ustalone 2026-06-13. `S-04` **done** (2026-06-13). `S-05` **done** (2026-06-13). `S-06` **done** (2026-06-13). Pozostałe slice'y Partii I: `S-07` / `S-08` **ready**. Rekomendowana kolejność: `S-07` / `S-08`.

### S-04: Pole opisu wydarzenia

- **Outcome:** fan czyta opis wydarzenia na stronie szczegółów; admin dodaje i edytuje opis w formularzu wydarzenia.
- **Change ID:** event-description
- **PRD refs:** FR-004, notes 2026-06-13
- **Prerequisites:** S-02
- **Parallel with:** S-05, S-06, S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Wymaga migracji kolumny `description` + aktualizacji formularza admina i widoku szczegółów — niski zakres, dobry pierwszy krok Partii I.
- **Status:** done — archived 2026-06-13 → `context/archive/2026-06-13-event-description/`

**FR (propozycja do PRD):**

- **FR-009:** Wydarzenie ma opcjonalne pole opis (tekst); fan widzi je w szczegółach. Priority: must-have (Partia I).

### S-05: Filtrowanie po datach

- **Outcome:** fan filtruje wydarzenia wybierając dowolną datę lub zakres dat z kalendarza albo skrót „dziś”, „w tym tygodniu”, „w tym miesiącu”; lista i mapa respektują filtr; filtry w URL.
- **Change ID:** date-range-filter
- **PRD refs:** FR-008, notes 2026-06-13
- **Prerequisites:** S-02
- **Parallel with:** S-04, S-06, S-07, S-08
- **Blockers:** —
- **Unknowns:**
  - Strefa czasu zakresu: Europe/Warsaw (jak RLS `is_upcoming`) — Owner: team. Block: no.
- **Risk:** FR-008 elevated to must-have (Partia I) — PRD updated 2026-06-13.
- **Status:** done — archived 2026-06-13 → `context/archive/2026-06-13-date-range-filter/`

**FR (elevacja PRD):**

- **FR-008** (elevated): Fan filtruje po dacie pojedynczej lub zakresie + presety dziś/tydzień/miesiąc. Priority: must-have (Partia I).

### S-06: Filtr „Pokaż tylko darmowe”

- **Outcome:** fan włącza przełącznik „Pokaż tylko darmowe” i widzi wyłącznie wydarzenia oznaczone jako darmowe (`is_free`); filtr łączy się z miastem, podgatunkiem i datą.
- **Change ID:** free-events-filter
- **PRD refs:** FR-004, Business Logic
- **Prerequisites:** S-02
- **Parallel with:** S-04, S-05, S-07
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Działa na istniejącym polu `is_free` — nie wymaga S-08, ale spójność z nowym modelem ceny (S-08) poprawi jakość danych.
- **Status:** done — archived 2026-06-13 → `context/archive/2026-06-13-free-events-filter/`

**FR (propozycja do PRD):**

- **FR-010:** Fan filtruje listę do wyłącznie darmowych wydarzeń. Priority: must-have (Partia I).

### S-07: Subgatunki na mobile — dropdown wielokrotnego wyboru

- **Outcome:** na telefonie fan wybiera podgatunki z rozwijanej listy wielokrotnego wyboru zamiast długiego scrolla checkboxów; desktop może zostać bez zmian lub dostać ten sam wzorzec.
- **Change ID:** mobile-subgenre-dropdown
- **PRD refs:** FR-003, NFR Device
- **Prerequisites:** S-02
- **Parallel with:** S-04, S-05, S-06, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Czysto UI — niski koszt, duży zysk miejsca na ekranie telefonu.
- **Status:** ready

**FR (propozycja do PRD):**

- **FR-011:** Filtr podgatunków na urządzeniach mobilnych nie zajmuje nadmiernie ekranu (dropdown multichoice). Priority: must-have (Partia I).

### S-08: Ustrukturyzowana cena i waluta

- **Outcome:** admin wpisuje cenę jako liczbę z trybem „od X” lub „X–Y” i wybiera walutę z listy PLN / EUR / CZK; system waliduje dane; fan widzi sformatowaną cenę w liście i szczegółach; migracja istniejących wartości tekstowych `price`.
- **Change ID:** structured-price-currency
- **PRD refs:** FR-004, FR-006, notes 2026-06-13
- **Prerequisites:** S-01
- **Parallel with:** S-04, S-05, S-06, S-07
- **Blockers:** —
- **Unknowns:**
  - Strategia migracji starych wartości `price text` (ręczna vs heurystyka) — Owner: team. Block: no.
- **Risk:** Zmiana schematu bazy + formularz admina — warto zrobić przed masowym zasilaniem bazy przez admina.
- **Status:** ready

**FR (propozycja do PRD):**

- **FR-012:** Cena wydarzenia to liczba (lub przedział) z walutą PLN/EUR/CZK; nie dowolny string. Priority: must-have (Partia I).

---

## Partia II — idziemy w świat

> Ustalone 2026-06-13. Wymaga domknięcia Partii I i F-04. Rozszerza PRD poza pierwotne Non-Goals (konta fanów, UGC, komentarze).

### S-09: Strona główna marketingowa

- **Outcome:** fan widzi płynnie przewijaną stronę główną z dużym logo i sloganem; sekcje „Kim jesteśmy i co robimy?”, przycisk „Znajdź swój event!” (→ lista wydarzeń), stopka z kontaktem kontakt@bassmap.pl i zaproszeniem do współpracy.
- **Change ID:** marketing-homepage
- **PRD refs:** notes 2026-06-13
- **Prerequisites:** F-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Treść copy sekcji „Kim jesteśmy” (tekst od właściciela produktu) — Owner: user. Block: no.
- **Risk:** Duży element wizualny — treść może być placeholderem do iteracji po launchu layoutu.
- **Status:** proposed

**FR (propozycja do PRD):**

- **FR-013:** Strona główna prezentuje produkt (logo, slogan, sekcje informacyjne, CTA do listy eventów). Priority: must-have (Partia II).

### S-10: Nawigacja gościa, zgłoszenie problemu i archiwum

- **Outcome:** gość rozwija menu z kafelka i przechodzi do: Lista eventów (obecny widok lista+mapa), Zaloguj się, Zarejestruj się, Zgłoś problem (formularz kontaktowy), Archiwum wydarzeń (przeszłe eventy — lista bez mapy).
- **Change ID:** guest-nav-and-archive
- **PRD refs:** notes 2026-06-13
- **Prerequisites:** F-04, S-09
- **Parallel with:** S-11
- **Blockers:** —
- **Unknowns:**
  - Dostarczenie formularza kontaktowego (e-mail vs ticket w bazie) — Owner: user. Block: no.
- **Risk:** Archiwum wymaga publicznego odczytu przeszłych eventów (obecnie ukryte przez RLS) — osobna polityka lub widok tylko listy.
- **Status:** proposed

**FR (propozycja do PRD):**

- **FR-014:** Gość korzysta z menu nawigacji (lista, auth, zgłoszenie problemu, archiwum). Priority: must-have (Partia II).
- **FR-015:** Fan przegląda archiwum minionych wydarzeń (lista, bez mapy). Priority: must-have (Partia II).

### S-11: Polityka prywatności i regulamin

- **Outcome:** fan otwiera Politykę prywatności i Regulamin z dyskretnego linku na stronie głównej; strony są statyczne i czytelne.
- **Change ID:** legal-pages
- **PRD refs:** NFR Privacy, notes 2026-06-13
- **Prerequisites:** S-09
- **Parallel with:** S-10
- **Blockers:** —
- **Unknowns:**
  - Treść prawna dokumentów (wymaga review?) — Owner: user. Block: no (placeholder OK na start).
- **Risk:** Przed kontami fanów i komentarzami dokumenty stają się konieczne — sensownie przed S-12 lub równolegle.
- **Status:** proposed

**FR (propozycja do PRD):**

- **FR-016:** Strona udostępnia Politykę prywatności i Regulamin. Priority: must-have (Partia II).

### S-12: Strefa zalogowanego użytkownika (nie-admin)

- **Outcome:** po zalogowaniu fan (nie admin) widzi zakładki: Lista wydarzeń, Mój profil, Moje eventy, Dodaj wydarzenie, Moja ekipa (placeholder), Forum (placeholder), Wyloguj się; admin dodatkowo Panel admina (istniejący CRUD + kolejka zgłoszeń w S-13/S-14).
- **Change ID:** fan-account-zone
- **PRD refs:** Access Control, notes 2026-06-13
- **Prerequisites:** F-04, S-10
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** PRD §Non-Goals mówiło „no fan accounts in MVP” — Partia II świadomie to odblokowuje; wymaga aktualizacji PRD i NFR Privacy (konta = dane osobowe).
- **Status:** proposed

**FR (propozycja do PRD):**

- **FR-017:** Zalogowany fan ma dedykowaną nawigację i profil. Priority: must-have (Partia II).
- **FR-018:** Fan może dodać wydarzenie do moderacji (nie od razu publiczne). Priority: must-have (Partia II).

### S-13: Wykrywanie duplikatów wydarzeń

- **Outcome:** przy dodawaniu wydarzenia system sprawdza podobieństwo po nazwie (fuzzy match), adresie i dacie; admin widzi komunikat „Podobne wydarzenie już istnieje: [nazwa], kliknij aby wprowadzić zmiany”; użytkownik widzy „Podobne wydarzenie już istnieje: [nazwa], czy chcesz zasugerować zmiany?” i może wysłać sugestię do admina zamiast duplikować.
- **Change ID:** duplicate-event-detection
- **PRD refs:** notes 2026-06-13
- **Prerequisites:** S-12
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Próg fuzzy match (np. Levenshtein / pg_trgm) — Owner: team. Block: no.
- **Risk:** Fałszywe pozytywy irytują; fałszywe negatywy = duplikaty w bazie — warto zacząć konserwatywnie.
- **Status:** proposed

**FR (propozycja do PRD):**

- **FR-019:** System ostrzega przed duplikatem wydarzenia (nazwa/adres/data). Priority: must-have (Partia II).

### S-14: Sugestie zmian wydarzeń

- **Outcome:** na stronie szczegółów wydarzenia fan klika „Zasugeruj zmiany”, wypełnia formularz ze szczegółami; admin w panelu ma sekcję „Sugestie zmian” do oceny i wdrożenia lub odrzucenia.
- **Change ID:** change-suggestions
- **PRD refs:** notes 2026-06-13
- **Prerequisites:** S-12, S-13
- **Parallel with:** S-15
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Nakłada się z flow duplikatów (S-13) — jeden model danych „zgłoszenie użytkownika” może obsłużyć oba przypadki.
- **Status:** proposed

**FR (propozycja do PRD):**

- **FR-020:** Fan zgłasza sugestię zmian wydarzenia; admin ją przegląda w panelu. Priority: must-have (Partia II).

### S-15: Komentarze pod wydarzeniami

- **Outcome:** pod szczegółami wydarzenia fan czyta komentarze (publicznie); tylko zalogowany użytkownik może dodać komentarz; admin usuwa dowolny komentarz.
- **Change ID:** event-comments
- **PRD refs:** notes 2026-06-13
- **Prerequisites:** S-12
- **Parallel with:** S-14, S-16
- **Blockers:** —
- **Unknowns:**
  - Moderacja treści (słowa wulgarne, spam) — Owner: user. Block: no (MVP: tylko admin delete).
- **Risk:** UGC wymaga RLS, rate limitu i polityki prywatności (S-11).
- **Status:** proposed

**FR (propozycja do PRD):**

- **FR-021:** Zalogowany fan komentuje wydarzenie; komentarze widoczne publicznie; admin moderuje. Priority: must-have (Partia II).

### S-16: Usuwanie konta

- **Outcome:** zalogowany użytkownik usuwa swoje konto (z potwierdzeniem); dane osobowe i powiązane treści UGC są usuwane lub anonimizowane zgodnie z polityką prywatności.
- **Change ID:** account-deletion
- **PRD refs:** NFR Privacy, notes 2026-06-13
- **Prerequisites:** S-12
- **Parallel with:** S-15
- **Blockers:** —
- **Unknowns:**
  - Co z komentarzami po usunięciu konta (usunąć vs „usunięty użytkownik”) — Owner: user. Block: no.
- **Risk:** Wymaga integracji z Supabase Auth (delete user) i kaskady w bazie.
- **Status:** proposed

**FR (propozycja do PRD):**

- **FR-022:** Użytkownik może trwale usunąć konto. Priority: must-have (Partia II).

## Backlog Handoff

**External backlog (public):** [GitHub Project — Bassmap PL Roadmap](https://github.com/users/ematrejek/projects/2) · [Issues `label:roadmap`](https://github.com/ematrejek/bassmap-pl/issues?q=label%3Aroadmap) · [Indeks #6](https://github.com/ematrejek/bassmap-pl/issues/6)

**Sync rule (agents):** `roadmap.md` and the GitHub board stay aligned throughout work — not only at generation or archive. When picking up, blocking, or finishing a slice/foundation: update `Status` here, the matching issue, and the project column in the **same session** (`Todo` / `In Progress` / `Done`; close issue on `done`). See @AGENTS.md §Roadmap & external backlog.

| Roadmap ID | Change ID                 | GitHub | Suggested issue title                              | Ready for `/10x-plan` | Notes                                                |
| ---------- | ------------------------- | ------ | -------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| F-01       | event-data-foundation     | #1     | Schemat wydarzeń: migracje + RLS                   | —                     | Done                                                 |
| F-02       | admin-role-guard          | #2     | Rola admina: guard zapisu wydarzeń                 | —                     | Done                                                 |
| S-01       | admin-event-management    | #3     | Panel admina: CRUD wydarzeń DnB                    | —                     | Done                                                 |
| S-02       | fan-event-discovery       | #4     | Odkrywanie: lista, filtry, mapa, szczegóły         | —                     | Done                                                 |
| F-03       | production-deploy         | #5     | Deploy produkcyjny na Cloudflare                   | —                     | Done — https://bassmap.pl                            |
| S-03       | event-cover-photos        | —      | Okładki wydarzeń                                   | —                     | Done                                                 |
| S-04       | event-description         | #10    | Pole opisu wydarzenia                              | —                     | Done — archived 2026-06-13                           |
| S-05       | date-range-filter         | #11    | Filtr dat: kalendarz + presety                     | —                     | Done — archived 2026-06-13; PR #12                  |
| S-06       | free-events-filter        | —      | Przełącznik „Pokaż tylko darmowe”                  | —                     | Done — archived 2026-06-13; PR #13                  |
| S-07       | mobile-subgenre-dropdown  | —      | Mobile: dropdown multichoice podgatunków           | yes                   | Partia I                                             |
| S-08       | structured-price-currency | —      | Cena liczbowa + waluta PLN/EUR/CZK                 | yes                   | Partia I                                             |
| F-04       | app-shell-navigation      | —      | Własny layout i nawigacja zakładkowa               | no                    | Czeka na Partię I; unknown: routing `/` vs `/events` |
| S-09       | marketing-homepage        | —      | Strona główna marketingowa (scroll)                | no                    | Partia II                                            |
| S-10       | guest-nav-and-archive     | —      | Menu gościa, formularz problemu, archiwum          | no                    | Partia II                                            |
| S-11       | legal-pages               | —      | Polityka prywatności i Regulamin                   | no                    | Partia II                                            |
| S-12       | fan-account-zone          | —      | Strefa zalogowanego fana + nawigacja               | no                    | Partia II; aktualizacja PRD Non-Goals                |
| S-13       | duplicate-event-detection | —      | Wykrywanie duplikatów wydarzeń                     | no                    | Partia II                                            |
| S-14       | change-suggestions        | —      | Sugestie zmian wydarzeń                            | no                    | Partia II                                            |
| S-15       | event-comments            | —      | Komentarze pod wydarzeniami                        | no                    | Partia II                                            |
| S-16       | account-deletion          | —      | Usuwanie konta użytkownika                         | no                    | Partia II                                            |

## Open Roadmap Questions

1. **Routing po Partii II:** czy `/` = strona marketingowa, a lista+mapa = `/events` (lub inna ścieżka)? — Owner: user. Block: F-04, S-09, S-10.
2. **Aktualizacja PRD:** Partia I podnosi FR-008 do must-have; Partia II dodaje konta fanów, UGC, komentarze (obecnie Non-Goals) — kiedy zsynchronizować `prd.md`? — Owner: user. Block: no (roadmap jest actionable bez tego, ale PRD będzie rozjechany).
3. **Próg fuzzy match duplikatów** — Owner: team. Block: S-13 planning only.
4. **Treść Polityki prywatności / Regulaminu** — Owner: user. Block: no (placeholder OK).
5. **Komentarze po usunięciu konta** — usunąć vs anonimizować — Owner: user. Block: S-16 planning only.

## Resolved (history)

### 2026-06-11 — F-03 domena

- **Domena na start:** własna `.pl` — zakup u polskiego rejestratora, DNS w Cloudflare, Custom Domain na Workerze.

### 2026-06-10 — współrzędne pinezek

- Geokodowanie adresu venue przy zapisie w S-01 (Nominatim/OSM); tryb alternatywny — ręczne współrzędne.

### 2026-06-11 — UX odkrywania

- `/` = lista + mapa (split desktop, zakładki mobile); podgląd → `/events/[id]`; filtry w URL; multi podgatunek OR.

## Parked

- **Portal organizatora (self-service pełny)** — Why parked: Partia II daje fanom „Dodaj wydarzenie” z moderacją, ale nie pełny portal organizatora z brandingiem i statystykami — to nadal v2+.
- **Moja ekipa (pełna funkcja)** — Why parked: Partia II = placeholder w nawigacji; carpooling/crew-finding pozostaje PRD §Non-Goals v3.
- **Forum (pełna funkcja)** — Why parked: Partia II = placeholder; pełne forum to osobny duży slice po walidacji potrzeby.
- **Podgląd audio artystów** — Why parked: PRD §Non-Goals v2.
- **Monetyzacja / linki afiliacyjne** — Why parked: PRD §Non-Goals post-launch.
- **Wydarzenia poza Polską** — Why parked: PRD §Non-Goals v2+.
- **Subdomena www** — Why parked: mały nakład DNS; nie blokuje Partii I/II — można dorzucić ad hoc.

## Done

- **F-01: (foundation) tabela wydarzeń z migracjami, politykami RLS i regułami biznesowymi.** — Archived 2026-06-11 → `context/archive/2026-06-10-event-data-foundation/`. Lesson: —.
- **F-02: (foundation) tylko użytkownicy z rolą admina mogą dodawać, edytować i usuwać wydarzenia.** — Archived 2026-06-10 → `context/archive/2026-06-10-admin-role-guard/`. Lesson: allowlist e-mail musi dokładnie pasować do konta Auth.
- **S-01: admin dodaje, edytuje i usuwa wydarzenia DnB.** — Archived 2026-06-11 → `context/archive/2026-06-10-admin-event-management/`. Lesson: —.
- **S-02: fan filtruje nadchodzące wydarzenia po mieście i podgatunku, widzi listę, mapę i szczegóły.** — Archived 2026-06-11 → `context/archive/2026-06-11-fan-event-discovery/`. Lesson: jawne filtry fan read (`context/foundation/lessons.md`).
- **F-03: (foundation) aplikacja dostępna pod publicznym adresem Cloudflare.** — Archived 2026-06-11 → `context/archive/2026-06-11-production-deploy/`. Lesson: propagacja DNS .pl może opóźniać dostęp z lokalnego Wi‑Fi.
- **S-03: fan widzi zdjęcia okładek na kartach i stronie szczegółów.** — Archived 2026-06-13 → `context/archive/2026-06-12-event-cover-photos/`. Lesson: upload okładek przez Worker API + klucz serwisowy.
- **S-04: fan czyta opis wydarzenia; admin edytuje pole opis.** — Archived 2026-06-13 → `context/archive/2026-06-13-event-description/`. Lesson: —

---
project: BassMap PL
version: 1
status: draft
created: 2026-06-10
updated: 2026-06-10
subgenre_catalog_version: 1
prd_version: 1
main_goal: market-feedback
top_blocker: skills
---

# Roadmap: BassMap PL

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

BassMap PL to pierwsza scentralizowana wyszukiwarka wydarzeń drum'n'bass w Polsce. Fani DnB nie mają jednego źródła prawdy o nadchodzących eventach — muszą ręcznie sprawdzać Facebooka, Instagram, znajomych i fragmentaryczne portale biletowe. Produkt wypełnia tę lukę: jedno miejsce, po polsku, z filtrowaniem po mieście i podgatunku oraz pełnymi szczegółami wydarzenia.

## North star

**S-02: Fan odkrywa wydarzenia DnB** — fan filtruje po mieście i podgatunku, widzi listę nadchodzących eventów z pinezkami na mapie Polski i otwiera pełne szczegóły wydarzenia.

> Gwiazda przewodnia — najmniejszy przepływ end-to-end, którego udane dowiezienie udowadnia główną hipotezę produktu (scentralizowane wyszukiwanie eventów DnB w Polsce). Umieszczamy go jak najwcześniej po spełnieniu warunków wstępnych, bo reszta ma sens tylko wtedy, gdy fan realnie znajduje wydarzenia.

## At a glance

| ID   | Change ID               | Outcome (user can …)                                                          | Prerequisites | PRD refs              | Status   |
| ---- | ----------------------- | ----------------------------------------------------------------------------- | ------------- | --------------------- | -------- |
| F-01 | event-data-foundation   | (foundation) schemat wydarzeń w bazie z migracjami i politykami RLS           | —             | Business Logic, NFR   | ready    |
| F-02 | admin-role-guard        | (foundation) ścieżki zapisu chronione rolą admina                               | —             | Access Control        | blocked  |
| S-01 | admin-event-management  | admin dodaje, edytuje i usuwa wydarzenia DnB                                  | F-01, F-02    | FR-006, FR-007        | proposed |
| S-02 | fan-event-discovery     | fan filtruje po mieście/podgatunku, widzi listę, mapę i szczegóły wydarzenia  | F-01, S-01    | US-01, FR-001–FR-005  | blocked  |
| F-03 | production-deploy       | (foundation) aplikacja działa pod publicznym adresem z poprawnymi sekretami   | S-01          | NFR Operating cost    | proposed |

## Streams

Nawigacja — grupy elementów współdzielących łańcuch zależności. Kanoniczna kolejność jest w grafie poniżej.

| Stream | Theme              | Chain                              | Note                                                                 |
| ------ | ------------------ | ---------------------------------- | -------------------------------------------------------------------- |
| A      | Dane wydarzeń      | `F-01` → `S-01` → `S-02`           | Główna ścieżka pod cel sygnału od rynku — od schematu do odkrywania. |
| B      | Kontrola admina    | `F-02` → `S-01`                    | Dołącza do Stream A przy `S-01`; blokuje zapis bez roli admina.      |
| C      | Wdrożenie produkcyjne | `F-03`                          | Po `S-01`; równolegle z końcówką `S-02` pod walidację z prawdziwym URL. |

## Baseline

What's already in place in the codebase as of `2026-06-10` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present (partial UI) — Astro 6 SSR + React 19 + Tailwind 4; routing plikowy w `src/pages/`; shadcn/ui z kilkoma komponentami (`src/components/ui/`)
- **Backend / API:** partial — Astro SSR na Cloudflare; trasy API tylko auth (`src/pages/api/auth/`)
- **Data:** partial — klient Supabase (`src/lib/supabase.ts`) tylko dla auth; brak migracji wydarzeń i `supabase/migrations/`
- **Auth:** present — Supabase Auth, sesje cookie SSR, middleware chroni `/dashboard` (`src/middleware.ts`)
- **Deploy / infra:** partial — `wrangler.jsonc`, workflowy CI/deploy; sekrety dokumentowane, brak pełnej weryfikacji produkcyjnej
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
- **Status:** ready

### F-02: Ochrona roli admina

- **Outcome:** (foundation) tylko użytkownicy z rolą admina mogą dodawać, edytować i usuwać wydarzenia; publiczny odczyt bez logowania.
- **Change ID:** admin-role-guard
- **PRD refs:** Access Control, FR-006, FR-007
- **Unlocks:** S-01; bramka weryfikacji admina z guardrails PRD
- **Prerequisites:** —
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:**
  - Jak wyznaczyć konto admina w Supabase (metadata, allowlist e-maili, custom claim)? — Owner: user. Block: yes.
- **Risk:** Istniejący scaffold auth obsługuje logowanie, ale nie rozróżnia admina od zwykłego użytkownika — bez tego S-01 nie spełnia guardrails.
- **Status:** blocked

### F-03: Wdrożenie produkcyjne

- **Outcome:** (foundation) aplikacja dostępna pod publicznym adresem Cloudflare z poprawnie ustawionymi sekretami Supabase.
- **Change ID:** production-deploy
- **PRD refs:** NFR Operating cost
- **Unlocks:** walidacja sygnału od rynku z prawdziwym URL; ścieżka weryfikacji dla S-02
- **Prerequisites:** S-01
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:**
  - Czy domena własna jest wymagana na start, czy wystarczy domyślny adres `*.workers.dev`? — Owner: user. Block: no.
- **Risk:** Przy blokerze umiejętności pierwszy deploy bywa zaskoczeniem — lepiej po zasileniu bazy pierwszymi eventami niż na pustej aplikacji.
- **Status:** proposed

## Slices

### S-01: Zarządzanie wydarzeniami przez admina

- **Outcome:** admin dodaje, edytuje i usuwa wydarzenia DnB z wymaganymi polami (nazwa, data, miasto, venue) i opcjonalnymi (lineup, link biletowy, cena, tagi podgatunków).
- **Change ID:** admin-event-management
- **PRD refs:** FR-006, FR-007
- **Prerequisites:** F-01, F-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Admin jest jedynym źródłem danych w MVP — bez tego slice'a S-02 nie ma czego pokazać fanowi.
- **Status:** proposed

### S-02: Odkrywanie wydarzeń przez fana

- **Outcome:** fan filtruje nadchodzące wydarzenia po mieście i podgatunku, widzi listę posortowaną po dacie, pinezki na interaktywnej mapie Polski i pełne szczegóły po kliknięciu.
- **Change ID:** fan-event-discovery
- **PRD refs:** US-01, FR-001, FR-002, FR-003, FR-004, FR-005
- **Prerequisites:** F-01, S-01
- **Parallel with:** F-03
- **Blockers:** —
- **Unknowns:**
  - Jak wyznaczać współrzędne pinezek na mapie — centroid miasta vs geokodowanie venue? — Owner: user. Block: yes.
  - Która biblioteka map (np. Leaflet) i jakie ograniczenia licencyjne/kosztowe przy zerowym budżecie MVP? — Owner: team. Block: no.
- **Risk:** Mapa i geolokalizacja to największa luka umiejętnościowa (top blocker) — slice jest gwiazdą przewodnią, więc nie odkładamy go, ale planowanie mapy wymaga rozstrzygnięcia współrzędnych.
- **Status:** blocked

## Backlog Handoff

**External backlog (public):** [GitHub Project — Bassmap PL Roadmap](https://github.com/users/ematrejek/projects/2) · [Issues `label:roadmap`](https://github.com/ematrejek/bassmap-pl/issues?q=label%3Aroadmap) · [Indeks #6](https://github.com/ematrejek/bassmap-pl/issues/6)

**Sync rule (agents):** `roadmap.md` and the GitHub board stay aligned throughout work — not only at generation or archive. When picking up, blocking, or finishing a slice/foundation: update `Status` here, the matching issue, and the project column in the **same session** (`Todo` / `In Progress` / `Done`; close issue on `done`). See @AGENTS.md §Roadmap & external backlog.

| Roadmap ID | Change ID               | GitHub | Suggested issue title                              | Ready for `/10x-plan` | Notes                                      |
| ---------- | ----------------------- | ------ | -------------------------------------------------- | --------------------- | ------------------------------------------ |
| F-01       | event-data-foundation   | #1     | Schemat wydarzeń: migracje + RLS                   | yes                   | Pierwszy krok — odblokowuje całą ścieżkę   |
| F-02       | admin-role-guard        | #2     | Rola admina: guard zapisu wydarzeń                 | no                    | Zablokowane: sposób wyznaczenia admina     |
| S-01       | admin-event-management  | #3     | Panel admina: CRUD wydarzeń DnB                    | no                    | Wymaga F-01 + F-02                        |
| S-02       | fan-event-discovery     | #4     | Odkrywanie: lista, filtry, mapa, szczegóły         | no                    | Gwiazda przewodnia; wymaga S-01 + unknowns |
| F-03       | production-deploy       | #5     | Deploy produkcyjny na Cloudflare                   | no                    | Po S-01; równolegle z końcówką S-02        |

## Open Roadmap Questions

1. **Jak wyznaczyć konto admina w Supabase?** — Owner: user. Block: F-02, S-01.
2. **Jak wyznaczać współrzędne pinezek na mapie — centroid miasta czy geokodowanie venue?** — Owner: user. Block: S-02.
3. **Czy na start wystarczy domyślny adres Cloudflare, czy potrzebna jest własna domena?** — Owner: user. Block: F-03 (planowanie, nie roadmap-wide).

## Parked

- **Konta fanów / personalizacja** — Why parked: PRD §Non-Goals; przeglądanie w pełni anonimowe w MVP.
- **Portal organizatora (self-service)** — Why parked: PRD §Non-Goals; admin jest jedynym źródłem danych w v1.
- **Filtr zakresu dat (FR-008)** — Why parked: nice-to-have w PRD; domyślne sortowanie po dacie wystarczy na MVP.
- **Podgląd audio artystów** — Why parked: PRD §Non-Goals v2.
- **Forum / carpooling** — Why parked: PRD §Non-Goals v3.
- **Monetyzacja / linki afiliacyjne** — Why parked: PRD §Non-Goals post-launch.
- **Wydarzenia poza Polską** — Why parked: PRD §Non-Goals v2+.

## Done

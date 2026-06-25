# Forum Threads – Plan Brief

> Full plan: `context/changes/forum-threads/plan.md`
> Research: `context/changes/forum-threads/research.md`

## What & Why

Budujemy **Forum MVP** dla BassMap PL: zalogowany fan tworzy wątki, komentuje i rozmawia z innymi fanami DnB. To pierwszy społecznościowy slice Partii III i fundament pod późniejsze funkcje: znajomych, ekipy oraz ogłoszenia organizatorów.

## Starting Point

`/forum` istnieje dziś tylko jako placeholder „Wkrótce”. Trasa jest już chroniona logowaniem, link jest w menu fana i admina, a najlepszy gotowy wzorzec techniczny to S-15 `event-comments`: RLS, serwis, API fan/admin, React island i testy.

## Desired End State

Fan widzi `/forum` wyglądające **1:1 z mockupem `bassmap-pl-ui`** (hero „Share the bass!”, sześć działów, karty wątków), z paginacją i formularzem tworzenia wątku. Wątek ma dział, tytuł, treść startową oraz opcjonalne miasto i tagi; na stronie `/forum/[id]` fan dodaje komentarze. Admin usuwa wątki i komentarze bezpośrednio w widoku forum.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Wygląd | 1:1 z mockupem `bassmap-pl-ui`, nagłówek „Share the bass!” | Wprost życzenie użytkownika. | User |
| Działy | 6 działów jak w mockupie | Użytkownik wybrał wariant 1:1 z mockupem zamiast 3 kategorii z roadmapy. | User |
| Pola karty | Autor, liczba odpowiedzi, czas realne; miasto/tagi opcjonalne; wyświetlenia/Hot ukryte | „Wierny wygląd” bez ciężkiej logiki liczników. | User |
| Wyszukiwarka | Pasek wizualny / lokalny filtr po tytule | Wygląd hero bez backendu wyszukiwania. | User |
| Statystyki hero | Pomijamy (bez „6 działów”, liczby wątków, ostatniego posta) | Życzenie użytkownika – bez paska `FORUM_STATS`. | User |
| Podtytuł hero | Pomijamy (zostaje sam nagłówek „Share the bass!”) | Życzenie użytkownika. | User |
| Treść wątku | Tytuł + body pierwszego posta | Wątek bez treści byłby pusty i słaby UX. | Plan |
| Limity | Tytuł 120, body/komentarz 2000, miasto 80, do 3 tagów | 2000 kopiuje komentarze eventów, 120 trzyma listę czytelną. | Plan |
| Autor publiczny | Login profilu, fallback do e-mail label | S-20 wprowadziło publiczną tożsamość `/u/login`. | Plan |
| Usuwanie fana | Fan usuwa własne komentarze, nie wątki | Chroni komentarze innych osób przed skasowaniem całego wątku. | Plan |
| Usuwanie admina | Twarde DELETE inline | Najprostsze i zgodne z MVP. | Plan |
| Lista | Działy + paginacja po 20 | Czytelne na mobile i gotowe na wzrost liczby wątków. | Plan |
| Zgłoszenia treści | Poza MVP | Roadmapa wymaga moderacji admina, nie osobnej kolejki zgłoszeń. | Plan |

## Scope

**In scope:**

- Tabele `forum_threads` i `forum_comments` z RLS.
- Serwisy, schema Zod, typy i API routes.
- `/forum` z wyglądem 1:1 z mockupem (hero „Share the bass!”, 6 działów, karty), paginacją i tworzeniem wątku.
- `/forum/[id]` z treścią wątku, komentarzami i inline moderacją.
- Anonimizacja forum przy usunięciu konta.
- Unit, integration, E2E i legal sync.

**Out of scope:**

- Ekipy i prośby o dołączenie (S-24).
- Ogłoszenia organizatorów (S-25).
- Znajomi i powiadomienia (S-23).
- Zgłaszanie treści forum.
- Osobny panel moderacji forum.
- Statusy `hidden` / `locked`.
- Pełne wyszukiwanie po stronie serwera, licznik wyświetleń, logika „Hot”.
- Pasek statystyk w hero (liczba działów, wątków, ostatni post).
- Podtytuł hero (akapit pod nagłówkiem) – zostaje sam „Share the bass!”.

## Architecture / Approach

Podejście jest SSR-first: strony Astro pobierają dane początkowe, a React islands obsługują formularze, paginację i usuwanie. Wygląd odwzorowuje mockup `bassmap-pl-ui` (hero, działy, karty) na istniejących tokenach stylu i komponentach `Equalizer`/`GenreBadge`. RLS jest ostatnią linią bezpieczeństwa, API ma osobne ścieżki fan/admin, a `author_label` jest zapisywany w tabelach, żeby treści przetrwały usunięcie konta.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Database Schema and Contracts | Tabele, RLS, indeksy, typy | Błąd RLS może dać zbyt szeroki dostęp |
| 2. Services, Validation, and Account Deletion | Logika forum, walidacja, author label, anonimizacja | Fallback autora i delete account muszą być spójne |
| 3. API Routes | Endpointy list/create/comment/delete | Rozdział fan/admin musi pasować do RLS |
| 4. Forum UI (1:1 z mockupem) | `/forum` jak `bassmap-pl-ui`, `/forum/[id]`, komentarze, inline delete | Odwzorowanie układu mockupu i React islands |
| 5. Tests, E2E, and Legal Sync | Testy, build, E2E, dokumenty prawne | UGC wymaga domknięcia prawnego przed archiwum |

**Prerequisites:** S-20 done, S-21 done, issue #42 przeniesione na In Progress.

**Estimated effort:** około 3–5 sesji implementacyjnych, zależnie od testów RLS i E2E.

## Open Risks & Assumptions

- Komentarze wątku nie mają paginacji w MVP; przy dużych wątkach trzeba dodać ją później.
- Twarde usuwanie wątków przez admina jest szybkie, ale nie zostawia historii moderacji.
- Login profilu jako `author_label` zakłada, że publiczny login jest najlepszą tożsamością forum.

## Success Criteria (Summary)

- Fan może utworzyć wątek, otworzyć go, dodać komentarz i usunąć własny komentarz.
- Admin może usunąć dowolny komentarz i cały wątek inline.
- `npm run verify`, `npm run build` i `npm run test:e2e` przechodzą, a dokumenty prawne opisują forum.

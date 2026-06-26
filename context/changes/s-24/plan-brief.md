# Moja ekipa (pełna funkcja) – Plan Brief

> Full plan: `context/changes/s-24/plan.md`  
> Research: `context/changes/s-24/research.md`

## What & Why

Budujemy pełną funkcję „Moja ekipa”: tworzenie ekipy, członkowie, prośby o dołączenie, kontakt po akceptacji oraz rekrutacja przez forum. To domyka trzeci społecznościowy krok po forum (S-22) i znajomych (S-23).

## Starting Point

`/team` już działa, ale pokazuje tylko znajomych z S-23. Forum ma kategorie ekipowe, ale nie ma szablonu wątku, powiązania z ekipą ani próśb o dołączenie.

## Desired End State

Na `/team` są zakładki „Znajomi” i „Moja ekipa”. Fan może utworzyć jedną własną ekipę, zarządzać członkami, obsługiwać prośby, a kandydat może poprosić o dołączenie z widoku ekipy albo z powiązanego wątku forum. Po akceptacji obie strony widzą login i linki social, bez e-maila.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Layout `/team` | Zakładki „Znajomi” i „Moja ekipa” | Chroni istniejące znajomych i dodaje osobny moduł ekipy. | Plan |
| Liczba ekip | Jedna własna ekipa na użytkownika | Najprostszy MVP i mniej konfliktów w UI. | Plan |
| Role | Właściciel i członek | Wystarczy do akceptacji i zarządzania. | Plan |
| Widoczność ekipy | Tylko zalogowani | Nie robimy publicznych stron ekip dla gości. | Plan |
| Lista członków | Tylko członkowie | Chroni prywatność relacji w ekipie. | Plan |
| Kontakt | Login + social linki, bez e-maila | Spójne z publicznym profilem i bezpieczniejsze prywatnościowo. | Research + user decision |
| Odrzucenie prośby | Ciche, bez powiadomienia | Kopiuje wzorzec znajomych z S-23. | Plan |
| Forum | Edytowalny prefill + `crew_id` na wątku | Reużywa forum bez osobnego systemu szablonów. | Research |
| Usunięcie ekipy | Owner może usunąć zawsze | Czyści członków, prośby i odłącza wątki forum. | Plan |

## Scope

**In scope:**

- Tabele `crews`, `crew_members`, `crew_join_requests`.
- Powiadomienia `crew_join_request` i `crew_join_accepted`.
- API i serwis ekip.
- Zakładka „Moja ekipa” na `/team`.
- Prośby z `/team` i forum.
- Edytowalny szablon forum z wyborem ekipy.
- Usuwanie konta, legal sync i testy.

**Out of scope:**

- E-mail jako kontakt.
- Wiele własnych ekip na użytkownika.
- Role adminów ekipy.
- Publiczne strony ekip dla niezalogowanych.
- Osobna tabela szablonów forum.
- Zmiana funkcji znajomych lub polecania eventów.

## Architecture / Approach

Plan kopiuje sprawdzony wzorzec S-23: tabela statusowa, RLS, atomowe RPC z powiadomieniami, serwis `{ data } | { error }`, API fanowskie i Reactowy hook. UI jest modułem obok istniejących znajomych. Forum dostaje tylko lekkie rozszerzenie: nullable `crew_id` oraz prefill formularza.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Database Schema And Domain Types | Model ekip, próśb, powiadomień i link do forum | RLS i CHECK typów powiadomień |
| 2. Services And Fan API | Backend ekip i requestów | Poprawne uprawnienia owner/kandydat |
| 3. Team Page UI | Zakładki i dashboard ekipy na `/team` | Nie zepsuć znajomych S-23 |
| 4. Forum Recruitment Integration | Szablon forum i prośby z wątku | Walidacja właściciela `crew_id` |
| 5. Account Deletion, Legal Sync, And Full Verification | Domknięcie kont, prawne i testy | Prywatność kontaktów i pełny smoke |

**Prerequisites:** S-22 i S-23 są gotowe. Decyzja kontaktowa jest rozstrzygnięta: login + social linki.  
**Estimated effort:** duży slice, około 4–6 sesji implementacyjnych przez 5 faz.

## Open Risks & Assumptions

- RLS musi być przetestowane integracyjnie, bo błąd może ujawnić członków albo prośby nieuprawnionej osobie.
- `notifications.type` ma zamknięty CHECK, więc migracja musi zachować stare typy.
- E2E może wymagać fixture dwóch użytkowników, podobnie jak znajomi S-23.

## Success Criteria (Summary)

- Fan tworzy ekipę, kandydat wysyła prośbę, owner akceptuje, obie strony widzą kontakt bez e-maila.
- Rekrutacyjny wątek forum jest powiązany z ekipą i pozwala wysłać prośbę.
- `/team` nadal poprawnie obsługuje znajomych z S-23.

# Prawa autorskie treści zgłoszenia (S-17) – Plan Brief

> Full plan: `context/changes/event-content-copyright/plan.md`

## What & Why

Przy dodawaniu wydarzenia z okładką użytkownik musi wskazać **skąd pochodzi grafika** i złożyć **właściwe oświadczenie prawne**. System zapisuje te dane w bazie (audyt), żeby BassMap miał dowód compliance przed publikacją. S-12 dodał ogólny checkbox, ale nie rozróżnia źródeł okładki i nie waliduje uploadu okładki – to luka, którą S-17 zamyka **przed S-13** (duplikaty).

**Kolejność:** `S-12` → **`S-17`** → `S-13` → …

## Starting Point

- Formularz fana (`FanEventForm` → `EventForm`) ma upload okładki i jeden ogólny checkbox `acceptContentRights` przy tworzeniu zgłoszenia.
- Upload okładki idzie **osobnym requestem** (`POST /api/fan/events/{id}/cover`) – bez walidacji praw autorskich.
- Tabela `events` ma `cover_path`, `cover_aspect`, `created_by` – **brak** pól audytu źródła okładki.
- Regulamin §5.6–5.7 opisuje ogólny checkbox (S-12) – **§5.6 nie zastępuje** UI S-17; brak art. 29 dla opisów i rozróżnienia oświadczeń wg źródła.

## Art. 29 a rodzaje treści

| Treść   | Art. 29?                 | S-17                               |
| ------- | ------------------------ | ---------------------------------- |
| Okładka | Nie                      | Dropdown + checkbox + audyt DB     |
| Opis    | Fragmenty przy warunkach | Tylko regulamin §5.9 (bez pola UI) |

## Desired End State

Fan i admin przy wgrywaniu okładki wybierają źródło, składają oświadczenie – albo przy braku oświadczenia dostają **dialog**: kontynuować bez grafiki (Tak) albo anulować wysyłkę (Nie). W bazie są zapisane źródło, rodzaj oświadczenia i timestamp. Przy tworzeniu zgłoszenia fana zapisywany jest też czas ogólnej zgody na opis. Admin w moderacji widzi skąd pochodzi okładka. Regulamin i polityka opisują nowe cele przetwarzania i art. 29 dla opisów tekstowych.

## Key Decisions Made

| Decision                  | Choice                            | Why (1 sentence)                                                       | Source |
| ------------------------- | --------------------------------- | ---------------------------------------------------------------------- | ------ |
| Model zgody               | Opis zawsze + okładka gdy plik    | Spełnia FR-025 bez rezygnacji z audytu opisu z S-12                    | Plan   |
| Punkt walidacji okładki   | API upload cover                  | Naprawia lukę dwuetapowego flow bez przepisywania architektury uploadu | Plan   |
| Formularz admina          | Fan + admin                       | Roadmapa: open question (domyślnie fan-only); **planowanie: oba**      | Plan   |
| Art. 29 w UI              | Tylko dokumenty prawne            | Minimum UI; właściciel nie chce podpowiedzi w formularzu               | Plan   |
| Widok moderacji           | Źródło + data oświadczenia        | Moderator ma kontekst przed publikacją                                 | Plan   |
| Retencja audytu           | Z rekordem wydarzenia             | Prosta reguła spójna z §4 polityki                                     | Plan   |
| Brak oświadczenia okładki | Dialog Tak/Nie                    | Tak = zgłoszenie bez okładki; Nie = anulowanie wysyłki                 | Plan   |
| Tekst regulaminu          | §5.6–5.9 zaakceptowane 2026-06-15 | Pełny projekt w planie faza 4; zalecany przegląd prawnika przed prod   | Plan   |

## Scope

**In scope:**

- Migracja DB: kolumny audytu okładki + timestamp zgody na opis
- Moduł `cover-rights` (enum, etykiety PL, walidacja)
- Walidacja i zapis w API cover (fan + admin) oraz timestamp opisu przy fan create
- UI: dropdown źródła + warunkowe checkboxy + **AlertDialog** „kontynuować bez grafiki?” (fan + admin)
- Widok moderacji: źródło okładki i data oświadczenia
- Aktualizacja regulaminu (§5.6–5.9: okładki, audyt, art. 29, **informacyjne** ostrzeżenie o odpowiedzialności karnej) i polityki (§2.2, §4) + `LEGAL_UPDATED_AT`
- Testy jednostkowe API i walidacji

**Out of scope:**

- Wykrywanie duplikatów (S-13), sugestie/komentarze/usuwanie konta
- Osobny checkbox cytatu przy polu opisu
- Opcja „Inne” w dropdown źródła
- Retencja audytu z osobnym cronem / okresem lat
- Sync `BassMap_PL_dokumenty_prawne.docx` (poza repo – ręcznie u właściciela przy archive)

## Architecture / Approach

Nowe kolumny na `events` przechowują audyt. Moduł `src/lib/legal/cover-rights.ts` centralizuje enum źródeł, mapowanie źródło → rodzaj oświadczenia (`creator_consent` vs `own_copyright`) i walidację. Frontend wysyła `coverSource` + potwierdzenie oświadczenia w **FormData** uploadu okładki; oba endpointy cover (fan/admin) walidują i zapisują audyt razem z `cover_path`. Fan create nadal wymaga `acceptContentRights` i ustawia `description_rights_accepted_at`. Regulamin rozszerza §5 o rozróżnienie oświadczeń i art. 29; polityka opisuje nowe dane w §2.2.

## Phases at a Glance

| Phase                | What it delivers                                     | Key risk                                                   |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| 1. Schema & typy     | Kolumny audytu + mapper + moduł cover-rights         | Constraint cover_path ↔ audyt musi być spójny              |
| 2. API               | Walidacja upload cover + timestamp opisu przy create | FormData fan vs admin – dwa endpointy do zsynchronizowania |
| 3. Formularze        | Dropdown + warunkowe checkboxy (fan + admin)         | Duży `EventForm.tsx` – izolacja sekcji okładki             |
| 4. Legal + moderacja | Regulamin/polityka + kolumna w tabeli admina         | Tekst prawny wymaga review właściciela przed deployem      |
| 5. Testy             | Unit testy + lint/build                              | Brak test runnera integracyjnego dla cover upload          |

**Prerequisites:** S-12 archived (2026-06-15); Supabase do migracji; **GitHub issue S-17** (utworzyć na start implementacji – docelowo **#29**).

**Estimated effort:** ~2–3 sesje implementacji w 5 fazach (pojedynczy developer / agent).

## Open Risks & Assumptions

- Projekt §5.6–5.9 i polityki **zaakceptowany przez właściciela** (2026-06-15) – nadal zalecany krótki przegląd prawnika; plan nie zastępuje porady prawnej.
- Istniejące pending events z okładką sprzed S-17 (jeśli jakieś w prod) będą miały NULL audytu – akceptowalne; nowe uploady wymagają pól.
- Admin create bez okładki nie wymaga pól cover-rights – zgodnie z FR-025.

## Success Criteria (Summary)

- Fan/admin nie wgrywa okładki bez wyboru źródła i zaznaczenia właściwego oświadczenia.
- W bazie widać źródło okładki, rodzaj oświadczenia i timestamp dla każdej okładki wgranej po wdrożeniu.
- Regulamin i polityka opisują nowe przetwarzanie; admin widzi źródło okładki przy moderacji.

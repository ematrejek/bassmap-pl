# «Idę» i «Interesuję się» (S-19) — Plan Brief

> Full plan: `context/changes/event-attendance/plan.md`
> Research: `context/changes/event-attendance/research.md`

## What & Why

Fani DnB chcą oznaczać, na które imprezy **idą** lub które **ich interesują** – i widzieć, ilu innych też. To north star Partii III po kafelkach S-18: angażowanie bez pełnego profilu społecznościowego (S-20+). Slice podłącza placeholdery przygotowane w S-12 i S-18 do prawdziwej bazy i API.

## Starting Point

W kodzie są puste sekcje «Idę» / «Obserwuję» w Moje eventy, skrót «Idę» na profilu i licznik «0 Idzie» na kafelku listy. Brak tabeli, API i przycisków na stronie wydarzenia. Wzorzec implementacji: komentarze (S-15).

## Desired End State

Zalogowany fan klika «Idę» lub «Interesuję się» na nadchodzącym evencie; wszyscy widzą dokładne liczniki; event pojawia się w odpowiedniej sekcji Moje eventy i w skrócie na profilu. Copy «Obserwuję» zostaje zamienione na «Interesuję się».

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Liczniki | Dokładna liczba | Najprostsze MVP; zaokrąglenie można dodać później przy skali | Plan |
| Kafelek listy | Tylko «Idzie» | Zgodnie z designem S-18 – bez «Interesuję się» na kafelku | Research |
| Mutacje RSVP | Tylko nadchodzące `published` | Nie ma sensu „iść” na przeszłą imprezę | Plan |
| Odczyt liczników | Wszystkie `published` | Historyczny social proof na archiwalnych stronach | Plan |
| Listy Moje eventy | Nadchodzące, sort `starts_at` | Praktyczna lista „na co idę wkrótce” | Plan |
| Usuwanie konta | `ON DELETE CASCADE` na `user_id` | Brak publicznej listy uczestników – wiersze znikają z liczników | Research |
| API | `GET` / `PUT` / `DELETE` na `/api/events/[id]/attendance` | RESTful, wzorzec jak komentarze | Research |
| Toggle | Ponowne kliknięcie aktywnego = rezygnacja | Standardowy UX przełącznika | Plan |
| Copy / anchor | «Interesuję się», `#interesuje-sie` | Zgodność z roadmapą i shaping | Research |
| Legal | Polityka §2.9 + `LEGAL_UPDATED_AT` | Nowe przetwarzanie danych o udziale w eventach | Plan |

## Scope

**In scope:** tabela `event_attendance`, serwis, API, island na `/events/[id]`, liczniki na kafelkach listy, sekcje Moje eventy i profil, rename copy, testy unit + RLS, polityka prywatności.

**Out of scope:** zaokrąglone liczniki, lista imion uczestników, powiadomienia, edycja profilu (S-20), RSVP na kafelku listy.

## Architecture / Approach

```
[event_attendance DB + RLS]
        ↓
event-attendance.ts (serwis)
        ↓
/api/events/[id]/attendance (GET public, PUT/DELETE auth)
        ↓
EventAttendanceSection (React) ← SSR prefetch na [id].astro
        ↓
MyEventsPage / ProfileSection / EventDiscoveryCard (dane z SSR lub batch counts)
```

Wzorzec identyczny z `event_comments`: published parent, jawne filtry w serwisie, gość read-only, fan write przez API.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Schema, typy, serwis | Tabela + `event-attendance.ts` | Błędne RLS – testy integracji w fazie 2 |
| 2. API i testy | Trasa attendance + unit/RLS | Eligibility upcoming vs published |
| 3. UI | Przyciski, listy, kafelki, copy | N+1 na countach – batch w `events.astro` |
| 4. Legal | Polityka §2.9 | Pominięcie `LEGAL_UPDATED_AT` |

**Prerequisites:** S-18 done; lokalna Supabase do testów integracji.
**Estimated effort:** ~2–3 sesje implementacji w 4 fazach.

## Open Risks & Assumptions

- Deploy migracji na produkcję musi być przed kodem API (jak przy S-16).
- Admin może oznaczać RSVP jak zwykły użytkownik (brak blokady jak w fan change-suggestions).
- Przy wzroście listy eventów batch countów może wymagać RPC – OK na skali MVP.

## Success Criteria (Summary)

- Fan oznacza «Idę» / «Interesuję się» i widzi event w Moje eventy oraz na profilu.
- Gość i wszyscy widzą dokładne liczniki na stronie eventu i «Idzie» na kafelku listy.
- `npm run verify` przechodzi; polityka prywatności opisuje RSVP.

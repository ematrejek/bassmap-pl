<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: «Idę» i «Interesuję się» (S-19)

- **Plan**: context/changes/event-attendance/plan.md
- **Scope**: All phases (1–4)
- **Date**: 2026-06-23
- **Verdict**: APPROVED (post-triage)
- **Findings**: 0 critical, 5 warnings, 3 observations – all triaged

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Findings

### F1 – RSVP na kafelkach listy `/events` poza planem

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH – architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: `src/components/discovery/EventDiscoveryCard.tsx:70-92`
- **Detail**: Plan (Desired End State pkt 4, faza 3) przewiduje na kafelku odkrywania **tylko licznik «Idzie»**; RSVP ma być na stronie szczegółów (`EventAttendanceSection`). Implementacja dodała pełne przyciski «Idę»/«Interesuję się» na kafelkach (`EventRsvpButtons`, `useEventAttendance`, `getUserAttendanceByEventIds`, `isLoggedIn` w `DiscoveryShell`). Funkcjonalnie spójne z UX, ale to rozszerzenie zakresu niewymienione w planie.
- **Fix A ⭐ Recommended**: Zaakceptować rozszerzenie i zaktualizować plan (Desired End State + faza 3) jako addendum
  - Strength: Zachowuje już zaimplementowany UX; plan pozostaje źródłem prawdy.
  - Tradeoff: Plan staje się „ruchomym celem”; wymaga aktualizacji testów/docs.
  - Confidence: HIGH – zmiana jest spójna technicznie i respektuje guardy mutacji.
  - Blind spot: Stakeholderzy, którzy zatwierdzili oryginalny zakres, nie zostali powiadomieni.
- **Fix B**: Usunąć RSVP z `EventDiscoveryCard`; zostawić tylko licznik «Idzie»
  - Strength: Ścisła zgodność z planem S-18/S-19.
  - Tradeoff: Utrata już zbudowanego UX; dodatkowy PR.
  - Confidence: MEDIUM – zależy od preferencji produktowych.
  - Blind spot: Nie sprawdzono, czy użytkownicy już korzystają z RSVP na liście.
- **Decision**: FIXED via Fix A – plan zaktualizowany (Desired End State pkt 4 + faza 3 §3)

### F2 – Zmiany rejestracji (signup) w tym samym branchu

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: `src/components/auth/SignUpForm.tsx`, `src/pages/api/auth/signup.ts`, `src/pages/auth/signup.astro`
- **Detail**: Polonizacja formularza rejestracji, walidacja `confirmPassword` po stronie serwera i zamiana inline HTML na `SignUpForm` React island – **nie w planie event-attendance**. Commit `0b9d71b` (faza 3) miesza niepowiązane zmiany z RSVP UI.
- **Fix A ⭐ Recommended**: Wydzielić signup do osobnego commita/PR lub osobnego change-id w planie
  - Strength: Czysta historia i łatwiejszy review per feature.
  - Tradeoff: Wymaga cherry-pick lub revert + osobny PR.
  - Confidence: HIGH – zmiany są sensowne, ale nie należą do S-19.
  - Blind spot: Nie wiadomo, czy signup był celowo „przy okazji”.
- **Fix B**: Zostawić w tym PR i dopisać notatkę w `change.md`
  - Strength: Zero dodatkowej pracy.
  - Tradeoff: Rozmywa granice slice'a roadmapy.
  - Confidence: MEDIUM.
  - Blind spot: Reviewerzy mogą przeoczyć zmiany auth.
- **Decision**: FIXED via Fix B – notatka w `change.md`

### F3 – Brak komunikatu błędu RSVP na kafelku odkrywania

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/components/discovery/EventDiscoveryCard.tsx:31-36`
- **Detail**: `useEventAttendance` zwraca `error`, ale `EventDiscoveryCard` go nie renderuje. `EventAttendanceSection` pokazuje `ServerError` (linia 78). Przy błędzie API kliknięcie RSVP na liście daje brak informacji zwrotnej.
- **Fix**: Destrukturyzuj `error` z hooka i pokaż `<ServerError message={error} />` pod przyciskami RSVP (jak w `EventAttendanceSection.tsx:78`).
- **Decision**: FIXED

### F4 – Cichy błąd `getUserAttendanceByEventIds` na liście eventów

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/pages/events.astro:29-33, 48-55`
- **Detail**: `userAttendanceResult.error` jest ignorowany – nie trafia do `listError`. Przy awarii zapytania lista renderuje się bez statusu użytkownika, bez komunikatu (w przeciwieństwie do `goingCountsError`, który jest w `listError`).
- **Fix**: Dodaj `userAttendanceResult.error` do tablicy budującej `listError`, analogicznie do `goingCountsError`.
- **Decision**: FIXED

### F5 – Cichy błąd listy «Idę» na profilu

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/pages/profile.astro:20-21`
- **Detail**: `goingResult.error` jest pomijany – profil pokazuje pustą sekcję «Idę» zamiast błędu. Niespójne z `/my-events/index.astro`, gdzie `attendanceError` jest wyświetlany.
- **Fix**: Obsłuż błąd `goingResult` (banner jak na `/my-events`) lub scal z istniejącym wzorcem błędów strony.
- **Decision**: FIXED

### F6 – `getAttendanceSummary` pobiera wszystkie wiersze zamiast agregacji SQL

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/lib/services/event-attendance.ts:30-52`
- **Detail**: Funkcja pobiera wszystkie wiersze `event_attendance` dla eventu i liczy w JS. Przy dużej liczbie RSVP rośnie transfer i czas odpowiedzi (GET na szczególe + po każdym PUT/DELETE). Akceptowalne na MVP (<100 RSVP/event).
- **Fix**: Na skalę poza MVP: agregacja w SQL (`COUNT` + `FILTER`) lub cache liczników.
- **Decision**: FIXED + ACCEPTED-AS-RULE: RSVP count aggregation at scale

### F7 – Manual 4.3 niezaznaczony mimo kompletnej implementacji

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/changes/event-attendance/plan.md` (Progress Phase 4)
- **Detail**: Checkbox `4.3 Polityka §2.9 i LEGAL_UPDATED_AT poprawne` pozostaje `[ ]`. Kod zawiera §2.9 (linie 168–183 `privacy-policy.astro`), retencję w §4 (linie 242–243) i `LEGAL_UPDATED_AT = "23 czerwca 2026 r."`. Plan nie wymaga słowa „CASCADE” w copy – §4 mówi o usunięciu wpisów przy usunięciu konta.
- **Fix**: Po ręcznym QA zaznacz `4.3` w Progress planu.
- **Decision**: FIXED

### F8 – Brak testów API 400 (UUID, body)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `tests/unit/event-attendance-api.test.ts`
- **Detail**: Testing Strategy wspomina 400; faza 2 kontrakt ich nie wymaga, ale `event-comments-api.test.ts` ma podobne scenariusze. Obecne 8 testów pokrywa happy path i 401/404.
- **Fix**: Uzupełnić testy 400 (zły UUID, zły status) wzorując się na `event-comments-api.test.ts`.
- **Decision**: FIXED

<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Forum Threads (Phases 2–4)

- **Plan**: context/changes/forum-threads/plan.md
- **Scope**: Phases 2–4 of 5
- **Date**: 2026-06-24
- **Commits**: 959e7f5 (p2), 2948607 (p3), 73a76a8 (p4)
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 5 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Findings

### F1 – GET komentarzy nie zwraca 404 dla nieistniejącego wątku

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality / Pattern Consistency
- **Location**: src/pages/api/forum/threads/[id]/comments.ts:26-42
- **Detail**: `GET` waliduje UUID, ale nie sprawdza istnienia wątku (`getForumThreadById`). Dla poprawnego UUID nieistniejącego wątku zwraca `200` + `[]`. Wzorzec event comments wymaga `getPublishedEventById` → 404.
- **Fix**: Przed `listForumComments` wywołać `getForumThreadById` i zwrócić 404 gdy brak wątku (jak w `POST` tego samego pliku).
- **Decision**: PENDING

### F2 – Lista `/forum` ograniczona do 200 najnowszych wątków globalnie

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence / Safety & Quality
- **Location**: src/pages/forum.astro:15
- **Detail**: SSR ładuje `listForumThreads({ limit: 200 })` globalnie, a nie paginację 20/strona z API ani osobne zapytania per dział. Starsze wątki poza top-200 nie pojawią się na liście; lokalne wyszukiwanie też działa tylko na tej próbce.
- **Fix A ⭐ Recommended**: Zostawić na MVP z komentarzem w kodzie + wpis w planie; w Fazie 5 dodać paginację per dział lub podłączenie do API.
  - Strength: Nie blokuje zamknięcia slicu; wolumen na starcie będzie mały.
  - Tradeoff: Przy >200 wątkach lista będzie niepełna.
  - Confidence: HIGH – plan sam dopuszcza uproszczenia MVP.
  - Blind spot: Nie wiemy, ile wątków pojawi się w pierwszym miesiącu.
- **Fix B**: Od razu podłączyć paginację API (20/strona) w `ForumView`.
  - Strength: Zgodność z kontraktem API.
  - Tradeoff: Więcej pracy UI (fetch per dział/strona).
  - Confidence: MEDIUM.
  - Blind spot: Więcej round-tripów przy pierwszym wejściu.
- **Decision**: PENDING

### F3 – Błąd ładowania wątków na `/forum` jest cicho ignorowany

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Reliability
- **Location**: src/pages/forum.astro:15-16
- **Detail**: Gdy `listForumThreads` zwraca `{ error }`, strona pokazuje puste forum zamiast komunikatu o błędzie.
- **Fix**: Przekazać flagę błędu do `ForumView` i pokazać banner (jak `ServerErrorBanner` w `ForumView`).
- **Decision**: PENDING

### F4 – Admin usuwa wątek bez potwierdzenia

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Data safety
- **Location**: src/components/forum/ForumView.tsx:55-71, ThreadCard.tsx:72-74
- **Detail**: Usunięcie wątku przez admina jest natychmiastowe (bez dialogu). Komentarze spadają przez CASCADE. Komentarze mają modal potwierdzenia, wątki nie.
- **Fix**: Dodać modal potwierdzenia (plain-div jak w `ForumCommentsSection`) przed `DELETE /api/admin/forum-threads/[id]`.
- **Decision**: PENDING

### F5 – Kotwice działów używają `#dzial-szukam-ekipy` zamiast `#szukam_ekipy`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/forum/ForumView.tsx:16-17
- **Detail**: Plan mówi o pigułkach kotwiczących do `#slug` (wartość kategorii). Implementacja używa prefiksu `dzial-` i zamienia `_` na `-`.
- **Fix**: Zmienić `sectionAnchorId` na sam `category` (np. `id="szukam_ekipy"`, `href="#szukam_ekipy"`).
- **Decision**: PENDING

### F6 – Formularz tworzenia nie waliduje po stronie klienta przez Zod

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/forum/ForumCreateThreadForm.tsx:48-64
- **Detail**: Plan wymaga walidacji klienta zgodnej ze schematem Zod. Formularz wysyła dane bezpośrednio do API bez `parseCreateForumThreadInput` – błędy pojawiają się dopiero po odpowiedzi serwera.
- **Fix**: Przed `fetch` wywołać `parseCreateForumThreadInput` i pokazać komunikat z `parsed.error`.
- **Decision**: PENDING

### F7 – `getForumCommentCounts` liczy w JS (wzorzec RSVP)

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW – akceptowalne na MVP
- **Dimension**: Performance
- **Location**: src/lib/services/forum-comments.ts:46-56
- **Detail**: Pobiera wszystkie wiersze `thread_id` i liczy w pamięci. Ten sam wzorzec co RSVP w `lessons.md`. Przy dużej liczbie komentarzy może być wolno lub zaniżone przez limit PostgREST.
- **Fix**: Na razie OK; przy skali dodać agregację SQL lub denormalizowany licznik.
- **Decision**: PENDING

### F8 – `ForumHero` / `ForumBoard` scalone w `ForumView`

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW – struktura plików, nie zachowanie
- **Dimension**: Plan Adherence
- **Location**: src/components/forum/ForumView.tsx
- **Detail**: Plan wymienia osobne pliki `ForumHero` i `ForumBoard`. Zachowanie (hero, 6 działów, siatka kart) jest zaimplementowane w jednym komponencie.
- **Fix**: Opcjonalnie wydzielić pliki; nie blokuje MVP.
- **Decision**: PENDING

## Success criteria check

### Automated (phases 2–4)

| Command | Result |
|---------|--------|
| `npm test -- tests/unit/forum-schema.test.ts` | PASS (11) |
| `npm test -- tests/unit/account-deletion-service.test.ts` | PASS (4) |
| `npm test -- tests/unit/forum-api.test.ts` | PASS (17) |
| `npm test -- tests/unit/forum-view.test.tsx` | PASS (6) |
| `npm run check` | PASS (0 errors) |
| `npm run lint` | PASS (2 pre-existing no-console warnings) |

### Manual

| Item | Status | Note |
|------|--------|------|
| 2.4 Author label (profile/fallback) | [x] | Potwierdzone testami jednostkowymi, nie ręcznie |
| 2.5 Account deletion anonymization | [x] | Potwierdzone testami jednostkowymi, nie ręcznie |
| 3.4 API auth/delete matrix | [x] | Potwierdzone 17 testami API |
| 4.4 UI 1:1 z mockupem | [ ] | Oczekuje przeglądarki |
| 4.5 Create thread → detail | [ ] | Oczekuje przeglądarki |
| 4.6 Admin/fan delete visibility | [ ] | Oczekuje przeglądarki |

## Positive confirmations

- Auth guards (`requireAuth`, `requireAdmin`) na wszystkich endpointach forum.
- `author_id` ustawiane z sesji, nie z body – zgodne z RLS.
- Brak XSS (`dangerouslySetInnerHTML` / `set:html`).
- Anonimizacja forum przy usuwaniu konta (treść zostaje, autor → „Usunięty użytkownik”).
- `ForumView` montowany przez `client:only="react"` (zgodnie z lekcją Radix).
- Scope guardrails respektowane: brak stats bar, subtitle, views/Hot, server search.

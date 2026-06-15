<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Strefa zalogowanego fana (fan-account-zone)

- **Plan**: `context/changes/fan-account-zone/plan.md`
- **Scope**: Fazy 1–5 (S-12)
- **Date**: 2026-06-15
- **Commits**: `98a3847` (implementacja), `4da82a1` (fix testów), merge PR [#29](https://github.com/ematrejek/bassmap-pl/pull/29)
- **Verdict**: **APPROVED** – przed archive: manual QA + potwierdzenie `db push` remote
- **Findings**: 0 critical · 0 warnings · 5 observations (decyzje produktowe: 2026-06-15)

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS ✅ (F1–F2 zaakceptowane jako docelowe MVP) |
| Scope Discipline | PASS ✅ |
| Safety & Quality | PASS ✅ |
| Architecture | PASS ✅ |
| Pattern Consistency | PASS ✅ |
| Success Criteria | WARNING ⚠️ (manual QA + migracja remote) |

## Automated Verification

| Command | Result |
|---------|--------|
| `npm run lint` | ⚠️ czerwony lokalnie (CRLF / Prettier na Windows) – CI PR #29 **success** |
| `npm run build` | ✅ PASS (lokalnie) |
| `npm test` | ⚠️ 5 timeoutów integracyjnych lokalnie (5000 ms); testy jednostkowe fana ✅; CI PR #29 **success** |
| Deploy produkcyjny (merge #29) | ✅ success — run `27573245221` |

## Success Criteria (plan)

| Kryterium | Status |
|-----------|--------|
| Migracja `created_by` + RLS fan INSERT/SELECT | ✅ MATCH (`20260616120000_fan_event_submissions.sql`) |
| Serwis: `createFanSubmittedEvent`, `listEventsByCreator`, `setEventStatus` | ✅ MATCH |
| `POST /api/fan/events` + `requireAuth`, admin → 403 | ✅ MATCH |
| `PATCH/POST /api/admin/events/[id]/status` (pending → published/rejected) | ✅ MATCH |
| Stałe tras + middleware + redirect `/dashboard` → `/profile` 301 | ✅ MATCH |
| Strony: `/profile`, `/my-events`, `/my-events/new`, `/team`, `/forum` | ✅ MATCH |
| AppMenu: `fanLinks` tylko `!isAdmin`; admin bez sekcji fana | ✅ MATCH (admin ma dodatkowo Forum – patrz F5) |
| Admin moderacja: Opublikuj / Odrzuć | ✅ MATCH (`EventModerationActions`) |
| Współdzielone `status-labels.ts` | ✅ MATCH |
| Reuse `EventForm` (`variant="fan"`) | ✅ MATCH |
| `auth-mutation-deny.test.ts` bez zmian (deny published) | ✅ MATCH |
| `fan-event-submit.test.ts` (allow pending) | ✅ MATCH (1 test flaky lokalnie) |
| Fan upload okładki przy submit | ✅ ACCEPTED (F1 — rozszerzenie MVP) |
| Profil fana (rozbudowany UI) | ✅ ACCEPTED (F2 — docelowy UX) |
| Migracja na remote Supabase | ⏳ PENDING (plan 1.4) |
| Weryfikacja manualna (browser, publish flow) | ⏳ PENDING (plan 2.4, 3.4, 4.4, 5.3) |

## Findings

### F1 — Upload okładki przez fana (poza scope planu)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline / Plan Adherence
- **Location**: `src/components/fan/FanEventForm.tsx:15`, `src/pages/api/fan/events/[id]/cover.ts`, `EventForm.tsx` (`coverUploadUrlFor` fan)
- **Detail**: Plan i sekcja „What We're NOT Doing” wyraźnie wykluczają upload okładki przez fana w tym slice. Implementacja dodaje pełny endpoint cover + `FanEventForm` z `showCoverUpload={true}` (nadpisuje domyślne `variant !== "fan"`). Upload idzie przez **service role** (`SUPABASE_SERVICE_ROLE_KEY`) z walidacją `createdBy` + `status === pending` — bezpieczne, ale wymaga sekretu na prod i rozszerza powierzchnię API poza plan.
- **Fix**: (A) Zaakceptować jako świadome rozszerzenie MVP i zaktualizować plan/archive; **lub** (B) ustawić `showCoverUpload={false}` / usunąć fan cover API, zgodnie z planem.
- **Decision**: **ACCEPTED** (2026-06-15) — świadome rozszerzenie MVP; okładka fana zostaje

### F2 — Profil fana: bogatszy UI vs minimalny MVP z planu

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/components/fan/ProfileSection.tsx`, `src/pages/profile.astro`
- **Detail**: Plan zakładał prosty profil: email, krótki opis strefy konta, linki do Moje eventy / Dodaj wydarzenie, Wyloguj. Kod dostarcza rozbudowany mockup (avatar, social „Wkrótce”, podgatunki, sekcja «Idę») — prawdopodobnie z mockupu `bassmap-pl-ui`. Brak jawnego emaila na stronie i przycisku Wyloguj (wylogowanie tylko w menu). Funkcjonalnie slice działa; to drift wizualny/scope względem planu tekstowego.
- **Fix**: Zaakceptować jako docelowy UX profilu (Partia II) **lub** uprościć do planu MVP; opcjonalnie dodać email + CTA „Dodaj wydarzenie” na `/profile`.
- **Decision**: **ACCEPTED** (2026-06-15) — docelowy UX profilu (Partia II)

### F3 — Sekcje «Idę» / «Obserwuję» na `/my-events`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Scope Discipline
- **Location**: `src/components/fan/MyEventsPage.tsx`
- **Detail**: Plan przewidywał listę własnych zgłoszeń (`FanEventsTable`). Implementacja dodaje puste placeholdery RSVP («Idę», «Obserwuję») przed sekcją «Dodaję» — sensowne pod przyszłe slice’y, nie psuje obecnego flow.
- **Fix**: Brak wymaganego fixu — udokumentować w archive jako forward-looking placeholder.
- **Decision**: ACCEPTED

### F4 — Email zgłaszającego w panelu admina (pozytywny drift)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Location**: `src/lib/auth/submitter-profile.ts`, `src/pages/admin/index.astro`
- **Detail**: Plan-review (#10) akceptował brak email zgłaszającego w MVP. Implementacja dodaje `resolveSubmitterProfiles` (service role → `auth.admin.getUserById`) i sekcję „Do moderacji” z kolumną Zgłaszający — lepsze UX moderacji.
- **Fix**: Brak — wartościowe rozszerzenie; w archive odnotować jako shipped beyond MVP.
- **Decision**: ACCEPTED

### F5 — Forum w menu admina

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Location**: `src/components/shell/AppMenu.tsx` (`adminLinks`), `src/pages/forum.astro`
- **Detail**: Plan: admin widzi navLinks publiczne + Panel admina + Wyloguj (bez sekcji fana). Kod dodaje adminowi link Forum z copy moderacyjnym na stronie `/forum`. Spójne z przyszłą moderacją forum; drobny drift względem literalnego planu menu.
- **Fix**: Opcjonalnie usunąć Forum z `adminLinks` jeśli ma być tylko dla fanów.
- **Decision**: **ACCEPTED** (2026-06-15) — Forum w menu admina zostaje

### F6 — Migracja remote + manual QA

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM
- **Dimension**: Success Criteria
- **Location**: plan Progress 1.4, 2.4, 3.4, 4.4, 5.3
- **Detail**: Wszystkie automated checkboxy w planie są `[x]`, ale manualne (remote `db push`, przeglądarka: submit → moderacja → discovery, menu S-12) nadal `[ ]`. Deploy prod przeszedł — migracja mogła być już wypchnięta; wymaga potwierdzenia właściciela produktu.
- **Fix**: `npx supabase db push` na remote jeśli jeszcze nie; manual QA scenariusz z planu 5.3.
- **Decision**: PENDING

### F7 — Flaki timeoutów testów integracyjnych (lokalnie)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Safety & Quality
- **Location**: `tests/integration/*.test.ts` (5000 ms default)
- **Detail**: Ten sam wzorzec co w impl-review app-shell (F10). CI na merge #29 zielone; lokalne timeouty nie blokują werdyktu dla tego slice’a.
- **Fix**: Osobny ticket: podnieść `testTimeout` integracji lub seed/cache Supabase.
- **Decision**: **DISMISSED** (2026-06-15) — nie blokuje slice’a; CI zielone; opcjonalny housekeeping (podnieść `testTimeout` integracji)

## Plan Adherence Summary

| Element planu | Werdykt |
|---------------|---------|
| DB migracja + RLS fan pending/own SELECT | MATCH |
| API fan + admin status | MATCH |
| Routing, middleware, dashboard redirect | MATCH |
| Strony fan + placeholdery team/forum | MATCH |
| Menu fan vs admin | MATCH |
| Admin moderacja publish/reject | MATCH |
| Reuse EventForm / status-labels | MATCH |
| Okładka fana przy submit | ACCEPTED (F1) |
| Profil fana | ACCEPTED (F2) |
| `public-roadmap.ts` bez zmian do archive | MATCH (celowo) |

## Następne kroki

1. **Manual QA** — rejestracja → dodaj event → admin publish → widać na `/events`; `/dashboard` → `/profile`.
2. **Potwierdzić `db push`** migracji `20260616120000` na remote.
3. **`/10x-archive fan-account-zone`** po manual QA + zamknięciu issue #24.

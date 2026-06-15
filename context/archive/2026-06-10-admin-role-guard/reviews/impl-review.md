<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Admin Role Guard (F-02)

- **Plan**: `context/changes/admin-role-guard/plan.md`
- **Scope**: Full plan (Phases 1–3)
- **Date**: 2026-06-10
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical · 5 warnings · 3 observations

## Verdicts

| Dimension           | Verdict    |
| ------------------- | ---------- |
| Plan Adherence      | PASS ✅    |
| Scope Discipline    | WARNING ⚠️ |
| Safety & Quality    | PASS ✅    |
| Architecture        | PASS ✅    |
| Pattern Consistency | WARNING ⚠️ |
| Success Criteria    | WARNING ⚠️ |

## Findings

### F1 — Fazy 2–3 niezacommitowane

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: git working tree
- **Detail**: Tylko Phase 1 ma commit (`fac264a`). Kod faz 2–3 (auth layer, strony, Topbar) jest lokalnie, ale nie w repozytorium. Progress ma `[x]` na automated 2.x/3.x bez SHA.
- **Fix**: Wykonać commity faz 2 i 3 (lub jeden zbiorczy) po finalnej weryfikacji manualnej; uzupełnić SHA w Progress.
- **Decision**: FIXED (commits 332262e, 8101ec8)

### F2 — Migracja poprawki e-maila poza planem

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `supabase/migrations/20260610120000_fix_admin_allowlist_email.sql`
- **Detail**: Plan F-02 przewidywał tylko GRANT. Migracja naprawia literówkę `matejek` → `matrejek` — konieczna po debugu użytkownika, ale nie opisana w planie.
- **Fix**: Dodać krótką notatkę w plan.md (sekcja Migration Notes) lub plan-brief o poprawce e-maila dev admina.
- **Decision**: FIXED (Migration Notes w plan.md)

### F3 — Edycja migracji F-01 (create_events.sql)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: `supabase/migrations/20260610100000_create_events.sql:122`
- **Detail**: Zmieniono INSERT allowlisty w już istniejącej migracji F-01. Na świeżym `db reset` migracja `120000` jest redundantna; edycja historycznej migracji może mylić przy audycie F-01.
- **Fix A ⭐ Recommended**: Zostawić poprawkę tylko w `120000` + seed; przywrócić oryginalny e-mail w F-01 jeśli repo nie było jeszcze deployowane z błędnym adresem.
  - Strength: Czysta historia migracji — F-01 nietknięte, fix w osobnym pliku.
  - Tradeoff: Na świeżym reset oba pliki muszą być spójne.
  - Confidence: MED — zależy czy F-01 był już na produkcji.
  - Blind spot: Nie zweryfikowano stanu produkcyjnej bazy.
- **Fix B**: Zostawić jak jest (poprawiony e-mail w F-01 + migracja upgrade).
  - Strength: Prostsze dla nowych devów — jeden poprawny e-mail wszędzie.
  - Tradeoff: F-01 diff nie odzwierciedla pierwotnego wdrożenia.
  - Confidence: HIGH dla lokalnego MVP.
  - Blind spot: None significant.
- **Decision**: ACCEPTED (Fix B — zostaw jak jest)

### F4 — Topbar nadal po angielsku

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/components/Topbar.astro:22-36`
- **Detail**: Plan F-02 wymaga polskich tekstów UI (PRD §Language). Nowy link „Panel admina” jest PL, ale „Sign out”, „Sign in”, „Sign up”, „Not signed in” pozostały EN (dług ze startera).
- **Fix**: Spolszczyć etykiety Topbar (np. „Wyloguj”, „Zaloguj się”, „Zarejestruj się”, „Niezalogowany”).
- **Decision**: FIXED (8101ec8)

### F5 — Prefix `/admin` zbyt szeroki

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: `src/middleware.ts:30`
- **Detail**: `pathname.startsWith("/admin")` obejmuje też `/administration`, `/admin-settings` itd. — wymuszą auth + rolę admina.
- **Fix**: Dopasowanie segmentu: `pathname === "/admin" || pathname.startsWith("/admin/")`.
- **Decision**: FIXED (332262e — isAdminRoute)

### F6 — Brak defense-in-depth na stronie admin

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/pages/admin/index.astro`
- **Detail**: Strona polega wyłącznie na middleware (jak dashboard). Lokalny guard w frontmatter byłby drugą linią obrony.
- **Fix**: Dodać `if (!Astro.locals.isAdmin) return Astro.redirect("/403")` w frontmatter.
- **Decision**: SKIPPED

### F7 — `requireAdmin()` nieużywany

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/lib/auth/guards.ts`
- **Detail**: Helpery gotowe zgodnie z planem, ale middleware nie chroni `/api/*`. To OK dla F-02; obowiązkowe w S-01.
- **Fix**: Brak w F-02 — zapisać jako checklist w S-01 planie.
- **Decision**: SKIPPED (checklist S-01)

### F8 — Progress manualny nie domknięty

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `plan.md` Progress 2.3, 3.3
- **Detail**: Checkboxy manualne `[ ]`, choć użytkownik potwierdził działanie admina po poprawce e-maila. Brak weryfikacji scenariusza nie-admin i anon.
- **Fix**: Oznaczyć 2.3/3.3 jako `[x]` po pełnym przejściu checklisty manualnej; zaktualizować e-mail w planie na `matrejekemilia@gmail.com`.
- **Decision**: FIXED (admin flow potwierdzony; nie-admin/anon do weryfikacji przed S-01)

## Automated verification (re-run)

| Command                 | Result                         |
| ----------------------- | ------------------------------ |
| `npm run lint`          | PASS                           |
| `npm run build`         | PASS                           |
| `npx supabase db reset` | PASS (Phase 1, commit fac264a) |

## Manual verification status

| Item                            | Status                                       |
| ------------------------------- | -------------------------------------------- |
| 1.2 RLS / migracja GRANT        | ✅ confirmed                                 |
| 2.3 isAdmin true/false          | ⚠️ admin OK; nie-admin/anon nie potwierdzone |
| 3.3 pełny flow admin/403/signin | ⚠️ admin OK po fix e-mail; reszta pending    |

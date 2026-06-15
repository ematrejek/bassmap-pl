<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Polityka prywatności i Regulamin (legal-pages)

- **Plan**: brak `plan.md` — spec: `context/changes/legal-pages/change.md` + `research.md`
- **Scope**: pełna implementacja S-11 (commity `cf7f5aa`, `2f10754`)
- **Date**: 2026-06-13
- **Verdict**: APPROVED
- **Findings**: 0 critical · 2 warnings · 4 observations

## Verdicts

| Dimension           | Verdict    |
| ------------------- | ---------- |
| Plan Adherence      | PASS ✅    |
| Scope Discipline    | PASS ✅    |
| Safety & Quality    | WARNING ⚠️ |
| Architecture        | PASS ✅    |
| Pattern Consistency | WARNING ⚠️ |
| Success Criteria    | PASS ✅    |

## Success Criteria

| Check                                               | Result                                                      |
| --------------------------------------------------- | ----------------------------------------------------------- |
| CI (lint + build) on `main`                         | ✅ success — run `27474234344`                              |
| Deploy produkcyjny                                  | ✅ success — run `27474234342`                              |
| Manual — strony prawne + stopka + tekst rejestracji | ✅ potwierdzone przez właściciela produktu („gra wszystko”) |

## Findings

### F1 — Resend w polityce bez integracji w kodzie

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `src/pages/polityka-prywatnosci.astro`
- **Detail**: Przy review Resend nie był widoczny w repo — integracja jest po stronie Supabase (SMTP / Resend), skonfigurowana przez właściciela produktu poza kodem aplikacji. Wpis w polityce był poprawny od początku.
- **Fix**: Zachować Resend w polityce; nie usuwać.
- **Decision**: DISMISSED (2026-06-13) — Resend skonfigurowany w Supabase; F1 było fałszywym alarmem

### F2 — Brak jawnego `prerender = false` na stronach auth

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/pages/auth/signup.astro`, `src/pages/auth/signin.astro`
- **Detail**: Strony prawne, index i events mają `export const prerender = false`. Strony auth (w tym zmodyfikowane signup/signin) nie mają jawnej deklaracji. Przy `output: "server"` działają poprawnie, ale łamią konwencję repo (AGENTS.md).
- **Fix**: Dodaj `export const prerender = false` do `signup.astro` i `signin.astro` (oraz opcjonalnie `confirm-email.astro` dla spójności).
- **Decision**: PENDING

### F3 — Browsewrap zamiast checkboxa przy rejestracji

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: `src/components/auth/SignUpLegalNotice.astro:11-16`, brak walidacji w `src/pages/api/auth/signup.ts`
- **Detail**: Research rekomendował clickwrap (checkbox + opcjonalnie backend). `change.md` wymagał browsewrap („Rejestrując się, akceptujesz…”) — implementacja jest zgodna z decyzją produktową. Prawnie słabszy dowód akceptacji regulaminu niż checkbox; warto świadomie zaakceptować lub skonsultować z prawnikiem.
- **Fix**: Brak wymaganego fixu — decyzja produktowa. Opcjonalnie: checkbox + walidacja API w osobnym slice.
- **Decision**: ACCEPTED — decyzja produktowa w change.md

### F4 — Polityka opisuje pola, których formularz jeszcze nie zbiera

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/pages/polityka-prywatnosci.astro:29-30` vs `src/components/auth/SignUpForm.tsx`
- **Detail**: Polityka wspomina login, imię, nazwisko, miasto — obecny signup zbiera tylko email i hasło. Treść z docx jest „przyszłościowa” (Partia II); lepiej szersza niż węższa, ale może mylić użytkownika teraz.
- **Fix**: Doprecyzuj w polityce „opcjonalnie, gdy profil będzie dostępny” albo zsynchronizuj po wdrożeniu profilu fana.
- **Decision**: PENDING

### F5 — Brak stopki na `confirm-email`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `src/pages/auth/confirm-email.astro`
- **Detail**: Signup, signin, index, events i strony prawne mają `SiteFooter`. Potwierdzenie e-mail nie — drobna luka w flow auth (poza scope change.md).
- **Fix**: Dodaj `SiteFooter` do `confirm-email.astro` dla spójności.
- **Decision**: PENDING

### F6 — Treść prawna inline w `.astro` zamiast markdown

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: `src/pages/polityka-prywatnosci.astro`, `src/pages/regulamin.astro`
- **Detail**: Research sugerował `src/content/legal/` jako markdown dla łatwiejszej edycji. Implementacja trzyma pełny tekst w plikach Astro — działa, ale aktualizacja regulaminu wymaga edycji HTML w repo.
- **Fix**: Przenieść treść do markdown w osobnym slice, gdy dokumenty będą często aktualizowane.
- **Decision**: PENDING

## Plan Adherence Summary

| Element                                            | Werdykt                        |
| -------------------------------------------------- | ------------------------------ |
| `/polityka-prywatnosci`, `/regulamin`              | MATCH                          |
| Statyczne czytelne strony (treść z docx)           | MATCH                          |
| `SiteFooter` na stronie głównej, szczegółach, auth | MATCH                          |
| Tekst browsewrap przy rejestracji z linkami        | MATCH                          |
| Brak checkboxa (decyzja w change.md)               | MATCH                          |
| Checkbox + API (research)                          | Celowy DRIFT — outcome wygrywa |

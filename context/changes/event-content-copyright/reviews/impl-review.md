<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Prawa autorskie treści zgłoszenia (S-17)

- **Plan**: context/changes/event-content-copyright/plan.md
- **Scope**: Full plan (phases 1–5)
- **Date**: 2026-06-16
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 6 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | WARNING |
| Pattern Consistency | PASS |
| Success Criteria | FAIL |

## Automated verification

| Command | Result |
|---------|--------|
| `npm run lint` | FAIL – 10 Prettier errors (EventForm.tsx, fan/events/index.ts, terms.astro, privacy-policy.astro) |
| `npm run build` | PASS |
| `npm test` | PASS – 122 tests |

## Findings

### F1 — Brak AlertDialog „kontynuuj bez grafiki?”

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/admin/EventForm.tsx:460–467
- **Detail**: Plan (fazy 3–4) wymaga `AlertDialog` przy submit z plikiem okładki bez kompletnego audytu: **Tak** = wysłanie zgłoszenia bez okładki, **Nie** = anulowanie. Implementacja używa `focusCoverAuditIssue()` + `return` — twarda blokada submitu. Commit `8ba0226` świadomie zamienił dialog na przewijanie do pola; użytkownik musi ręcznie uzupełnić audyt lub kliknąć „Usuń okładkę”.
- **Fix A ⭐ Recommended**: Przywrócić `AlertDialog` zgodnie z planem; ścieżka „Tak” czyści `coverFile` i wywołuje `performSubmit()` bez `uploadCoverFile`.
  - Strength: Zgodność z zaakceptowanym UX i §5.6 regulaminu („wyraźne potwierdzenie w formularzu”).
  - Tradeoff: Więcej kodu UI; commit `8ba0226` trzeba cofnąć częściowo.
  - Confidence: HIGH — plan i copy dialogu są jednoznaczne.
  - Blind spot: Nie zweryfikowano na urządzeniu mobilnym z czytnikiem ekranu.
- **Fix B**: Zostawić obecny UX i zaktualizować plan + §5.6 jako addendum (scroll + „Usuń okładkę” zamiast dialogu).
  - Strength: Zachowuje już wdrożony flow.
  - Tradeoff: Rozjazd z pierwotną decyzją planowania i copy prawnym właściciela.
  - Confidence: MEDIUM — wymaga ponownego sign-off prawnego.
  - Blind spot: Czy użytkownicy faktycznie znajdują „Usuń okładkę” bez dialogu.
- **Decision**: FIXED (Fix A — AlertDialog przywrócony w EventForm.tsx)

### F2 — `npm run lint` nie przechodzi

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: src/components/admin/EventForm.tsx, src/pages/api/fan/events/index.ts, src/pages/terms.astro, src/pages/privacy-policy.astro
- **Detail**: 10 błędów `prettier/prettier` (formatowanie linii). Plan oznacza lint jako nieukończony we wszystkich fazach — stan zgodny z rzeczywistością; CI lint pada.
- **Fix**: Uruchomić `npm run lint:fix` na wskazanych plikach i oznaczyć checkboxy lint w planie.
- **Decision**: FIXED (npm run lint:fix — lint zielony)

### F3 — Skrócony label checkboxa opisu (fan)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/admin/EventForm.tsx:1040–1049
- **Detail**: Plan fazy 4 przewiduje długi tekst o treściach **opisowych**, §5.9 i osobnym oświadczeniu okładki. W kodzie: „Oświadczam, że publikuję zgodnie z zasadami zgłaszania wydarzeń w Regulaminie.” — commit `8ba0226` skrócił copy.
- **Fix**: Przywrócić label z planu (faza 4, punkt 5) z linkiem do `/terms#event-submissions`.
- **Decision**: SKIPPED

### F4 — §5.6 regulaminu: „usunięcie pliku” zamiast „potwierdzenie w formularzu”

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/pages/terms.astro:94–95
- **Detail**: Zaakceptowany projekt prawny (właściciel 2026-06-15): „kontynuować zgłoszenie **bez okładki** po **wyraźnym potwierdzeniu w formularzu**”. Wdrożono: „po **usunięciu pliku graficznego** w formularzu” — spójne z brakiem dialogu (F1), ale rozjazd z zatwierdzonym brzmieniem.
- **Fix A ⭐ Recommended**: Przywrócić brzmienie z planu po wdrożeniu dialogu (F1).
  - Strength: Spójność prawna z UI.
  - Tradeoff: Wymaga F1 lub równoległej decyzji właściciela.
  - Confidence: HIGH.
  - Blind spot: None significant.
- **Fix B**: Zostawić „usunięcie pliku” i uzyskać ponowny sign-off właściciela na zmieniony UX.
  - Strength: Spójność z obecnym formularzem.
  - Tradeoff: Nowa wersja copy prawnego.
  - Confidence: MEDIUM.
  - Blind spot: Czy prawnik widział zmienioną wersję.
- **Decision**: ACCEPTED (Fix B — zostawiono „usunięcie pliku”; dialog F1 nadal działa jako potwierdzenie w formularzu)

### F5 — Admin PUT może ustawić okładkę bez audytu

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/pages/api/admin/events/[id].ts:44–49, src/lib/events/schema.ts:230
- **Detail**: `parseEventUpdate` dopuszcza `coverPath`. `updateEvent` zapisuje ścieżkę bez wymogu `coverSource` / `coverDeclarationKind` / `coverCopyrightDeclaredAt`. Upload przez `/cover` jest poprawny; bezpośredni PUT JSON omija invariant S-17. UI nie używa tej ścieżki, ale API jest otwarte dla admina.
- **Fix**: Zablokować ustawianie `coverPath` w PUT (tylko endpoint cover) albo wymusić komplet audytu gdy `coverPath !== null`.
- **Decision**: FIXED (updateEvent odrzuca nową ścieżkę okładki poza endpointem /cover)

### F6 — Fan cover API omija `updateEvent` (orphan files)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: src/pages/api/fan/events/[id]/cover.ts:125–138
- **Detail**: Admin cover używa `updateEvent` ze sprzątaniem starego pliku w storage. Fan robi raw update przez service role — przy zmianie rozszerzenia (JPG→PNG) stary obiekt może zostać w storage. Duplikacja logiki audytu.
- **Fix**: Wspólny helper `uploadEventCover` w `events.ts` z authz fan/admin, audytem i cleanup storage.
- **Decision**: FIXED (dodano cleanup starego pliku w `fan/events/[id]/cover.ts` przy podmianie okładki; bez pełnego refaktoru na wspólny helper)

### F7 — Postęp w planie nie odzwierciedla stanu implementacji

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/event-content-copyright/plan.md:556–624
- **Detail**: Build i testy oznaczone `[x]`; lint i większość manual QA `[ ]` mimo wdrożenia warstw API/UI/prawo. Sekcja Progress wymaga synchronizacji przed archive.
- **Fix**: Po naprawie F1–F2 zaktualizować checkboxy Progress i manual QA.
- **Decision**: PARTIALLY FIXED — zaktualizowano dowód dla automatycznych kryteriów (lint/test/build przechodzą), natomiast manual QA pozostaje do ręcznej weryfikacji (zgodnie z planem).

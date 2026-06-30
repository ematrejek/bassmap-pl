<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Audyt UI – SEO, SSR discovery, nawigacja

- **Plan**: `context/changes/ui-audit-seo-nav/plan.md`
- **Mode**: Deep
- **Date**: 2026-06-30
- **Verdict**: SOUND (po triage 2026-06-30)
- **Findings**: 1 critical, 4 warnings, 2 observations

## Verdicts

| Dimension             | Verdict    |
| --------------------- | ---------- |
| End-State Alignment   | WARNING ⚠️ |
| Lean Execution        | PASS ✅    |
| Architectural Fitness | WARNING ⚠️ |
| Blind Spots           | WARNING ⚠️ |
| Plan Completeness     | FAIL ❌    |

## Grounding

Grounding: 6/6 istniejących ścieżek ✓ (`events.astro`, `Layout.astro`, `AppShell.astro`, `archive.astro`, `terms.astro`, `site.config.mjs`), 3/3 symbole ✓ (`formatEventDate`, `absoluteUrl`, `MY_EVENTS_NEW_PATH`), brief↔plan ✓ z wyjątkiem błędnej ścieżki `forum/index.astro`.

## Findings

### F1 – Progress Phase 1 nie obejmuje `event-discovery-ssr.test.ts`

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 – Success Criteria vs `## Progress`
- **Detail**: W Phase 1 pod `#### Automated Verification:` są **4** punkty (`npm run check`, `lint:all`, `npm test`, **oraz** „Nowy test: `tests/unit/event-discovery-ssr.test.ts`"). W `## Progress` Phase 1 są tylko **3** checkboxy automated (1.1–1.3); brak osobnego kroku na nowy plik testowy. Konwencja Progress wymaga 1:1 z Success Criteria – `/10x-implement` może pominąć test przy zamykaniu fazy.
- **Fix**: Dodać `- [ ] 1.4 tests/unit/event-discovery-ssr.test.ts przechodzi` w Progress (automated) i przenumerować manual na 1.5–1.6; albo scalić z 1.3 jawnym tekstem „w tym event-discovery-ssr.test.ts" i usunąć czwarty bullet z body fazy – ale wtedy też zsynchronizować oba miejsca.
- **Decision**: FIXED – dodano 1.4 smoke + 1.3 z event-discovery-ssr; manual 1.5–1.6

### F2 – Błędna ścieżka `forum/index.astro` w Fazie 2

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 – „Strony publiczne – props meta"
- **Detail**: Plan wymienia `src/pages/forum/index.astro`. W repo jest **`src/pages/forum.astro`** (+ `forum/[id].astro`). Plik `forum/index.astro` nie istnieje.
- **Fix**: Zamienić na `src/pages/forum.astro` i `src/pages/forum/[id].astro` w liście plików Fazy 2.
- **Decision**: FIXED – `forum.astro` + `forum/[id].astro`

### F3 – Aktualizacja `smoke.spec.ts` za późno (Faza 6 vs Faza 1)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1 (usuwa tekst „Ładowanie…") vs Phase 6 (aktualizacja smoke)
- **Detail**: `smoke.spec.ts:12` sprawdza, że „Ładowanie listy wydarzeń…" znika po hydratacji. Ten tekst jest **tylko** w fallbacku (`events.astro:75`). Po Fazie 1 asercja przejdzie natychmiast (brak tekstu = `toBeHidden` OK), ale **nie weryfikuje** już SEO ani hydratacji do końca fazy 6. Między fazami 1–5 CI daje fałszywe poczucie bezpieczeństwa. Research (`research.md`) już to flaguje; plan nie wiąże tego z zamknięciem Fazy 1.
- **Fix A ⭐ Recommended**: Przenieść aktualizację `smoke.spec.ts` (asercja na nazwę eventu w `page.content()` lub widoczny link) do **Success Criteria Fazy 1** + checkbox w Progress.
  - Strength: Regresja SEO łapana od pierwszej fazy; zgodne z research.
  - Tradeoff: E2E może wymagać seed/fixture eventu już w Fazie 1.
  - Confidence: HIGH – tekst ładowania znika w Fazie 1 niezależnie od Fazy 6.
  - Blind spot: Flaky bez danych w DB – wtedy unit test na helper opisu wystarczy w 1.4.
- **Fix B**: Zostawić w Fazie 6, ale w Fazie 1 dodać tymczasową asercję „Filtruj widoczny" jako jedyny gate hydratacji i zaznaczyć w planie, że smoke SEO jest świadomie odłożony.
  - Strength: Mniejszy scope Fazy 1.
  - Tradeoff: 5 faz bez testu HTML listy.
  - Confidence: MED.
  - Blind spot: Nikt nie uruchomi ręcznie View Source między fazami.
- **Decision**: FIXED via Fix A – smoke HTML w Fazie 1; meta description w Fazie 6

### F4 – `LegalDocumentShell` bez kroku rozszerzenia props meta

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phase 2 – lista plików vs Changes Required
- **Detail**: `terms.astro` i `privacy-policy.astro` używają `LegalDocumentShell`, który owija `<Layout title={title}>` (`LegalDocumentShell.astro:15`) i eksponuje tylko `title` + `pageTitle`. Plan wymienia `LegalDocumentShell` w liście stron do meta, ale **brak** osobnego change itemu: rozszerzyć `Props` o `description?`, `canonicalPath?` (i opcjonalnie `ogImage`) i przekazać do `Layout`. Bez tego implementer musi edytować oba pliki prawne bezpośrednio albo zgadywać.
- **Fix**: W Fazie 2 dodać podpunkt „Rozszerz `LegalDocumentShell.astro` – props meta przekazywane do Layout"; strony prawne przekazują opis/canonical przez shell, nie omijają go.
- **Decision**: FIXED – Phase 2 §5 LegalDocumentShell

### F5 – `AppHeaderLinks` tylko `md+` vs checklist „nagłówek bez JS"

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – real tradeoff; pause to reason through it
- **Dimension**: End-State Alignment
- **Location**: Phase 3 – `AppHeaderLinks` contract vs Desired End State checklist
- **Detail**: Plan ustawia linki SSR jako `hidden md:flex` (tylko desktop). W HTML (View Source) linki **są** dla crawlerów, ale na mobile użytkownik bez JS widzi wyłącznie przycisk „Menu" (disabled fallback) – **nie** widzi Zaloguj / Zgłoś event. Checklist w Desired End State mówi ogólnie „Nagłówek bez JS – linki Zaloguj / Zgłoś event" bez kwalifikacji desktop. Audyt wymagał SSR markup (SEO); mobile UX bez JS pozostaje słabe.
- **Fix A ⭐ Recommended**: Na mobile w SSR pokazać 1–2 skróty tekstowe (np. „Eventy" + „Zaloguj") obok hamburgera **bez** `hidden`; pełna lista zostaje w Sheet.
  - Strength: Spełnia checklist i audyt dla mobile + desktop.
  - Tradeoff: Ciasny nagłówek na małych ekranach.
  - Confidence: HIGH – plan już wspomina „opcjonalnie jeden skrót Eventy" w AppShell, ale nie w contract AppHeaderLinks.
- **Fix B**: Zostawić `md+` only; zaktualizować Desired End State i checklist na „desktop bez JS" i zaakceptować mobile.
  - Strength: Prostszy layout.
  - Tradeoff: Mobile bez JS nadal bez CTA logowania/zgłoszenia.
  - Confidence: HIGH.
  - Blind spot: Użytkownicy PWA/offline na telefonie.
- **Decision**: FIXED via Fix A – mobile skróty Eventy + Zaloguj/Zgłoś widoczne

### F6 – `absoluteUrl()` na `ogImage` musi rozróżniać URL absolutne Supabase

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 2 – Layout contract `ogImage`
- **Detail**: `coverUrl` na `/events/[id]` jest już absolutny (`getEventCoverUrl` → `https://*.supabase.co/...`). `absoluteUrl()` na pełnym URL zwraca ten sam URL (`new URL` ignoruje base). Implementer musi opakować **tylko** ścieżki względne (`/og-default.png`), inaczej ryzyko podwójnego origin przy błędnej implementacji.
- **Fix**: W Phase 2 Contract dopisać: „jeśli `ogImage` zaczyna się od `http`, użyj as-is; inaczej `absoluteUrl(ogImage)`."
- **Decision**: FIXED – contract w Phase 2 Layout

### F7 – Faza 1 krok 4 (`pageDescription`) przed rozszerzeniem Layout

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW – quick decision; fix is obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: Phase 1 krok 4 vs Phase 2 Layout
- **Detail**: Wyliczenie `pageDescription` w `events.astro` bez props `description` w Layout da martwy kod do Fazy 2. Nieszkodliwe, ale mylące przy review PR.
- **Fix**: Przenieść krok 4 do Fazy 2 albo oznaczyć „przygotuj zmienną, podłącz w Fazie 2 w tym samym PR".
- **Decision**: FIXED – przeniesione do Phase 2 §6

## Triage Summary

- **Fixed:** F1, F2, F3 (Fix A), F4, F5 (Fix A), F6, F7 (7)
- **Verdict after fixes:** SOUND – plan gotowy do `/10x-implement ui-audit-seo-nav phase 1`

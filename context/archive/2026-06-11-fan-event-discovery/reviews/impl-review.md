<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Fan Event Discovery (S-02)

- **Plan**: context/changes/fan-event-discovery/plan.md
- **Scope**: Full plan (Phases 1–4)
- **Date**: 2026-06-11
- **Verdict**: APPROVED (post-triage)
- **Findings**: 0 critical, 3 warnings (all fixed), 4 observations (3 fixed, 1 rule)

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Automated Verification

| Command | Result |
|---------|--------|
| `npm run lint` | PASS |
| `npm run build` | PASS |

## Manual Verification

Użytkownik potwierdził ręczne QA w sesji („wszystko śmiga”). Sekcja `## Progress` w planie nadal ma nieodhaczone pozycje Manual — do zsynchronizowania przy archiwizacji.

## Findings

### F1 — Zalogowany admin widzi szkice i przeszłe eventy na stronach fana

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/events.ts:121–161
- **Detail**: `listPublishedEvents` i `getPublishedEventById` polegają wyłącznie na RLS. Dla anonimowych fanów polityka `events_select_public` wystarcza. Zalogowany admin ma dodatkowo `events_select_admin` (wszystkie wiersze) — na `/` i `/events/[id]` może zobaczyć szkice i przeszłe wydarzenia, co łamie kryterium sukcesu planu (fan widzi tylko published + nadchodzące).
- **Fix A ⭐ Recommended**: Dodać jawne filtry fanowskie w serwisie (`.eq('status','published')` + warunek upcoming) w `listPublishedEvents` i `getPublishedEventById`, niezależnie od roli użytkownika.
  - Strength: Jedno źródło prawdy; działa dla każdej sesji; zgodne z intencją planu.
  - Tradeoff: Admin na `/` nie zobaczy szkicu „tak jak w panelu” — to poprawne dla widoku fana.
  - Confidence: HIGH — proste rozszerzenie zapytania Supabase.
  - Blind spot: Trzeba potwierdzić, że `is_upcoming()` da się odwzorować w filtrze PostgREST lub RPC.
- **Fix B**: Na stronach publicznych tworzyć klienta Supabase bez sesji (anon-only).
  - Strength: RLS anon wymusza widok fana bez dodatkowych filtrów w kodzie.
  - Tradeoff: Dwa klienty na request; utrata personalizacji jeśli kiedyś będzie potrzebna.
  - Confidence: MEDIUM — wymaga zmiany w `index.astro` i `events/[id].astro`.
  - Blind spot: Wpływ na middleware i cookies.
- **Decision**: FIXED (Fix A)

### F2 — Link biletowy bez wymuszenia protokołu https

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/events/schema.ts:13–18, src/pages/events/[id].astro:86–94
- **Detail**: `ticketUrlSchema` używa `z.string().url()` bez wymogu `http`/`https`. Wartość `javascript:` w DB (teoretycznie przez SQL) mogłaby być renderowana w `href` na stronie Astro. React w podglądzie jest bardziej restrykcyjny.
- **Fix**: Rozszerzyć `ticketUrlSchema` o `.refine((u) => u.startsWith('http://') || u.startsWith('https://'), …)` i/lub helper `safeExternalUrl()` przed renderem w Astro.
- **Decision**: FIXED

### F3 — Błąd ładowania listy miast jest ignorowany

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/pages/index.astro:14–19
- **Detail**: `listResult` ustawia `listError`, ale `citiesResult.error` jest pomijany — przy awarii zapytania miast dropdown będzie pusty bez komunikatu, podczas gdy lista eventów może działać. Plan wymaga obsługi błędów serwisu (wzorzec admina).
- **Fix**: Dodać `citiesError` i przekazać do `DiscoveryShell` (banner lub scalony komunikat PL).
- **Decision**: FIXED

### F4 — Hydratacja mapy Leaflet inna niż w planie

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/pages/index.astro:33, src/components/discovery/DiscoveryShell.tsx:10–18
- **Detail**: Plan przewidywał `client:only="react"` na `EventsMap`. Implementacja używa `client:load` na `DiscoveryShell` + `lazy()` + `useSyncExternalStore` — rozwiązuje ten sam problem SSR (`window is not defined`), potwierdzony w manual QA.
- **Fix**: Zaktualizować plan (addendum) opisując wzorzec lazy + `useIsClient` zamiast wymuszać `client:only` na mapie.
- **Decision**: FIXED

### F5 — Postęp manualny w plan.md niezsynchronizowany z QA

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/fan-event-discovery/plan.md:433–479
- **Detail**: Wszystkie pozycje Manual w `## Progress` są `- [ ]`, mimo że użytkownik potwierdził pełne QA. Automated `[x]` — OK.
- **Fix**: Odhaczyć pozycje Manual w plan.md po akceptacji review (lub przy `/10x-archive`).
- **Decision**: FIXED

### F6 — Zmiany admina poza scope S-02 (venue, checkbox)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/admin/EventForm.tsx, src/components/ui/checkbox.tsx, src/lib/events/schema.ts
- **Detail**: Trzy pliki zmienione poza planem fan-event-discovery: copy pola venue (opis lokalizacji), naprawa checkboxów Radix w panelu admina, komunikat walidacji. Powiązane z testami użytkownika, nie szkodzą S-02.
- **Fix**: Krótki addendum w planie S-02 lub odnotowanie w change.md jako „related fixes z sesji QA”.
- **Decision**: FIXED

### F7 — Brak paginacji i DISTINCT miast po stronie DB

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/events.ts:125–154
- **Detail**: `listPublishedEvents` bez limitu; `listDistinctCities` deduplikuje w JS. Plan MVP to akceptuje („setki eventów”). Wartość na późniejszą skalę.
- **Fix**: Brak na MVP — follow-up w roadmapie przy wzroście danych.
- **Decision**: SKIPPED + ACCEPTED-AS-RULE: Fan read queries — jawne filtry niezależnie od RLS

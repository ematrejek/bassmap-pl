# Udostępnianie profilu (S-28) Implementation Plan

## Overview

Slice roadmapy **S-28** (`change-id`: **`profile-share`**). Fan (i każdy odwiedzający publiczny profil) widzi przycisk **«Udostępnij»** na `/profile` oraz `/u/login`. Po kliknięciu: na urządzeniach z **Web Share API** – natywny panel systemu; w pozostałych przypadkach – **kopiowanie kanonicznego linku** `https://bassmap.pl/u/{login}` do schowka z krótkim potwierdzeniem **„Skopiowano”**.

**Issue:** [#50](https://github.com/ematrejek/bassmap-pl/issues/50). **PRD:** FR-028 (nice-to-have). **Prerequisite:** S-20 (`fanPublicProfilePath`, `ProfileView`).

## Current State Analysis

S-20 dostarczył publiczny profil pod `/u/{login}`, wspólny widok `ProfileView` na `/profile` i `/u/[login]`, helper `fanPublicProfilePath()` oraz `absoluteUrl()` z `SITE_ORIGIN`. **Brak** UI udostępniania, schowka, Web Share i toastów w projekcie.

### Key Discoveries:

- Jedyny slot na akcje w widoku profilu: `ProfileView.tsx` L65–70 («Edytuj profil») – oba konteksty przechodzą przez ten komponent (`ProfileSection` → `ProfileView`, `PublicProfileView` → `ProfileView`).
- `fanPublicProfilePath` jest przetestowany (`tests/unit/routes.test.ts`) ale **nieużywany w UI** – S-28 pierwszy konsument.
- Feedback sukcesu w projekcie: inline stan / zmiana tekstu przycisku (`FanEventsTable`), **bez** sonner/shadcn toast.
- Profile islands: `client:only="react"` – clipboard i `navigator.share` wymagają przeglądarki (OK po hydratacji).
- Roadmapa: FB/IG share, OG meta, QR – **poza v1**.

## Desired End State

1. Na `/profile` (tryb podglądu, nie edycji) i na `/u/login` w lewej karcie profilu widać przycisk **«Udostępnij»** (ikona `Share2`, styl spójny z «Edytuj profil»).
2. Klik uruchamia Web Share gdy `navigator.share` istnieje; po udanym share lub gdy API niedostępne – kopiowanie linku; po skopiowaniu przycisk pokazuje **„Skopiowano”** przez ~2 s.
3. Link zawsze kanoniczny: `absoluteUrl(fanPublicProfilePath(login))` → `https://bassmap.pl/u/{login}`.
4. Przycisk **ukryty** w trybie edycji profilu i gdy brak sensownego loginu (teoretycznie tylko stan pośredni – w DB login jest wymagany po pierwszym zapisie).
5. Unit testy helpera URL i komponentu share; `npm run verify` zielone.

### Weryfikacja ręczna

- Fan na `/profile`: klik «Udostępnij» → link w schowku (desktop) lub panel share (mobile).
- Gość na `/u/login`: ten sam przycisk, ten sam link.
- Właściciel na własnym `/u/login`: «Udostępnij» + «Edytuj profil» obok siebie.
- Anulowanie Web Share: brak komunikatu błędu, brak kopiowania.
- Błąd schowka: krótki komunikat błędu pod przyciskiem (wzorzec `ServerError`).

## What We're NOT Doing

- Przyciski Facebook / Instagram (iteracja 2 – wymaga OG)
- Meta Open Graph na `/u/login`
- QR kod profilu
- Backend / nowe endpointy API
- Toasty globalne (sonner) – tylko lokalny feedback
- E2E z fixture profilu w CI (opcjonalny follow-up – S-20 też bez pełnego E2E profilu)
- Aktualizacja dokumentów prawnych (brak nowego przetwarzania danych – tylko kopiowanie publicznego URL)
- Udostępnianie z trybu edycji (`ProfileEditor`)

## Implementation Approach

Nowy helper składający pełny URL + izolowany komponent `ProfileShareButton` osadzony w `ProfileView` pod przyciskiem edycji (lub sam, gdy `onEdit` brak). Logika share w komponencie (bez osobnego hooka – zakres za mały).

```
fanPublicProfileAbsoluteUrl(login)
  → absoluteUrl(fanPublicProfilePath(login))

ProfileView
  └─ ProfileShareButton(login)   // zawsze w trybie podglądu
  └─ Button «Edytuj profil»      // gdy onEdit
```

**Flow kliknięcia:**

1. Zbuduj `shareUrl` przez helper.
2. Jeśli `typeof navigator !== "undefined" && "share" in navigator` → `navigator.share({ title, url: shareUrl })`.
   - Sukces → koniec (bez „Skopiowano” – system już obsłużył UX).
   - `AbortError` (anulowanie) → cicho zakończ.
   - Inny błąd → fallback do schowka.
3. Jeśli brak Web Share → `navigator.clipboard.writeText(shareUrl)` → stan „Skopiowano” (timeout 2 s).
4. Błąd schowka → `setError` + komunikat pod przyciskiem.

## Critical Implementation Details

**Kolejność Web Share vs copy:** Najpierw share na mobile/desktop gdy API istnieje; copy tylko gdy share niedostępne lub share rzucił błąd innym niż anulowanie. Anulowanie share **nie** kopiuje linku (użytkownik świadomie zamknął panel).

**Kanoniczny origin:** Zawsze `SITE_ORIGIN` (`https://bassmap.pl`) – także na localhost w dev. Spójne z roadmapą i sitemapą eventów.

**Dostępność:** Przycisk `type="button"`, `aria-label="Udostępnij profil"`; po skopiowaniu krótki tekst „Skopiowano” widoczny wizualnie (opcjonalnie `aria-live="polite"` na tekście przycisku).

**Układ:** Gdy oba przyciski – kolumna `flex flex-col gap-2 mt-6` zamiast pojedynczego `mt-6` na jednym przycisku.

## Phase 1: Helper URL i komponent share

### Overview

Dodać helper pełnego URL profilu, komponent `ProfileShareButton` z logiką Web Share + clipboard, osadzić w `ProfileView`.

### Changes Required:

#### 1. Helper kanonicznego URL profilu

**File**: `src/lib/fan/profile-share.ts` (nowy)

**Intent**: Jedno miejsce budujące pełny link do publicznego profilu – używane przez UI i testy.

**Contract**: Eksport `fanPublicProfileAbsoluteUrl(login: string): string` – `absoluteUrl(fanPublicProfilePath(login))`. Import z `@/lib/routes` i `@/lib/site`.

#### 2. Komponent przycisku udostępniania

**File**: `src/components/fan/ProfileShareButton.tsx` (nowy)

**Intent**: Przycisk «Udostępnij» z logiką Web Share, fallbackiem do schowka i lokalnym feedbackiem.

**Contract**:

- Props: `{ login: string }` (wymagany, niepusty po trim).
- Render: `Button` shadcn, ikona `Share2` z lucide, tekst «Udostępnij» / «Skopiowano» / ewentualny błąd pod przyciskiem.
- `title` w `navigator.share`: `Profil @${login} – BassMap PL` (en dash w copy jeśli separator – tu myślnik w tytule OK).
- Nie renderuj nic gdy `!login.trim()`.

#### 3. Integracja w widoku profilu

**File**: `src/components/fan/ProfileView.tsx`

**Intent**: Pokazać share na obu trasach profilu w jednym miejscu.

**Contract**: W lewej karcie profilu, pod bio, sekcja akcji: `ProfileShareButton` + opcjonalny «Edytuj profil» gdy `onEdit` ustawione. Zachować istniejące klasy wizualne (`uppercase`, `tracking-wider`, `w-full`).

### Success Criteria:

#### Automated Verification:

- `npm run check` przechodzi
- `npm run lint:all` przechodzi
- `npm test` przechodzi (po dodaniu testów w Phase 2 – Phase 1 może być zweryfikowana ręcznie przed testami, ale pełny gate na końcu Phase 2)

#### Manual Verification:

- `/profile` (zalogowany fan): przycisk widoczny w podglądzie, znika w trybie edycji
- `/u/{login}`: przycisk widoczny dla gościa i właściciela
- Desktop: kopiowanie + „Skopiowano”
- Mobile (lub DevTools): Web Share gdy dostępne
- Wklejony link otwiera publiczny profil

**Implementation Note**: Po Phase 1 i ręcznym dymku UI przejdź do Phase 2 (testy), potem pełny `npm run verify`.

---

## Phase 2: Testy i weryfikacja

### Overview

Unit testy helpera i komponentu; pełny gate CI; opcjonalna notatka w smoke checklist.

### Changes Required:

#### 1. Test helpera URL

**File**: `tests/unit/profile-share.test.ts` (nowy)

**Intent**: Zablokować regresję składania kanonicznego linku.

**Contract**: `fanPublicProfileAbsoluteUrl("Siemema")` → `https://bassmap.pl/u/siemema`; `fanPublicProfileAbsoluteUrl("@Fan_1")` → `https://bassmap.pl/u/fan_1`.

#### 2. Test komponentu share

**File**: `tests/unit/profile-share-button.test.tsx` (nowy)

**Intent**: Sprawdzić render, ścieżkę clipboard i obsługę Web Share.

**Contract**:

- Mock `navigator.clipboard.writeText` i opcjonalnie `navigator.share`.
- Klik bez share API → `writeText` z poprawnym URL + tekst „Skopiowano”.
- Gdy `share` istnieje i resolve → `writeText` **nie** wywołane.
- Gdy `share` reject z `AbortError` → brak kopiowania, brak błędu.
- Pusty login → brak przycisku w DOM.

Wzorzec mocków: `tests/unit/profile-section.test.tsx` (RTL + `vi.stubGlobal` / `Object.defineProperty` na `navigator`).

#### 3. Smoke checklist (opcjonalnie)

**File**: `context/foundation/smoke-checklist.md`

**Intent**: Udokumentować ręczną ścieżkę share przy zamknięciu slicu.

**Contract**: Jedna linia pod sekcją profilu – «Udostępnij» kopiuje `/u/login` (jeśli plik już ma sekcję profilu; inaczej pominąć – nie blokować slicu).

### Success Criteria:

#### Automated Verification:

- `npm run verify` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- `npm run dev` – przycisk działa po hydratacji (brak błędów konsoli)
- Brak regresji na `/profile` i `/u/login` (edycja, social, «Idę»)

---

## Testing Strategy

### Unit Tests:

- Helper: pełny URL, normalizacja `@` i lowercase
- Komponent: clipboard path, share path, cancel share, pusty login

### Integration Tests:

- Brak – slice bez backendu i DB

### Manual Testing Steps:

1. Zaloguj się jako fan z ustawionym loginem → `/profile` → «Udostępnij» → wklej link w nowej karcie → profil się otwiera.
2. Wyloguj → `/u/{ten_login}` → «Udostępnij» działa tak samo.
3. Wejdź w «Edytuj profil» → brak «Udostępnij».
4. Na telefonie (lub emulatorze) sprawdź natywny panel share.
5. Anuluj panel share – brak „Skopiowano” i brak błędu.

## Performance Considerations

Brak – jednorazowa akcja użytkownika, zero zapytań sieciowych.

## Migration Notes

Brak migracji DB i deployowych kroków poza zwykłym deployem frontendu.

## References

- Research: `context/changes/profile-share/research.md`
- S-20 plan: `context/archive/2026-06-23-fan-profile-edit/plan.md`
- Roadmap S-28: `context/foundation/roadmap.md` L494–514
- `src/lib/routes.ts:12-16` – `fanPublicProfilePath`
- `src/lib/site.ts:5-7` – `absoluteUrl`
- `src/components/fan/ProfileView.tsx:65-70` – slot akcji

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` – <commit sha>` when a step lands.

### Phase 1: Helper URL i komponent share

#### Automated

- [x] 1.1 `npm run check` przechodzi
- [x] 1.2 `npm run lint:all` przechodzi

#### Manual

- [x] 1.3 `/profile` – przycisk w podglądzie, brak w edycji
- [x] 1.4 `/u/{login}` – przycisk dla gościa i właściciela
- [x] 1.5 Kopiowanie / Web Share działają; link kanoniczny `https://bassmap.pl/u/...`

### Phase 2: Testy i weryfikacja

#### Automated

- [x] 2.1 `npm run verify` przechodzi
- [x] 2.2 `npm run build` przechodzi

#### Manual

- [x] 2.3 `npm run dev` – brak błędów konsoli; brak regresji profilu

<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: My vibes (Spotify + SoundCloud embed)

- **Plan**: `context/changes/profile-spotify-embed/research.md` + `change.md` (brak `plan.md`)
- **Scope**: Pełna implementacja S-21 (commit `f5f3ef4`)
- **Date**: 2026-06-24
- **Verdict**: APPROVED
- **Findings**: 0 critical, 5 warnings, 2 observations (7 triaged: 6 fixed, 1 skipped)

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 – Sprzeczność w polityce prywatności (§6 vs My vibes)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH – dokument prawny musi być spójny przed archiwum
- **Dimension**: Safety & Quality
- **Location**: `src/pages/privacy-policy.astro:63-66`, `354-355`
- **Detail**: §2.1 mówi, że embed Spotify/SoundCloud może ustawiać cookies stron trzecich, ale §6 nadal twierdzi: „Nie stosujemy cookies … śledzących stron trzecich”. Użytkownik dostaje sprzeczne informacje.
- **Fix A ⭐ Recommended**: Uzupełnić §6 o wyjątek dla osadzonych odtwarzaczy (Spotify/SoundCloud) – cookies tylko gdy fan doda utwór i odwiedzający odtworzy.
  - Strength: Spójność z §2.1 i rzeczywistym zachowaniem iframe.
  - Tradeoff: Wymaga przemyślenia copy prawnego.
  - Confidence: HIGH – jawna sprzeczność w jednym dokumencie.
  - Blind spot: Czy prawnik wymaga osobnej zgody przed odtwarzaniem.
- **Fix B**: Usunąć wzmiankę o cookies z §2.1 My vibes
  - Strength: §6 zostaje bez zmian.
  - Tradeoff: Niedopowiedzenie o cookies embedów – gorsze RODO.
  - Confidence: LOW – niezalecane.
- **Decision**: FIXED (Fix A – §6 doprecyzowany pod stan faktyczny)

### F2 – Martwe odwołanie w polityce prywatności

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – jedna linia copy
- **Dimension**: Plan Adherence
- **Location**: `src/pages/privacy-policy.astro:66`
- **Detail**: Tekst odsyła do „punktu o cookies i narzędziach zewnętrznych”, który nie istnieje w dokumencie.
- **Fix**: Po naprawie F1 zmienić odwołanie na „punkt 6” (lub konkretny podpunkt).
- **Decision**: FIXED (odwołanie → punkt 6)

### F3 – Brak aktualizacji regulaminu

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – AGENTS.md wymaga obu dokumentów przy UGC
- **Dimension**: Pattern Consistency
- **Location**: `src/pages/terms.astro` (brak wzmianki o My vibes)
- **Detail**: Zaktualizowano tylko `privacy-policy.astro`. Regulamin nie wspomina sekcji My vibes ani embedów zewnętrznych.
- **Fix**: Dodać krótką sekcję w `terms.astro` (fan publikuje link do utworu; odtwarzacz od Spotify/SoundCloud) + `LEGAL_UPDATED_AT` już ustawione.
- **Decision**: FIXED (§5.15 + §6.1)

### F4 – Brak testów API dla favourite track

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – async oEmbed bez pokrycia regresji
- **Dimension**: Success Criteria
- **Location**: `tests/unit/fan-profile-api.test.ts`
- **Detail**: Brak testów PATCH z `favouriteTrackUrl` (sukces z mockiem oEmbed, błąd walidacji, czyszczenie pola). S-21 dodaje `applyFavouriteTrackPatch` bez testów jednostkowych API.
- **Fix**: Dodać testy z `vi.mock("@/lib/fan/track-oembed")` – wzorzec jak inne API route testy.
- **Decision**: FIXED (4 testy PATCH w `fan-profile-api.test.ts` + evil host w `favourite-track.test.ts`)

### F5 – Słabsze constrainty DB niż w S-20

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM – długi tytuł z oEmbed lub niespójność platform/url
- **Dimension**: Safety & Quality
- **Location**: `supabase/migrations/20260624120000_fan_profiles_favourite_track.sql:4-27`
- **Detail**: Brak `char_length` na `favourite_track_url` / `favourite_track_title`. Constraint spójności nie wymaga zgodności hosta URL z platformą.
- **Fix**: Follow-up migracja: `title <= 200`, `url <= 500`, opcjonalnie CHECK host ↔ platform.
- **Decision**: FIXED (`20260624130000_fan_profiles_favourite_track_lengths.sql`)

### F6 – Brak `npm run test:e2e` przed zamknięciem slicu

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW – lekcja z `lessons.md`, zmiana UI profilu
- **Dimension**: Success Criteria
- **Location**: N/A
- **Detail**: `npm run verify` przeszedł (269 testów). Zgodnie z lekcją „Zamknięcie slicu” przy zmianach UI należy też `test:e2e` – nie uruchomiono w tej sesji.
- **Fix**: Uruchomić `npm run test:e2e` przed archiwum / pushem na produkcję.
- **Decision**: FIXED (12/12 e2e po `npm run build`)

### F7 – Brak formalnego `plan.md`

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW – research + change.md wystarczyły funkcjonalnie
- **Dimension**: Plan Adherence
- **Location**: `context/changes/profile-spotify-embed/`
- **Detail**: Implementacja poszła z `research.md` bez `plan.md` i sekcji Progress. Kod jest zgodny z research w 8/9 punktach.
- **Fix**: Opcjonalnie dopisać krótki `plan.md` retroaktywnie przed archiwum (dla audytu).
- **Decision**: SKIPPED (`research.md` + `change.md` wystarczają do archiwum)

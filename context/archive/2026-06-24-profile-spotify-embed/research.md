---
date: 2026-06-24T14:00:00+02:00
researcher: Auto
git_commit: d906979cf30e68c570a37d00a15660978a4d1aac
branch: main
repository: bassmap-pl
topic: "S-21 profile-spotify-embed – stan kodu i plan implementacji Spotify embed na profilu fana"
tags: [research, codebase, profile-spotify-embed, S-21, fan-profile, spotify, iframe, embed]
status: complete
last_updated: 2026-06-24
last_updated_by: Auto
last_updated_note: "Decyzje właścicielki – scope Spotify+SoundCloud, My vibes, tytuł z oEmbed, tylko track"
---

# Research: S-21 profile-spotify-embed – Moja muzyka (Spotify embed)

**Date**: 2026-06-24T14:00:00+02:00  
**Researcher**: Auto  
**Git Commit**: `d906979cf30e68c570a37d00a15660978a4d1aac`  
**Branch**: main  
**Repository**: ematrejek/bassmap-pl

## Research Question

Jak zaimplementować slice **S-21 (profile-spotify-embed)**: fan wkleja link do utworu lub playlisty Spotify, na profilu widać osadzony odtwarzacz (iframe) – bez Spotify API i bez logowania – w oparciu o kod po S-20?

## Summary

**S-21 to rozszerzenie profilu o drugie pole Spotify**, oddzielone od istniejącego `spotify_url` (link social do profilu). W kodzie produkcyjnym jest tylko **placeholder UI** w sekcji «Ulubiony kawałek / set»; brak kolumny w bazie, typów, walidacji track/playlist, pola w edytorze i iframe.

**Infrastruktura S-20 gotowa do rozszerzenia:** tabela `fan_profiles`, `GET`/`PATCH /api/fan/profile`, wzorzec social fields (Zod + `profile-social.ts` + serwis `fan-profile.ts`), wspólny `ProfileView` na `/profile` i `/u/[login]`.

**Wzorzec implementacji:** lokalny mock `bassmap-pl-ui` ma gotową logikę `getTrackEmbedSrc` (share URL → embed URL) i render iframe dla **Spotify + SoundCloud** – do portowania w scope ustalonym z właścicielką (oba serwisy, tylko track, sekcja **My vibes**).

**CSP:** brak nagłówków Content-Security-Policy w projekcie – iframe z `open.spotify.com/embed/...` powinien działać od razu.

**Kluczowa decyzja implementacyjna:** nie rozszerzać `socialFieldSchema("spotify")` – osobny moduł walidacji i osobna kolumna DB (np. `favourite_spotify_url`).

## Detailed Findings

### Stan obecny – placeholder w UI

[`ProfileView.tsx`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/components/fan/ProfileView.tsx#L134-L141) renderuje sekcję «Ulubiony kawałek / set» z tekstem:

> Wkrótce – osadzanie utworów z Spotify i SoundCloud (S-21).

Brak `<iframe>`, brak warunkowego renderu po URL. `PublicProfileView` opakowuje ten sam `ProfileView` – publiczny profil też widzi placeholder.

### Social Spotify vs embed – dwa różne cele

| Aspekt | `spotifyUrl` (istnieje, S-20) | Embed S-21 (brak) |
|--------|-------------------------------|-------------------|
| Cel | Link do **profilu** Spotify w sekcji Social media | Link do **utworu lub playlisty** + odtwarzacz |
| DB | `spotify_url` | Brak kolumny |
| UI widok | Klikalna karta `<a href=...>` | Panel «Ulubiony kawałek / set» |
| UI edycja | Input w «Social media» (`ProfileEditor`) | Brak pola |
| Placeholder copy | `open.spotify.com/user/...` ([`profile-display.ts`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/lib/fan/profile-display.ts#L37-L41)) | – |
| Błąd walidacji | «Podaj link do **profilu** Spotify» ([`profile-social.ts`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/lib/fan/profile-social.ts#L175-L176)) | – |
| Walidacja | Dowolna ścieżka `open.spotify.com/...` ([L40-L41](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/lib/fan/profile-social.ts#L40-L41)) | Powinna wymagać `/track/` lub `/playlist/` |
| Render | Link zewnętrzny | `<iframe>` Spotify embed |

Fan musi móc mieć **jednocześnie** profil Spotify w social i ulubiony utwór w «Moja muzyka».

### Schemat bazy `fan_profiles`

Migracja [`20260624100000_fan_profiles.sql`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/supabase/migrations/20260624100000_fan_profiles.sql) – kolumny:

`user_id`, `login`, `bio`, `city`, `favorite_subgenres`, `instagram_url`, `soundcloud_url`, `facebook_url`, **`spotify_url`**, `twitch_url`, `created_at`, `updated_at`.

**Brak** kolumny na ulubiony utwór/playlistę. S-21 wymaga nowej migracji (np. `favourite_spotify_url text`).

RLS: publiczny SELECT, INSERT/UPDATE/DELETE tylko własny wiersz – nowa kolumna dziedziczy te same polityki bez zmian.

### API i typy

Jedyny endpoint profilu: [`src/pages/api/fan/profile.ts`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/pages/api/fan/profile.ts) – `GET` (auth + `ensureFanProfile`), `PATCH` (Zod + `updateFanProfile`).

Mapowanie PATCH obsługuje `spotifyUrl` ([L43-L44](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/pages/api/fan/profile.ts#L43-L44)) – **brak pola embed**.

Typy w [`src/types.ts`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/types.ts#L253-L296): `FanProfileRow`, `FanProfile`, `FanProfileUpdate`, `PublicFanProfile` – tylko `spotifyUrl` / `spotify_url`.

Serwis [`fan-profile.ts`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/lib/services/fan-profile.ts) – SELECT, mapowanie row ↔ API, update – ten sam zestaw pól.

Walidacja Zod: [`profile-schema.ts`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/lib/fan/profile-schema.ts#L42-L52) – `spotifyUrl: socialFieldSchema("spotify")`.

Warstwa UI zapisu: [`ProfileSection.tsx`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/components/fan/ProfileSection.tsx) – `profileToPatchBody` wysyła `spotifyUrl`, bez pola embed.

[`ProfileEditor.tsx`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/components/fan/ProfileEditor.tsx) – Spotify w pętli `SOCIAL_PLATFORMS` (sekcja Social media); walidacja lokalna tylko login/bio/podgatunki. **Brak** sekcji «Moja muzyka».

### Walidacja URL – wzorce do reuse

Istniejący wzorzec social: `allowedHost()` + `parseUrl()` + `refine` w Zod (`profile-social.ts`, `profile-schema.ts`).

Dla S-21 potrzebny **osobny moduł** np. `src/lib/fan/spotify-embed.ts`:

- Akceptować: `https://open.spotify.com/track/{id}` i `/playlist/{id}`
- Odrzucać: `/user/`, `/artist/`, `/album/` (poza scope roadmapy), złośliwe hosty, bezpośrednie URL `/embed/`
- Zapis w DB: canonical share URL (nie embed URL)
- `spotifyEmbedSrc(canonicalUrl)` → `https://open.spotify.com/embed/{type}/{id}` – **tylko po stronie renderu**, nigdy z surowego inputu użytkownika

Testy social: [`tests/unit/profile-social.test.ts`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/tests/unit/profile-social.test.ts) – Instagram, Twitch, Facebook; **brak testów Spotify**.

### CSP i iframe

Przeszukano `src/`, `astro.config.mjs`, `wrangler.jsonc`, `middleware.ts`, `Layout.astro`, `public/` – **brak** nagłówków CSP. Iframe Spotify powinien działać bez zmian konfiguracji. Przy przyszłym dodaniu CSP trzeba dopisać `frame-src https://open.spotify.com`.

W `src/` **nie ma żadnego** istniejącego `<iframe>` – S-21 będzie pierwszym embedem.

### Wzorzec z `bassmap-pl-ui` (gitignored, lokalny mock)

Mock ma pełny wzorzec «Moja muzyka»:

- Typ `FavouriteTrack` z `platform`, `title`, `url`
- `getTrackEmbedSrc()` – regex `open.spotify.com/(track|album|playlist|artist)/{id}` → `open.spotify.com/embed/...`
- Iframe: `loading="lazy"`, `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"`, `height={152}` dla Spotify
- Edytor: przełącznik Spotify/SoundCloud + tytuł + URL

**Rozjazd scope S-21 vs mock:**

| Element mock | S-21 v1 (roadmapa) |
|--------------|-------------------|
| Spotify + SoundCloud | **Tylko Spotify** |
| track, album, playlist, artist | **track + playlist** |
| Pole `title` | Nice-to-have (dla `iframe title` / a11y) |
| SoundCloud widget | Poza S-21 |

Plan S-20 świadomie odłożył `favouriteTrack` + iframe na S-21 ([`plan.md` archiwum](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/context/archive/2026-06-23-fan-profile-edit/plan.md)).

### Architektura komponentów (bez zmian od S-20)

```
/profile.astro → ProfileSection → ProfileView / ProfileEditor
/u/[login].astro → PublicProfileView → ProfileView
```

Embed idzie w `ProfileView` (sekcja L134–141) i nowe pole w `ProfileEditor`. Opcjonalny wydzielony `SpotifyEmbed.tsx` dla iframe.

Islandy profilu używają `client:only="react"` (lekcja z `lessons.md` – Radix/SSR).

### Prawo i cookies

[`privacy-policy.astro`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/pages/privacy-policy.astro#L60) wspomina Spotify tylko jako link social. Embed Spotify może ustawiać cookies stron trzecich – przy archiwizacji slice (UGC) rozważyć aktualizację polityki + `LEGAL_UPDATED_AT` w [`src/lib/legal/paths.ts`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/lib/legal/paths.ts) (reguła AGENTS.md).

## Code References

- [`src/components/fan/ProfileView.tsx:134-141`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/components/fan/ProfileView.tsx#L134-L141) – placeholder «Ulubiony kawałek / set»
- [`src/components/fan/ProfileEditor.tsx`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/components/fan/ProfileEditor.tsx) – brak pola embed; social Spotify w pętli
- [`src/lib/fan/profile-social.ts:40-41`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/lib/fan/profile-social.ts#L40-L41) – luźna walidacja social Spotify
- [`src/lib/fan/profile-schema.ts:42-52`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/lib/fan/profile-schema.ts#L42-L52) – Zod update schema
- [`src/lib/services/fan-profile.ts`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/lib/services/fan-profile.ts) – serwis profilu
- [`src/pages/api/fan/profile.ts`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/pages/api/fan/profile.ts) – GET/PATCH API
- [`supabase/migrations/20260624100000_fan_profiles.sql`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/supabase/migrations/20260624100000_fan_profiles.sql) – schema DB
- [`src/types.ts:253-296`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/src/types.ts#L253-L296) – typy profilu

## Architecture Insights

1. **Rozszerz istniejący pipeline profilu** – migracja → typy → serwis → schema → API → `ProfileSection` → `ProfileEditor` + `ProfileView`. Ten sam wzorzec co social fields w S-20.
2. **Osobne pole, osobna walidacja** – nie mieszać embed URL z `spotify_url` social.
3. **Embed URL tylko w renderze** – DB przechowuje share URL; `spotifyEmbedSrc()` buduje `src` iframe.
4. **Brak Spotify API** – zgodnie z shaping i roadmapą; zero OAuth, zero Client ID.
5. **Testy jednostkowe** – nowy `tests/unit/spotify-embed.test.ts` (wzorzec `profile-social.test.ts`).
6. **Radix/SSR** – profil już na `client:only="react"`; nowy iframe nie wymaga zmiany hydratacji.
7. **Weryfikacja przed pushem** – `npm run verify` + `npm run test:e2e` przy zmianach UI (`lessons.md`).

## Historical Context (from prior changes)

- [`context/archive/2026-06-23-fan-profile-edit/plan.md`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/context/archive/2026-06-23-fan-profile-edit/plan.md) – `favouriteTrack` + iframe odłożone na S-21; `spotify_url` = profil social
- [`context/foundation/partia-iii-shaping.md`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/context/foundation/partia-iii-shaping.md) – embed z URL, bez API; utwór lub playlista
- [`context/foundation/roadmap.md`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/context/foundation/roadmap.md) – S-21 proposed, issue #41, risk niski
- [`context/archive/2026-06-24-profile-share/research.md`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/context/archive/2026-06-24-profile-share/research.md) – wzorzec research doc i architektura `ProfileView` po S-20

### Decyzje już podjęte (nie do ponownego badania)

| Decyzja | Źródło |
|---------|--------|
| Osobny slice po S-20 | shaping, roadmapa, plan S-20 |
| Embed iframe z URL, bez Spotify API | shaping, roadmapa |
| Typ linku: utwór lub playlista | shaping, roadmapa |
| Brak OAuth / logowania Spotify | roadmapa |
| Pełne Spotify API → parked v2+ | roadmapa «Parked» |
| `spotify_url` ≠ embed | plan S-20, migracja DB |

## Related Research

- [`context/archive/2026-06-24-profile-share/research.md`](https://github.com/ematrejek/bassmap-pl/blob/d906979cf30e68c570a37d00a15660978a4d1aac/context/archive/2026-06-24-profile-share/research.md) – architektura profilu, `ProfileView`, trasy `/profile` i `/u/[login]`

## Resolved Decisions (właścicielka, 2026-06-24)

| Temat | Decyzja |
|-------|---------|
| **Nazwa sekcji UI** | **My vibes** |
| **Platformy** | **Spotify + SoundCloud** (oba z embedem z linku) |
| **Typ treści** | Tylko **pojedynczy kawałek** (track) – **bez albumu**, **bez playlisty** |
| **Tytuł** | Pobierany **automatycznie** z platformy przy zapisie – użytkownik nie wpisuje ręcznie |
| **Polityka prywatności** | **Tak** – aktualizacja w tym slice (embed, cookies stron trzecich) |
| **Spotify API (OAuth)** | Nadal **nie** – tytuł przez publiczne **oEmbed**, nie przez Client ID / logowanie |

### SoundCloud – scope slice'a

**Odpowiedź:** Pierwotna roadmapa S-21 opisywała **tylko Spotify**, ale placeholder w UI od S-20 wspominał obie platformy, a mock `bassmap-pl-ui` miał pełny wzorzec Spotify + SoundCloud. Po decyzji właścicielki **slice obejmuje obie platformy**.

Analogia do social: `soundcloud_url` / `spotify_url` to linki do **profilu**; «My vibes» to **osobne pole** na utwór + embed (jak w mocku `FavouriteTrack`).

### Tytuł z platformy – jak bez pełnego API

Spotify i SoundCloud udostępniają **publiczne oEmbed** (bez klucza API i bez logowania użytkownika):

- Spotify: `GET https://open.spotify.com/oembed?url={trackUrl}` → JSON z `title`
- SoundCloud: `GET https://soundcloud.com/oembed?url={trackUrl}` → JSON z `title`

**Wzorzec:** przy `PATCH /api/fan/profile` serwer waliduje URL tracka, woła oEmbed, zapisuje `favourite_track_title` w bazie razem z URL i platformą. UI pokazuje tytuł z bazy; iframe `title` dla dostępności też z tego pola.

To **nie** jest «pełna integracja Spotify API» z roadmapy «Parked» (OAuth, wyszukiwanie) – to lekki endpoint embed jak iframe.

### Model danych (propozycja po decyzjach)

Jedno pole «My vibes» na profil (max jeden utwór):

| Kolumna | Typ | Opis |
|---------|-----|------|
| `favourite_track_platform` | `text` lub enum | `spotify` \| `soundcloud` |
| `favourite_track_url` | `text` | Canonical URL tracka |
| `favourite_track_title` | `text` | Tytuł z oEmbed (cache w DB) |

Wyczyszczenie sekcji = wszystkie trzy `null`.

Walidacja URL:

- Spotify: tylko `open.spotify.com/track/{id}`
- SoundCloud: `soundcloud.com/{user}/{track-slug}` (track, nie playlist/set)

Embed src (tylko w renderze, nie w DB):

- Spotify: `https://open.spotify.com/embed/track/{id}`
- SoundCloud: `https://w.soundcloud.com/player/?url=...` (wzorzec z mocka)

## Open Questions

1. **Roadmapa GitHub** – zsynchronizować opis S-21 / issue #41 (dziś: tylko Spotify + playlista).
2. **Błąd oEmbed** – co gdy Spotify/SoundCloud nie zwróci tytułu (timeout, 404)? Zapisać URL bez tytułu vs odrzucić zapis?
3. **Język tytułu** – oEmbed zwraca tytuł w języku platformy; bez tłumaczenia.

## Proposed Implementation Map

| Priorytet | Plik / akcja |
|-----------|----------------|
| Nowy | `supabase/migrations/..._favourite_track.sql` – platform, url, title |
| Nowy | `src/lib/fan/favourite-track.ts` – walidacja URL, `embedSrc()`, typ platformy |
| Nowy | `src/lib/fan/track-oembed.ts` – fetch tytułu (serwer) |
| Nowy | `src/components/fan/MyVibesEmbed.tsx` – iframe Spotify lub SoundCloud |
| Nowy | `tests/unit/favourite-track.test.ts` |
| Edycja | `src/types.ts`, `fan-profile.ts`, `profile-schema.ts`, `api/fan/profile.ts` |
| Edycja | `ProfileEditor.tsx` – przełącznik Spotify/SoundCloud + pole linku (bez ręcznego tytułu) |
| Edycja | `ProfileView.tsx` – sekcja **My vibes** + embed |
| Edycja | `ProfileSection.tsx` – draft + PATCH body |
| **Wymagane** | `privacy-policy.astro`, `LEGAL_UPDATED_AT` w `src/lib/legal/paths.ts` |
| Sync | `context/foundation/roadmap.md` – outcome S-21 |

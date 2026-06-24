# Edycja profilu fana (S-20) – Plan Brief

> Full plan: `context/changes/fan-profile-edit/plan.md`

## What & Why

Fan potrzebuje **prawdziwego profilu społecznościowego** – nie tylko e-maila z rejestracji. S-12 zostawił placeholdery w `ProfileSection`; S-19 podłączył sekcję «Idę». S-20 zapisuje login, bio, miasto, ulubione podgatunki i linki social w bazie oraz udostępnia **publiczny profil** pod `/u/@login` dla innych użytkowników.

## Starting Point

- `/profile` – chroniona strona z `ProfileSection.tsx` (placeholdery, wyłączony «Edytuj profil», login z heurystyki e-maila).
- Brak tabeli `fan_profiles`, brak API profilu, brak `/u/@login`.
- Katalog podgatunków: `Subgenre` + `SUBGENRES` w `src/types.ts` (26 wartości).
- **Design reference:** `bassmap-pl-ui/` (gitignored) – `profile-section.tsx`, `profile-editor.tsx`, `lib/profile.ts`.
- Wzorce kodu: S-19 (tabela + serwis + API + SSR), S-14 (formularz fan + zod).

## Desired End State

Zalogowany fan edytuje profil w **trybie inline** na `/profile` (wzorzec `bassmap-pl-ui`: przycisk «Edytuj profil» zamienia sekcję w formularz; widzi też swój e-mail). Każdy może otworzyć `/u/@login` i zobaczyć login, bio, miasto, podgatunki i linki social – **bez e-maila**. Admin nadal bez strefy fana. Polityka prywatności opisuje przetwarzanie danych profilu.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Login publiczny | `@handle` 3–30 znaków, `[a-z0-9_]`, unikalny, zmienny | Spójny z URL `/u/@login` i przyszłymi znajomymi/forum | Plan |
| Widoczność | Własny `/profile` + publiczny `/u/@login` | Fan widzi swój profil i może wejść w profile innych | Plan |
| E-mail | Tylko na własnym `/profile`; publicznie tylko login | Prywatność – zgodnie z oczekiwaniem użytkownika | Plan |
| Imię/nazwisko | Brak w MVP | Uproszczenie – identyfikacja przez @login (UI mock ma imię – świadomy rozjazd) | Plan + bassmap-pl-ui |
| Edycja UI | **Inline** (`editing` state + `ProfileEditor`) | Zgodnie z `bassmap-pl-ui` – bez dialogu shadcn | bassmap-pl-ui |
| Layout widoku | Siatka `lg:grid-cols-3` – karta tożsamości + podgatunki/social | Port z `profile-section.tsx` | bassmap-pl-ui |
| Social | Instagram, SoundCloud, Facebook, Spotify, Twitch | Roadmapa + Twitch; klikalne karty tylko gdy wypełnione | Plan + bassmap-pl-ui |
| Podgatunki | Max 5 z katalogu `SUBGENRES`; toggle chips w edytorze | Pełny katalog (26), nie uproszczona lista mocka | Plan + bassmap-pl-ui |
| Bio | Max 200 znaków | Krótszy niż mock (280) – decyzja planowania | Plan |
| Ulubiony kawałek | Placeholder «wkrótce» na widoku | Pełna funkcja w S-21 | bassmap-pl-ui |
| Status ekipy | Poza S-20 | Forum/ekipa – S-22+ | bassmap-pl-ui |

## Scope

**In scope:** tabela `fan_profiles`, RLS, serwis, API GET/PATCH własnego profilu, SSR publiczny `/u/[login].astro`, **ProfileView** + **ProfileEditor** (inline), podpięcie `ProfileSection`, helper `profile-display.ts`, testy unit API + integracja RLS, legal §2.1, `LEGAL_UPDATED_AT`, issue #40.

**Out of scope:** avatar/upload, imię/nazwisko, status ekipy, Spotify embed utworu (S-21), forum/znajomi (S-22+), przełącznik prywatności profilu, lista znajomych, refaktor wszystkich miejsc używających `loginFromEmailLocalPart` (opcjonalny follow-up po MVP).

## Architecture / Approach

```
fan_profiles (1:1 auth.users, login UNIQUE)
  → fan-profile service (getByUserId, getByLogin, upsertProfile)
  → GET/PATCH /api/fan/profile (auth, fan only)
  → profile.astro SSR (own + email)
  → ProfileSection (editing state)
       → ProfileView (grid layout – bassmap-pl-ui)
       → ProfileEditor (Fieldset sections – bassmap-pl-ui)
  → u/[login].astro SSR (ProfileView, no email)
```

Wzorzec jak S-19: migracja → serwis → API → UI → legal.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Schema, typy, serwis | `fan_profiles` + RLS + `fan-profile.ts` | Konflikt UNIQUE na login przy migracji seed |
| 2. API i testy | GET/PATCH profilu, testy unit + RLS | Walidacja URL social i zajęty login |
| 3. UI własny profil | **Inline** edycja + `ProfileView` na `/profile` | Port UI mock → pełny katalog podgatunków |
| 4. Profil publiczny | `/u/@login` – reuse `ProfileView` | 404 vs profil nieutworzony |
| 5. Legal i domknięcie | Polityka §2.1, roadmap/issue sync | Publiczne dane – kompletny opis RODO |

**Prerequisites:** S-19 done (sekcja «Idę» na profilu).  
**Estimated effort:** ~3–4 sesje implementacji (5 faz).

## Open Risks & Assumptions

- Przy pierwszym wejściu fan bez wiersza profilu: lazy create z proponowanym loginem z e-maila (jeśli wolny) lub wymuszenie wyboru loginu w trybie edycji.
- Komentarze i admin «submitter login» nadal mogą używać heurystyki e-maila do czasu osobnego slice'a (nie blokuje S-20).
- Miasto: dowolny tekst (max ~80 znaków), bez walidacji względem listy miast z eventów.

## Success Criteria (Summary)

- Fan zapisuje profil w trybie inline i widzi dane na `/profile` (z e-mailem tylko dla siebie).
- Gość otwiera `/u/@login` i widzi publiczne pola bez e-maila.
- `npm run verify` przechodzi; RLS blokuje edycję cudzego profilu.

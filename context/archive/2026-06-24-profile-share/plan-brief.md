# Udostępnianie profilu (S-28) – Plan Brief

> Full plan: `context/changes/profile-share/plan.md`  
> Research: `context/changes/profile-share/research.md`

## What & Why

Fan chce **łatwo wysłać link do swojego profilu** znajomym (Messenger, Instagram, SMS). S-20 zbudował publiczny profil pod `/u/login`, ale bez przycisku udostępniania. S-28 dodaje «Udostępnij» na własnym i publicznym widoku profilu – kopiowanie linku + opcjonalnie natywny panel systemu na telefonie.

## Starting Point

- S-20 zarchiwizowane: `ProfileView` na `/profile` i `/u/[login]`, helper `fanPublicProfilePath()`, `absoluteUrl()` z `https://bassmap.pl`.
- Brak schowka, Web Share, toastów i przycisku share w `src/`.
- Issue [#50](https://github.com/ematrejek/bassmap-pl/issues/50), status `proposed` → plan.

## Desired End State

Na obu stronach profilu (w trybie podglądu) widać **«Udostępnij»**. Klik kopiuje kanoniczny link `https://bassmap.pl/u/{login}` lub otwiera Web Share. Po skopiowaniu krótko widać **„Skopiowano”**. Bez backendu, bez FB/IG w v1.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Miejsce UI | `ProfileView` – wspólny slot akcji | Jedna zmiana obsługuje `/profile` i `/u/login` (DRY po S-20) | Research |
| Kto widzi przycisk | Wszyscy na publicznym profilu + fan na `/profile` | Promuje profil; roadmapa nie ogranicza do właściciela | Research / Plan |
| Ukrycie przycisku | Brak w trybie edycji; brak bez loginu | Share bez sensownego URL jest mylący | Research / Plan |
| Pełny link | `absoluteUrl(fanPublicProfilePath(login))` | Kanoniczny `https://bassmap.pl` – zgodnie z roadmapą i sitemapą | Research |
| Web Share vs copy | Share pierwsze gdy API jest; copy jako fallback | Mobile UX + desktop bez share API | Research / Plan |
| Anulowanie share | Cicho – bez kopiowania i bez błędu | Użytkownik świadomie zamknął panel | Plan |
| Feedback „Skopiowano” | Zmiana tekstu przycisku ~2 s | Spójne z projektem – bez nowych toastów/sonner | Research |
| Architektura | `ProfileShareButton` + `fanPublicProfileAbsoluteUrl` | Mały zakres – bez hooka i bez API | Plan |
| Testy E2E profilu | Pominąć w v1 | S-20 też bez pełnego E2E; unit wystarczy na MVP | Plan |
| Legal sync | Brak | Tylko kopiowanie już publicznego URL – brak nowych danych | Plan |

## Scope

**In scope:**

- Helper `fanPublicProfileAbsoluteUrl`
- Komponent `ProfileShareButton` (Web Share + clipboard + feedback)
- Integracja w `ProfileView`
- Unit testy helpera i komponentu
- `npm run verify` + build

**Out of scope:**

- Facebook / Instagram share, OG meta, QR
- Backend, migracje DB
- Globalne toasty
- E2E z fixture profilu w CI

## Architecture / Approach

```
fanPublicProfileAbsoluteUrl(login)
       ↓
ProfileShareButton  ──navigator.share──► (sukces → koniec)
       │                    │
       │              anulowanie → stop
       │                    │
       └── clipboard.writeText ──► „Skopiowano” (2 s)

ProfileView
  ├── ProfileShareButton(login)
  └── «Edytuj profil» (gdy onEdit)
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Helper + UI | Przycisk na obu trasach profilu | Układ dwóch przycisków na wąskim ekranie |
| 2. Testy + verify | Unit testy, CI zielone | Mock `navigator` w Vitest (wzorzec do ustalenia) |

**Prerequisites:** S-20 wdrożone (`fan_profiles`, `/u/[login]`, `ProfileView`).  
**Estimated effort:** ~1 sesja (2 fazy, brak backendu).

## Open Risks & Assumptions

- `navigator.clipboard` wymaga secure context (HTTPS / localhost) – OK w produkcji i lokalnym dev.
- Web Share na desktopie zachowuje się inaczej niż na mobile – akceptowalne; copy jako fallback.
- Link na localhost wskazuje produkcję (`bassmap.pl`) – zamierzone (kanoniczny URL).

## Success Criteria (Summary)

- Fan i gość widzą «Udostępnij» na profilu w trybie podglądu.
- Wklejony link otwiera poprawny publiczny profil.
- `npm run verify` i build przechodzą; unit testy blokują regresję URL i clipboard.

---
change_id: fan-profile-edit
title: Edycja profilu fana (S-20)
roadmap_ref: S-20
status: implemented
created: 2026-06-23
updated: 2026-06-24
archived_at: null
github-issue: 40
---

# Change: fan-profile-edit

Roadmap **S-20** – north star Partii III po zamknięciu S-19. Fan edytuje publiczny profil (login, bio, miasto, podgatunki, linki social); własny widok na `/profile`, publiczny na `/u/@login`.

## Outcome

Fan klika «Edytuj profil», przechodzi w **tryb edycji inline** (wzorzec `bassmap-pl-ui`), zapisuje dane w bazie; gość i inni zalogowani fani widzą profil pod `/u/@login` (tylko login publicznie – bez e-maila). Placeholdery w `ProfileSection` zastąpione prawdziwymi danymi; layout siatki i formularz portowane z `bassmap-pl-ui`.

## Notes

- Decyzje planowania 2026-06-23: login `[a-z0-9_]` 3–30, unikalny, zmienny; social: Instagram, SoundCloud, Facebook, Spotify, Twitch; bio max 200 znaków; max 5 podgatunków; bez imienia/nazwiska w MVP.
- UI: port wzorca z `bassmap-pl-ui` (inline edit, `ProfileView` + `ProfileEditor`, siatka 3-kolumnowa); bez dialogu shadcn.

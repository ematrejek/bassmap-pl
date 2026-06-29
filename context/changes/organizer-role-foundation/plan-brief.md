# Rola organizatora i weryfikacja (F-05) – Plan Brief

> Full plan: `context/changes/organizer-role-foundation/plan.md`
> Research: `context/changes/organizer-role-foundation/research.md`

## What & Why

Zalogowany fan może złożyć **wniosek o status organizatora**, żeby później (w S-25) publikować wydarzenia bez moderacji. Żeby ograniczyć podszywanie się pod organizatora, weryfikacja nie opiera się tylko na nazwie i linku – admin wysyła **kod weryfikacyjny** z kont BassMap PL na oficjalny profil Facebook lub Instagram, użytkownik wpisuje kod w aplikacji, a admin ręcznie zatwierdza lub odrzuca wniosek.

**Dlaczego teraz:** Partia III wymaga zaufanego fundamentu roli `organizer` przed panelem self-service (S-25). F-05 dostarcza rolę, kolejkę admina i guardy – bez publikowania eventów.

## Starting Point

- Tylko rola **admin** (allowlist + `is_admin()`) i **fan**; brak `organizer`.
- Panel admina ma wzorce kolejek: zgłoszenia eventów (`pending`) i sugestie zmian.
- Profil fana (`/profile`) – miejsce na nową sekcję wniosku.
- Research i decyzje produktowe z sesji planowania 2026-06-29.

## Desired End State

1. Fan składa wniosek (nazwa organizatora, FB lub IG, URL profilu, opis).
2. Admin generuje kod, wysyła go ręcznie na social z kont BassMap PL.
3. Fan wpisuje kod; po poprawnej weryfikacji wniosek czeka na decyzję admina.
4. Admin **Zatwierdza** → rola `organizer` (dodatkowa, fan zostaje fanem) lub **Odrzuca** z opcjonalnym powodem.
5. Odrzucony może złożyć nowy wniosek.
6. `isOrganizer` w middleware i guardach API; dokumenty prawne zaktualizowane.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Rola | Dodatkowa (fan + organizer) | Użytkownik nadal korzysta z profilu, forum i ekip | Research / Roadmap |
| Przechowywanie roli | Tabela `organizer_roles` + RPC `is_organizer()` | Ten sam bezpieczny wzorzec co admin | Research |
| Anty-podszywanie | Kod wysłany ręcznie na FB/IG + wpisanie w app | Sam link i nazwa są za słabe | Plan |
| Platforma social | Facebook lub Instagram (jeden URL) | Konta BassMap PL na obu platformach | Plan |
| Kod w DB | Tylko hash | Kod nie może wyciec przez API ani SELECT | Plan |
| Odrzucenie | Opcjonalny powód + ponowny wniosek | Lepsza komunikacja bez blokady na stałe | Plan |
| Self-service eventów | Poza F-05 (S-25) | Fundament przed funkcjami organizatora | Research / Roadmap |
| API social | Brak – ręczna wiadomość | Prostsze MVP, bez integracji Meta | Plan |

## Scope

**In scope:**

- Migracja: `organizer_applications`, `organizer_roles`, enum statusów, RLS, RPC issue/verify/approve/reject
- Auth: `resolveIsOrganizer`, `requireOrganizer`, `locals.isOrganizer`
- API fan + admin; serwis `organizer-applications`
- UI: sekcja na `/profile`, kolejka w panelu admina
- Legal sync: polityka, regulamin, `LEGAL_UPDATED_AT`
- Testy unit + integracja RLS

**Out of scope:**

- Publikacja eventów `published` przez organizatora (S-25)
- Ogłoszenia forum (S-25)
- KRS/NIP, automatyczna weryfikacja
- Odznaka publiczna „zweryfikowany organizator”
- Osobna nawigacja panelu organizatora

## Architecture / Approach

```
/profile (fan)
  → OrganizerApplicationSection
  → POST /api/fan/organizer-application
  → status: pending → code_issued → code_verified

Admin /admin
  → OrganizerApplicationsTable
  → POST issue-code (admin widzi kod jednorazowo)
  → [ręcznie: wiadomość na FB/IG z konta BassMap PL]

Fan
  → POST verify-code
  → status: code_verified

Admin
  → POST approve → INSERT organizer_roles + is_organizer()
  → POST reject (optional reason)
```

Warstwy: UI → API guards → serwis → SECURITY DEFINER RPC → RLS.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Baza + RPC | Tabele, statusy, hash kodu, `is_organizer()` | Poprawność RPC i RLS przy pierwszym slice role |
| 2. Auth + API | Resolver, guardy, endpointy fan/admin | Spójność z wzorcem `requireAdmin` |
| 3. UI | Formularz profilu + kolejka admina | Jednorazowe wyświetlenie kodu adminowi |
| 4. Legal + testy | Dokumenty, RLS integration, verify | Tekst prawny – review właściciela |

**Prerequisites:** S-16 done; issue [#45](https://github.com/ematrejek/bassmap-pl/issues/45).

**Estimated effort:** ~3–4 sesje implementacji w 4 fazach.

## Open Risks & Assumptions

- Admin musi pamiętać o ręcznym wysłaniu kodu na social – UI powinno to jasno komunikować po generowaniu kodu.
- Limit prób wpisania kodu (np. 5) – ochrona przed brute force na hash.
- Migracja produkcyjna przed deployem kodu wymagającego nowych tabel.
- BassMap PL ma aktywne konta FB/IG do wysyłki kodów (założenie właścicielki).

## Success Criteria (Summary)

- Fan przechodzi pełną ścieżkę wniosku z kodem na social i dostaje rolę organizatora po akceptacji admina.
- Odrzucony widzi powód i może złożyć nowy wniosek.
- Organizator nadal korzysta ze strefy fana; nie publikuje eventów bez moderacji (do S-25).
- `npm run verify` zielone; testy RLS dla wniosków przechodzą.

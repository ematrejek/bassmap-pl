# Usuwanie konta użytkownika (S-16) – Plan Brief

> Full plan: `context/changes/account-deletion/plan.md`

## What & Why

Każdy zalogowany fan musi móc samodzielnie usunąć konto (RODO – prawo do usunięcia). Po usunięciu znikają e-mail i hasło; komentarze zostają widoczne, ale autor wyświetla się jako „Usunięty użytkownik”. To domyka Partię II roadmapy (north star po S-15).

**Dlaczego teraz:** S-12 (konta fanów) i S-15 (komentarze z `author_label` + `ON DELETE SET NULL` na `author_id`) są gotowe. Polityka prywatności §4 i §5.1 już opisują zachowanie po usunięciu – brakuje tylko przycisku w UI i API.

## Starting Point

- **`/profile`** – `ProfileSection.tsx` pokazuje profil; brak sekcji „Usuń konto”.
- **Auth** – `signout` istnieje; **brak** endpointu usuwania użytkownika z Supabase Auth.
- **`event_comments`** – `author_id` FK `ON DELETE SET NULL`; `author_label` NOT NULL (snapshot przy dodaniu). S-15 plan: przy S-16 trzeba **jawnie** ustawić `author_label = 'Usunięty użytkownik'` (FK nie zmienia etykiety).
- **`events.created_by`** – już `ON DELETE SET NULL` (S-12).
- **`change_suggestions.submitted_by`** – `NOT NULL` + `ON DELETE CASCADE` – **konflikt** z polityką retencji sugestii; wymaga migracji na `SET NULL`.
- **Polityka §5.1** – „do czasu udostępnienia funkcji samodzielnego usuwania” (e-mail do admina).
- **Regulamin §3.6** – analogiczny placeholder.

## Desired End State

1. Fan na `/profile` widzi strefę zagrożenia **Usuń konto** z dialogiem potwierdzenia (ponowne wpisanie hasła).
2. Po potwierdzeniu: konto Auth usunięte, sesja wyczyszczona, redirect na stronę główną z komunikatem sukcesu.
3. Komentarze autora: `author_id = NULL`, `author_label = 'Usunięty użytkownik'`, treść `body` bez zmian.
4. Zgłoszenia wydarzeń (`events.created_by`) i sugestie zmian (`change_suggestions.submitted_by`) – odłączone od konta (`NULL`), treść zostaje.
5. Admin **nie** może użyć tego flow (jak inne endpointy fan) – komunikat o kontakcie e-mailem.
6. Polityka §5.1 i regulamin §3.6 opisują samodzielne usuwanie w profilu; `LEGAL_UPDATED_AT` zaktualizowany.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Potwierdzenie | Ponowne wpisanie **hasła** | Silniejsze niż sam checkbox; standard przy trwałym usunięciu konta | Bezpieczeństwo |
| Komentarze | Anonimizacja (Option B) | Treść zostaje; `author_label` → „Usunięty użytkownik” | PRD FR-022, roadmap 2026-06-15 |
| Kolejność operacji | 1) anonimizuj komentarze 2) `auth.admin.deleteUser` | FK `SET NULL` na `author_id` nie zmienia `author_label` | S-15 handoff |
| Klient serwisowy | `createServiceRoleClient()` | `deleteUser` + UPDATE komentarzy wymaga service role | Wzorzec cover upload |
| Kto może | Fan (nie-admin) | Spójne z `/api/fan/*`; admin chroni allowlist | S-12 wzorzec |
| Sugestie zmian FK | `ON DELETE SET NULL` + nullable `submitted_by` | CASCADE kasowałby historię moderacji – sprzeczne z §4 polityki | Analiza migracji |
| Zgłoszenia eventów | Bez dodatkowej migracji | `created_by` już `SET NULL` (S-12) | Migracja S-12 |
| UI | `AlertDialog` + pole hasła na `/profile` | Ten sam wzorzec co `DeleteEventButton` | Istniejący komponent |
| Legal | Aktualizacja §5.1 + §3.6 przy archive | Placeholder „e-mail do admina” zastąpiony self-service | AGENTS.md |

## Scope

**In scope:**

- Migracja `change_suggestions.submitted_by` → nullable + `ON DELETE SET NULL`
- Stała `DELETED_USER_AUTHOR_LABEL`
- Serwis `account-deletion.ts` (anonimizacja + delete user)
- `POST /api/fan/account/delete` (hasło, auth guard, nie-admin)
- React `DeleteAccountSection` na stronie profilu
- Testy unit + integracja
- Legal sync + roadmap przy archive

**Out of scope:**

- Usuwanie konta admina przez UI (kontakt e-mailem)
- Eksport danych (pobierz kopię) – nadal na wniosek e-mail §5.1
- Soft delete / okres karencji 30 dni
- Usuwanie komentarzy razem z kontem
- Powiadomienie e-mail „konto usunięte”
- Panel admina do usuwania kont użytkowników

## Architecture / Approach

```
/profile (fan)
  → DeleteAccountSection (React)
      → AlertDialog + password
      → POST /api/fan/account/delete { password }
          → verify password (signInWithPassword)
          → service role: UPDATE event_comments (anonimizacja)
          → service role: auth.admin.deleteUser(uid)
              → FK SET NULL: events.created_by, change_suggestions.submitted_by
          → signOut + redirect HOME_PATH?accountDeleted=1
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Schema | FK sugestii `SET NULL` | Nazwa constraintu w migracji |
| 2. Serwis | Logika anonimizacji + delete | Kolejność operacji |
| 3. API | Endpoint fan delete | Brak `SUPABASE_SERVICE_ROLE_KEY` na prod |
| 4. UI profil | Dialog + hasło | Admin nie widzi sekcji |
| 5. Testy + legal | CI + dokumenty | Test musi tworzyć jednorazowego użytkownika |

**Prerequisites:** S-12, S-15 done · issue [#28](https://github.com/ematrejek/bassmap-pl/issues/28).

**Estimated effort:** ~1–2 sesje implementacji w 5 fazach.

## Open Risks & Assumptions

- Produkcja wymaga `SUPABASE_SERVICE_ROLE_KEY` (już używany przy upload okładek).
- Jedyny admin nie może usunąć konta przez UI – akceptowalne na MVP (§3.6 e-mail).
- Komentarze bez jawnej anonimizacji przed delete zostawiłyby starą etykietę autora – dlatego UPDATE jest obowiązkowy.

## Success Criteria (Summary)

- Fan usuwa konto z hasłem → nie może się zalogować ponownie.
- Jego komentarze nadal widoczne jako „Usunięty użytkownik”.
- `npm run verify` zielone.

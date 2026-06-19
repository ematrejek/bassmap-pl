---
change_id: account-deletion
reviewed_at: 2026-06-19
reviewer: Cursor Agent
plan: context/changes/account-deletion/plan.md
verdict: approved-with-amendments
---

# Plan Review: account-deletion (S-16)

## Werdykt

**Zatwierdzony z poprawkami** – plan jest wykonalny, spójny z FR-022, polityką §4 i handoffem S-15. Krytyczna kolejność (anonimizacja komentarzy przed `deleteUser`) i migracja FK sugestii są trafne. Poprawki z tego przeglądu zostały wpisane do `plan.md`. Można startować **`/10x-implement account-deletion`**.

## Scorecard (5 punktów)

| Obszar | Ocena | Uwagi |
| ------ | ----- | ----- |
| **Zgodność z produktem** | 5/5 | FR-022 w pełni: potwierdzenie hasłem, anonimizacja komentarzy, usunięcie danych Auth; zgodne z decyzją Option B (2026-06-15). |
| **Architektura** | 4/5 | Service role + jawny UPDATE komentarzy – właściwe; brakowało doprecyzowania admin UI po `SET NULL` na sugestiach i kolejce moderacji. |
| **Wykonalność faz** | 5/5 | 5 faz logicznych, ~1–2 sesje realistyczne; reuse `AlertDialog`, `createServiceRoleClient`, wzorce fan API. |
| **Testowalność** | 4/5 | Unit + integracja z jednorazowym użytkownikiem – dobry wzorzec; dopisać test „złe hasło nie usuwa”. |
| **Ryzyka / deploy** | 4/5 | Częściowa awaria (anonimizacja OK, delete fail) opisana; legal lepiej w tej samej sesji co deploy, nie tylko przy archive. |

**Średnia: 4.4/5**

## Mocne strony

1. **Wykrycie konfliktu CASCADE na `change_suggestions`** – bez migracji sugestie byłyby kasowane; plan naprawia to przed `deleteUser`.
2. **Jawna anonimizacja `author_label`** – FK `SET NULL` na `author_id` nie wystarczy; plan nie polega wyłącznie na kaskadzie DB.
3. **Weryfikacja hasła przez `signInWithPassword`** – prostsze niż osobny RPC; spójne z e-mail/hasło auth w projekcie.
4. **Blokada admina** – chroni jedynego admina i spójne z `/api/fan/*`.
5. **Scope control** – brak karencji, eksportu danych, panelu admin-delete – sensowne MVP north star Partii II.
6. **Stała `DELETED_USER_AUTHOR_LABEL`** – jeden punkt prawdy dla serwisu, testów i przyszłego UI.

## Znalezione luki (i poprawki)

### 1. Pending eventy znikają z kolejki moderacji (krytyczne)

`admin/index.astro` filtruje „Do moderacji” przez:

```typescript
function isFanSubmission(event: Event): boolean {
  return event.status === "pending" && event.createdBy !== null;
}
```

Po usunięciu konta `events.created_by` → `NULL` (FK `SET NULL`). Zgłoszenie **pending** ląduje w „Wszystkie wydarzenia” **bez** przycisków Opublikuj/Odrzuć – admin nie może go moderować.

**Poprawka (Phase 4 lub osobny podpunkt Phase 5):** zmienić na `return event.status === "pending"` (w aplikacji tylko fan tworzy `pending`). W kolumnie Zgłaszający: „Nieznany użytkownik” gdy `createdBy === null` – wzorzec już istnieje w `AdminEventsTable`.

### 2. Nullable `submittedBy` – typy i panel admina

Po migracji `submitted_by` może być `NULL`. Plan nie wymienia aktualizacji:

| Plik | Zmiana |
| ---- | ------ |
| `src/types.ts` | `submittedBy: string \| null` |
| `src/lib/events/suggestion-mapper.ts` | `submitted_by: string \| null` |
| `src/lib/services/change-suggestions.ts` | typy wiersza |
| `src/pages/admin/index.astro` | `suggestionSubmitterIds` – `.filter((id): id is string => id !== null)`; `toSuggestionRow` – nie wołać `get(null)` |

`ChangeSuggestionsTable` przy braku profilu pokazuje „–” – **opcjonalnie** zamienić na `DELETED_USER_AUTHOR_LABEL` dla spójności z komentarzami.

### 3. Integracja UI profilu – `isAdmin`

Plan mówi o `ProfileSection.tsx` **i** `profile.astro` z `isAdmin`. `ProfileSection` nie przyjmuje dziś `isAdmin`.

**Poprawka:** logika warunkowa w `profile.astro` – fan: `<ProfileSection>` + `<DeleteAccountSection client:load />`; admin: osobny akapit (bez island delete). Nie mieszać guarda admina wewnątrz `ProfileSection` bez nowego propa.

### 4. Legal – timing

Plan odkłada legal na `/10x-archive`. AGENTS.md wymaga aktualizacji przy archive slice UGC; **przed produkcją** §5.1 i §3.6 muszą opisywać działającą funkcję (inaczej użytkownik widzi przycisk, a dokument mówi „wyślij e-mail”).

**Poprawka:** legal w **Phase 5 tej samej sesji co kod**, przed deployem – archive tylko potwierdza datę `LEGAL_UPDATED_AT`.

### 5. `fetch` w UI – nagłówek JSON

W `DeleteAccountSection` dodać:

```typescript
headers: { "Content-Type": "application/json" }
```

(bez tego Astro/API może nie sparsować body).

### 6. Test integracyjny – złe hasło

Plan wymienia scenariusz ręczny, ale nie w pliku testu. Dodać w `account-deletion.test.ts`:

- wywołanie serwisu / symulacja API ze złym hasłem → użytkownik nadal istnieje, komentarze bez anonimizacji.

### 7. `signInWithPassword` przed delete

Weryfikacja hasła **odświeża sesję** w cookie clientcie – akceptowalne. Po `deleteUser` obowiązkowy `signOut()` (plan ma). Nie wywoływać `deleteUser` na cookie clientcie – tylko service role (plan OK).

### 8. Częściowa awaria – doprecyzowanie komunikatu

Gdy anonimizacja przeszła, a `deleteUser` fail: użytkownik nadal może się logować, komentarze już „Usunięty użytkownik”. Komunikat API: ogólny błąd + „skontaktuj się z administratorem” (plan OK). **Nie** próbować rollbacku `author_label` w MVP.

### 9. Nazwa constraintu FK (niski risk)

`DROP CONSTRAINT IF EXISTS change_suggestions_submitted_by_fkey` – standardowa nazwa Postgresa dla inline FK. Przy `db reset` lokalnie zweryfikować w fazie 1; w razie innej nazwy użyć zapytania do `information_schema`.

## Otwarte (nie blokują implementacji)

- Rate limit / Turnstile na delete – świadomie poza MVP.
- Użytkownicy OAuth bez hasła – projekt używa e-mail/hasło; magic link poza scope.
- Rollback anonimizacji przy failed delete – rzadki edge case; support e-mail.
- E2E Playwright – manual checklist wystarczy.
- Admin usuwanie konta innych użytkowników – poza scope; e-mail §3.6.

## Rekomendacja kolejności

1. **Faza 1** – migracja FK (blokuje poprawne zachowanie sugestii).
2. **Faza 2–3** – serwis + API; najpierw zielone testy unit.
3. **Faza 4** – UI profilu + **fix kolejki moderacji** (`isFanSubmission`).
4. **Faza 5** – integracja + **legal w tej samej sesji** + `npm run verify`.

## Następny krok

`/10x-implement account-deletion`

# Wykrywanie duplikatów wydarzeń (S-13) \u2013 Plan Brief

> Full plan: `context/changes/duplicate-event-detection/plan.md`

## What & Why

Przy dodawaniu wydarzenia (fan lub admin) system sprawdza, czy w bazie jest już **bardzo podobny** wpis – po **nazwie** (dopasowanie „rozmyte”, nie tylko identyczny tekst), **dacie** (ten sam dzień w strefie Polski) i **lokalizacji** (ten sam adres albo bliskie współrzędne). Zamiast ślepo tworzyć duplikat użytkownik dostaje **ostrzeżenie** i może anulować, kontynuować mimo ostrzeżenia albo – jako fan – wysłać **krótką sugestię zmian** do admina.

**Dlaczego teraz:** S-12 i S-17 są gotowe; bez S-13 każde kolejne zgłoszenie fana może powielać ten sam event w kolejce moderacji.

## Starting Point

- Fan i admin używają wspólnego `EventForm.tsx` (`variant="fan"` vs admin); create idzie na `POST /api/fan/events` lub `POST /api/admin/events`.
- Tabela `events` ma `name`, `starts_at`, `city`, `venue_name`, adres lub współrzędne, statusy `published` / `pending` / …
- **Brak** logiki podobieństwa, endpointu sprawdzania i tabeli sugestii.
- Panel admina (`admin/index.astro`) ma sekcje „Do moderacji” i „Wszystkie wydarzenia” – bez „Sugestie zmian”.

## Desired End State

1. Przed zapisem formularz woła `POST .../check-similar` i przy trafieniu pokazuje **AlertDialog** (wzorzec S-17).
2. **Fan:** komunikat z nazwą podobnego eventu + link; przyciski: Anuluj / Wyślij mimo to / **Zasugeruj zmiany** (pole tekstowe → zapis w `change_suggestions`).
3. **Admin:** komunikat z linkiem do **edycji** istniejącego eventu + Anuluj / Dodaj mimo to.
4. Admin w panelu widzi kolejkę **Sugestie zmian** (osobna od moderacji nowych zgłoszeń S-12) i może oznaczyć jako przyjęte / odrzucone.
5. Polityka prywatności i regulamin opisują przetwarzanie sugestii (UGC).

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Reakcja na duplikat | Ostrzeżenie (dialog), nie twarda blokada | Roadmapa mówi „ostrzeżenie”; mniej irytacji przy fałszywych trafieniach | Plan |
| Fuzzy nazwa | **pg_trgm** w PostgreSQL | Skalowalne dopasowanie literówek bez pobierania całej bazy do aplikacji; użytkownik delegował wybór techniczny | Plan |
| Próg podobieństwa nazwy | `similarity() >= 0.45` (stała w kodzie) | Konserwatywny start – roadmapa: unikać fałszywych pozytywów | Plan |
| Kandydaci w bazie | `published` + `pending` (bez własnych pending fana) | Łapie duplikaty w kolejce moderacji | Plan |
| Data | Ten sam dzień kalendarzowy (`Europe/Warsaw`) | Spójne z `is_upcoming()` i filtrami odkrywania | Plan |
| Lokalizacja | Znormalizowany adres **lub** współrzędne ≤ ~100 m | Oba tryby formularza (adres / współrzędne) | Plan |
| Moment sprawdzenia | Osobny endpoint przed create | Szybka odpowiedź bez tworzenia rekordu; czysty UX dialogu | Plan |
| Sugestia z flow duplikatu | Minimalna tabela + kolejka admina | Spełnia intencję roadmapy; S-14 doda przycisk na stronie eventu | Plan |
| pg_trgm (dla właściciela) | Rozszerzenie bazy „trigram” – porównuje fragmenty nazwy | Działa w Supabase; nie wymaga AI ani osobnej usługi | Plan |

## Scope

**In scope:**

- Migracja: `pg_trgm`, indeks GIN na `events.name`, tabela `change_suggestions` + RLS
- Moduł `src/lib/events/similarity.ts` (normalizacja adresu, haversine, orchestracja zapytania)
- Serwis `findSimilarEvents()` w `events.ts` lub osobnym pliku
- API: `check-similar` (fan + admin), `POST` sugestii, admin status sugestii
- UI: dialog duplikatu w `EventForm`, sekcja panelu admina
- Legal sync: polityka + regulamin + `LEGAL_UPDATED_AT`
- Testy jednostkowe (matching, API) + integracja RLS sugestii

**Out of scope:**

- Przycisk „Zasugeruj zmiany” na stronie szczegółów opublikowanego eventu (**S-14**)
- Pełny formularz diff pól eventu (S-14)
- Komentarze (S-15), usuwanie konta (S-16)
- Automatyczne łączenie / merge duplikatów w bazie
- Tuning progu przez UI admina

## Architecture / Approach

```
EventForm submit
    → validateBeforeSubmit (jak dziś)
    → POST /api/{fan|admin}/events/check-similar  (JSON jak create, bez consent)
    → jeśli matches[]: AlertDialog
         fan: Anuluj | Wyślij mimo to | Zasugeruj zmiany → POST /api/fan/change-suggestions
         admin: Anuluj | Dodaj mimo to | link → /admin/events/[id]/edit
    → jeśli kontynuacja: performSubmit() (bez zmian w create API)
```

SQL zawęża kandydatów: miasto + dzień + status + `similarity(name, $input) >= 0.45`. Serwis TypeScript filtruje po adresie lub odległości współrzędnych. Sugestie trafiają do `change_suggestions` ze statusem `pending`; admin zmienia status przez PATCH.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Schema | pg_trgm, `change_suggestions`, typy, mapper | Extension musi być dozwolone w Supabase |
| 2. Serwis podobieństwa | `findSimilarEvents` + normalizacja | Fałszywe trafienia – próg 0.45 do ręcznej weryfikacji |
| 3. API | check-similar + sugestie + admin status | Spójność payloadu z `parseEventCreate` |
| 4. UI | Dialog w EventForm + sekcja admina | Duży `EventForm.tsx` – izolacja nowego dialogu |
| 5. Testy + legal | unit/integracja, dokumenty prawne | Tekst prawny – review właściciela przed prod |

**Prerequisites:** S-12 + S-17 done; migracja Supabase; GitHub issue [#25](https://github.com/ematrejek/bassmap-pl/issues/25).

**Estimated effort:** ~3 sesje implementacji w 5 fazach.

## Open Risks & Assumptions

- Próg `0.45` może wymagać korekty po pierwszych zgłoszeniach fanów (za mało / za dużo ostrzeżeń).
- Fan przy `pending` innych użytkowników widzi **nazwę** nieopublikowanego eventu w dialogu – zaakceptowane przy planowaniu.
- S-14 będzie reużywać tabelę `change_suggestions` i panel admina – kolumna `source` rozróżnia pochodzenie.

## Success Criteria (Summary)

- Fan/admin przy oczywistym duplikacie widzi dialog z nazwą istniejącego eventu przed zapisem.
- Fan może wysłać tekstową sugestię zamiast tworzyć nowy wpis; admin widzi ją w osobnej sekcji panelu.
- `npm run lint` i `npm run build` przechodzą; testy matchingu i RLS sugestii są zielone.

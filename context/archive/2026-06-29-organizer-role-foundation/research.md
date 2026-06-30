---
date: 2026-06-29T20:56:00+02:00
researcher: GPT-5.5
git_commit: 8224a26a2d355db3f3ac19ecc379cf82168146f4
branch: main
repository: bassmap-pl
topic: "organizer-role-foundation – rola organizatora, wniosek i ręczna weryfikacja"
tags: [research, codebase, auth, roles, admin, supabase, rls, organizer]
status: complete
last_updated: 2026-06-29
last_updated_by: GPT-5.5
---

# Research: organizer-role-foundation

**Date**: 2026-06-29T20:56:00+02:00  
**Researcher**: GPT-5.5  
**Git Commit**: `8224a26a2d355db3f3ac19ecc379cf82168146f4`  
**Branch**: `main`  
**Repository**: `bassmap-pl`

## Research Question

Jak przygotować fundament F-05: nowa rola `organizer`, formularz wniosku o status organizatora, ręczna akceptacja/odrzucenie przez admina oraz guardy API/middleware pod późniejszy self-service organizatora?

## Summary

Kod ma obecnie prosty, binarny model uprawnień: użytkownik jest albo zwykłym fanem, albo adminem. Rola admina nie jest trzymana w profilu użytkownika ani w JWT, tylko w tabeli `admin_allowlist` i sprawdzana przez funkcję SQL `is_admin()`. Aplikacja czyta ten wynik w middleware i w guardach API. To jest najlepszy wzorzec dla organizatora: osobna tabela przyznanych ról organizatora, funkcja SQL `is_organizer()`, resolver `resolveIsOrganizer()`, `locals.isOrganizer` i guard `requireOrganizer()`.

Wniosek organizatora powinien być osobną kolejką moderacji, podobną do istniejących zgłoszeń fanów i sugestii zmian. Najbezpieczniejszy model to tabela `organizer_applications` ze statusem `pending` / `approved` / `rejected`, plus osobna tabela `organizer_roles`, do której admin dopisuje użytkownika podczas akceptacji. Akceptacja powinna być atomowa, czyli w jednej funkcji SQL lub jednej operacji serwisowej: zmienia status wniosku i nadaje rolę organizatora razem.

F-05 nie powinien jeszcze pozwalać organizatorowi publikować eventów od razu ani tworzyć ogłoszeń na forum. To należy do S-25 (`organizer-self-service`). F-05 ma jedynie odblokować ten późniejszy slice przez wiarygodną rolę i sprawdzanie uprawnień.

## Detailed Findings

### Auth, Role And Middleware

- `src/lib/auth/admin.ts:3-15` zawiera `resolveIsAdmin()`, który zwraca `false`, jeśli nie ma użytkownika albo RPC `is_admin` zwróci błąd. To jest wzorzec fail-closed: przy problemie z bazą użytkownik nie dostaje przypadkiem roli.
- `src/lib/auth/guards.ts:10-29` ma dwa poziomy ochrony API: `requireAuth()` dla zalogowanego użytkownika i `requireAdmin()` dla admina. F-05 powinien dodać analogiczny `requireOrganizer()` oraz prawdopodobnie `requireAdminOrOrganizer()` dopiero w S-25, jeśli będą endpointy wspólne.
- `src/middleware.ts:13-25` tworzy klienta Supabase, pobiera użytkownika i ustawia `context.locals.isAdmin`. Nowa rola wymaga analogicznego `context.locals.isOrganizer`.
- `src/middleware.ts:42-56` chroni publiczne ścieżki konta oraz `/admin`. Dla organizatora warto dodać osobne ścieżki dopiero wtedy, gdy powstanie panel organizatora. W F-05 wystarczy przygotować `locals` i guardy, a formularz wniosku może żyć w strefie zalogowanego fana.
- `src/env.d.ts:1-6` deklaruje obecnie tylko `user` i `isAdmin`. Po F-05 typ `App.Locals` musi zawierać też `isOrganizer`.
- Kilka endpointów fana celowo blokuje admina przez `context.locals.isAdmin`, np. `src/pages/api/fan/profile.ts` i `src/pages/api/fan/account/delete.ts`. Ponieważ organizator ma być dodatkową rolą fana, nowe sprawdzenia nie mogą blokować `isOrganizer` w ścieżkach fana.

Permalinki:

- [`resolveIsAdmin`](https://github.com/ematrejek/bassmap-pl/blob/8224a26a2d355db3f3ac19ecc379cf82168146f4/src/lib/auth/admin.ts#L3-L15)
- [`requireAuth` / `requireAdmin`](https://github.com/ematrejek/bassmap-pl/blob/8224a26a2d355db3f3ac19ecc379cf82168146f4/src/lib/auth/guards.ts#L10-L29)
- [`middleware` locals i ochrona tras](https://github.com/ematrejek/bassmap-pl/blob/8224a26a2d355db3f3ac19ecc379cf82168146f4/src/middleware.ts#L13-L56)

### Admin Panel And Moderation Queues

- `src/pages/admin/index.astro:23-28` ładuje dane panelu admina z serwisów: wydarzenia i sugestie zmian. Dla wniosków organizatora należy dodać trzeci serwis, np. `listOrganizerApplicationsForAdmin()`.
- `src/pages/admin/index.astro:31-38` dzieli eventy na `pending` i pozostałe przez lokalną funkcję `isFanSubmission()`. To prosty wzorzec dla sekcji „Wnioski organizatorów”.
- `src/pages/admin/index.astro:138-168` pokazuje dwie osobne kolejki: „Sugestie zmian” i „Do moderacji”. Wnioski organizatora powinny być trzecią osobną sekcją, aby nie mieszać ich ze zgłoszeniami eventów.
- `src/pages/api/admin/events/[id]/status.ts:24-67` pokazuje wzorzec endpointu admina: `requireAdmin`, walidacja `zod`, sprawdzenie statusu `pending`, wywołanie serwisu i odpowiedź JSON.
- `src/pages/api/admin/change-suggestions/[id]/status.ts:24-58` jest bardzo podobnym endpointem dla `accepted` / `rejected`. To najbliższy szablon dla `POST`/`PATCH /api/admin/organizer-applications/[id]/status`.
- `src/lib/services/change-suggestions.ts:261-299` robi ostrożne przejście `pending -> accepted` z warunkiem `.eq("status", "pending")` i rollbackiem, jeśli druga operacja się nie uda. Przy nadaniu roli organizatora lepiej uniknąć rollbacku w TypeScript i użyć jednej funkcji SQL, która zmieni status i dopisze rolę w jednej transakcji.

Permalinki:

- [`Panel admina – sekcje moderacji`](https://github.com/ematrejek/bassmap-pl/blob/8224a26a2d355db3f3ac19ecc379cf82168146f4/src/pages/admin/index.astro#L123-L187)
- [`Event status API`](https://github.com/ematrejek/bassmap-pl/blob/8224a26a2d355db3f3ac19ecc379cf82168146f4/src/pages/api/admin/events/%5Bid%5D/status.ts#L24-L67)
- [`Change suggestion status API`](https://github.com/ematrejek/bassmap-pl/blob/8224a26a2d355db3f3ac19ecc379cf82168146f4/src/pages/api/admin/change-suggestions/%5Bid%5D/status.ts#L24-L58)
- [`Race-safe suggestion apply`](https://github.com/ematrejek/bassmap-pl/blob/8224a26a2d355db3f3ac19ecc379cf82168146f4/src/lib/services/change-suggestions.ts#L261-L299)

### Database, RLS And Role Storage

- `supabase/migrations/20260610100000_create_events.sql:94-118` tworzy `admin_allowlist` i pierwotne `is_admin()`. `20260611140000_fix_is_admin_use_uid.sql:4-20` wzmacnia funkcję tak, żeby porównywała po `auth.uid()` i `auth.users`, nie tylko po e-mailu z JWT. `is_organizer()` powinno iść tym drugim, bezpieczniejszym wzorcem.
- `supabase/migrations/20260614120000_harden_admin_allowlist_email_privacy.sql:4-7` odbiera klientom dostęp do `admin_allowlist`. Dla `organizer_roles` należy zrobić podobnie: użytkownik może widzieć swój status przez funkcję lub kontrolowany SELECT, ale nie powinien czytać listy wszystkich organizatorów, jeśli nie ma takiej potrzeby produktu.
- `supabase/migrations/20260616120000_fan_event_submissions.sql:9-18` pozwala fanowi tworzyć tylko eventy `pending`. To ważne dla S-25: samo dodanie `isOrganizer` nie zmieni publikowania eventów. Później potrzebna będzie osobna polityka `events_insert_organizer`, która pozwoli zweryfikowanemu organizatorowi dodać `published`.
- `supabase/migrations/20260616140000_duplicate_detection_and_suggestions.sql:26-39` pokazuje tabelę kolejki z `submitted_by`, `status`, `created_at`, `updated_at` i limitami długości. `organizer_applications` powinno mieć ten sam styl.
- `supabase/migrations/20260616140000_duplicate_detection_and_suggestions.sql:55-91` pokazuje RLS: admin widzi wszystko, fan widzi swoje, fan dodaje tylko własne `pending`, admin aktualizuje. To jest bezpośredni wzorzec dla wniosków organizatora.
- `supabase/migrations/20260617180300_harden_change_suggestions_rls.sql:22-44` dodaje trigger, który blokuje zmianę pól innych niż status. Taki trigger warto dodać także do `organizer_applications`, aby użytkownik nie zmienił treści wniosku po wysłaniu.
- `supabase/migrations/20260626100000_crew_teams.sql:55-67` pokazuje częściowy unikalny indeks dla jednej aktywnej prośby. W F-05 przyda się `UNIQUE (user_id) WHERE status = 'pending'`, żeby jeden użytkownik nie wysyłał wielu oczekujących wniosków naraz.
- `supabase/migrations/20260626110000_crew_team_requests.sql:306-385` pokazuje funkcję `SECURITY DEFINER`, która blokuje wiersz `FOR UPDATE`, sprawdza uprawnienia, zmienia status i wykonuje skutki uboczne. To najlepszy wzorzec dla `approve_organizer_application()`: zatwierdza wniosek i dopisuje rolę w `organizer_roles`.

Proponowany kierunek schematu:

```sql
CREATE TYPE public.organizer_application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.organizer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  business_name text NOT NULL,
  facebook_url text,
  instagram_url text,
  description text,
  status public.organizer_application_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organizer_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);
```

### Tests And Verification

- `tests/unit/require-admin.test.ts` jest szablonem dla testu `requireOrganizer`.
- Integracyjne testy RLS dla wniosków organizatora powinny wzorować się na `tests/integration/change-suggestions-rls.test.ts`, `tests/integration/crew-teams-rls.test.ts` i `tests/integration/fan-event-submit.test.ts`.
- Lekcja z `context/foundation/lessons.md:45-53` mówi, że przed pushem trzeba uruchomić `npm run verify`, bo `astro check` łapie błędy, których same testy Vitest mogą nie wykryć.
- Przy zmianach UI admina warto pamiętać o lekcji Radix: komponenty z Radix albo ciężkim stanem klienta osadzać w Astro przez `client:only="react"` (`context/foundation/lessons.md:55-63`).

## Code References

- `src/lib/auth/admin.ts:3-15` – resolver roli admina przez RPC `is_admin`.
- `src/lib/auth/guards.ts:10-29` – guardy `requireAuth` i `requireAdmin`.
- `src/middleware.ts:13-25` – ustawianie `locals.user` i `locals.isAdmin`.
- `src/middleware.ts:42-56` – ochrona ścieżek zalogowanego użytkownika i admina.
- `src/env.d.ts:1-6` – typy `App.Locals`.
- `src/pages/admin/index.astro:31-38` – podział eventów na kolejkę `pending` i katalog.
- `src/pages/admin/index.astro:138-168` – sekcje „Sugestie zmian” i „Do moderacji”.
- `src/pages/api/admin/events/[id]/status.ts:24-67` – zatwierdzanie/odrzucanie zgłoszeń eventów przez admina.
- `src/pages/api/admin/change-suggestions/[id]/status.ts:24-58` – status `accepted` / `rejected` dla sugestii.
- `src/lib/services/change-suggestions.ts:261-299` – ostrożna zmiana statusu z warunkiem `pending`.
- `supabase/migrations/20260611140000_fix_is_admin_use_uid.sql:4-20` – bezpieczna funkcja `is_admin()`.
- `supabase/migrations/20260614120000_harden_admin_allowlist_email_privacy.sql:4-7` – odcięcie bezpośredniego odczytu tabeli ról admina.
- `supabase/migrations/20260616120000_fan_event_submissions.sql:9-18` – fan może dodać tylko event `pending`.
- `supabase/migrations/20260616140000_duplicate_detection_and_suggestions.sql:26-91` – tabela kolejki i RLS dla sugestii zmian.
- `supabase/migrations/20260617180300_harden_change_suggestions_rls.sql:22-44` – trigger blokujący zmianę pól innych niż status.
- `supabase/migrations/20260626100000_crew_teams.sql:55-67` – jedna aktywna prośba przez częściowy indeks unikalny.
- `supabase/migrations/20260626110000_crew_team_requests.sql:306-385` – atomowa funkcja SQL dla odpowiedzi na prośbę.

## Architecture Insights

- Rola organizatora powinna być rolą dodatkową, nie zamiennikiem fana. Użytkownik nadal korzysta z profilu, forum, ekip i innych funkcji fana.
- Nie należy przenosić roli do `fan_profiles`, bo profil jest publiczny i służy prezentacji użytkownika. Uprawnienia powinny być osobnym modelem danych.
- Lepszy model to dwie tabele: `organizer_applications` jako historia wniosków i `organizer_roles` jako aktualny stan uprawnienia. Dzięki temu odrzucenie lub ponowny wniosek nie miesza się z pytaniem „czy ten użytkownik ma rolę”.
- API i RLS powinny działać warstwowo: guard w TypeScript daje czytelny błąd użytkownikowi, a RLS w Supabase chroni dane, jeśli ktoś ominie UI.
- Akceptacja wniosku powinna być atomowa. Jeśli status zmieni się na `approved`, ale rola nie zostanie dopisana, system będzie w niespójnym stanie.
- Formularz wniosku zbiera dane działalności i linki społecznościowe, więc wymaga synchronizacji dokumentów prawnych podczas implementacji: `src/pages/privacy-policy.astro`, `src/pages/terms.astro` i `LEGAL_UPDATED_AT` w `src/lib/legal/paths.ts`.
- Trzeba zdecydować w planie, co dzieje się przy usunięciu konta z `organizer_applications` i `organizer_roles`. Najprostsze MVP: `ON DELETE CASCADE` dla roli i wniosku, a eventy organizatora w S-25 zachowują `created_by ON DELETE SET NULL`, tak jak obecne zgłoszenia fanów.

## Historical Context

- `context/foundation/roadmap.md:571-583` definiuje F-05: rola `organizer`, formularz wniosku, kolejka admina, guardy API i middleware.
- `context/foundation/roadmap.md:585-595` definiuje S-25: dopiero zweryfikowany organizator publikuje eventy od razu i tworzy ogłoszenia na forum.
- `context/foundation/roadmap.md:675` zapisuje decyzję, że fan i organizator mogą być na jednym koncie.
- `context/foundation/roadmap.md:780-785` parkuje automatyczną weryfikację KRS/NIP oraz pełny portal organizatora.
- `context/foundation/partia-iii-shaping.md:65-73` mówi, że MVP weryfikacji organizatora ma być ręczny: wniosek, akceptacja/odrzucenie przez admina, potem rola `organizer`.
- `context/archive/2026-06-10-admin-role-guard/plan.md` jest historycznym wzorcem dla roli opartej o RPC, middleware, guardy i RLS.
- `context/archive/2026-06-15-fan-account-zone/change.md` jest historycznym wzorcem dla zgłoszenia użytkownika do kolejki admina.
- `context/archive/2026-06-19-account-deletion/plan.md` przypomina, że nowe tabele związane z użytkownikiem trzeba uwzględnić przy usuwaniu konta.
- `context/archive/2026-06-24-forum-threads/research.md` przypomina wzorzec: middleware + guard API + RLS oraz legal sync dla treści/danych użytkowników.

## Related Research

- `context/archive/2026-06-10-admin-role-guard/plan.md` – decyzje o roli admina i ochronie tras.
- `context/archive/2026-06-15-fan-account-zone/plan.md` – strefa fana, zgłoszenia eventów i moderacja.
- `context/archive/2026-06-19-change-suggestions/research.md` – kolejka sugestii zmian.
- `context/archive/2026-06-19-account-deletion/plan.md` – zachowanie danych po usunięciu konta.
- `context/archive/2026-06-24-forum-threads/research.md` – moderacja i legal sync dla treści społecznościowych.
- `context/archive/2026-06-25-s-24/plan.md` – wzorce próśb, akceptacji i danych kontaktowych.

## Open Questions

- Czy w formularzu wniosku wymagamy co najmniej jednego linku weryfikacyjnego, np. Facebook albo Instagram, czy wystarczy opis działalności? Roadmapa mówi o linkach FB/IG, ale nie precyzuje minimum.
- Czy odrzucony użytkownik może złożyć nowy wniosek od razu, czy dopiero po czasie? Technicznie łatwo pozwolić na nowy wniosek, blokując tylko drugi aktywny `pending`.
- Czy admin ma podawać powód odrzucenia widoczny dla użytkownika? Warto dodać opcjonalne `decision_reason`, bo pomaga w komunikacji i audycie.
- Czy na tym etapie potrzebna jest publiczna odznaka „zweryfikowany organizator” na profilu? To raczej poza F-05, chyba że formularz wniosku ma od razu pokazywać status na profilu.

---
change_id: friends-and-recommendations
topic: "S-23 Znajomi, polecenia eventów i powiadomienia"
tags: [research, codebase, friends, recommendations, notifications, email, s-23]
created: 2026-06-25
updated: 2026-06-25
---

# Research: S-23 Znajomi, polecenia eventów i powiadomienia (`friends-and-recommendations`)

## Pytanie badawcze

Jak zaimplementować slice **S-23** w BassMap PL: zaproszenia do znajomych, polecanie wydarzeń znajomym, panel powiadomień w aplikacji oraz opcjonalny e-mail, używając istniejących wzorców aplikacji Astro/Supabase.

## Zakres z roadmapy

Z `context/foundation/roadmap.md`:

- **Outcome:** fan wysyła i akceptuje zaproszenie do znajomych, poleca wydarzenie znajomemu, widzi panel powiadomień in-app, a e-mail jest opcjonalną fazą.
- **Change ID:** `friends-and-recommendations`
- **Issue:** #43, tytuł: "Znajomi, polecenia, powiadomienia"
- **Prerequisites:** S-20 i S-19
- **Status przy starcie researchu:** `proposed`
- **Ryzyko:** średni zakres, warto rozważyć podział PR: znajomi -> polecenia -> e-mail
- **Unknown:** które zdarzenia wysyłają e-mail. Roadmap dopuszcza MVP bez e-maila: najpierw powiadomienia in-app, e-mail jako faza 2.

W tej sesji karta GitHub Project dla issue #43 została przeniesiona z `Todo` do `In Progress`.

## Najważniejszy wniosek

S-23 jest w większości nową funkcją. W kodzie nie ma jeszcze systemu znajomych, poleceń ani powiadomień. Są jednak mocne wzorce, które należy skopiować:

- profil fana z `fan_profiles`,
- relacja użytkownik-wydarzenie z `event_attendance`,
- społecznościowe UGC z forum i komentarzy,
- API z `requireAuth`, zod i `jsonResponse`,
- e-mail z `/api/contact/report-issue`,
- testy RLS dla Supabase.

## Istniejące fundamenty użytkownika

### Profil fana

Najważniejsze pliki:

- `supabase/migrations/20260624100000_fan_profiles.sql`
- `src/types.ts`
- `src/lib/services/fan-profile.ts`
- `src/pages/profile.astro`
- `src/pages/u/[login].astro`
- `src/pages/api/fan/profile.ts`
- `src/components/fan/PublicProfileView.tsx`
- `src/components/fan/ProfileView.tsx`
- `src/components/fan/ProfileEditor.tsx`
- `src/components/fan/ProfileShareButton.tsx`

Tabela `fan_profiles` jest naturalnym źródłem publicznej tożsamości fana:

- `user_id` jest kluczem głównym i wskazuje na `auth.users(id)`,
- `login` jest publicznym identyfikatorem użytkownika,
- RLS pozwala publicznie czytać profile, ale modyfikować tylko własny profil,
- publiczny profil działa pod `/u/[login]`.

Dla S-23 oznacza to:

- zaproszenia do znajomych powinny operować na `user_id`, nie na samym loginie,
- UI może pokazywać login i link do `/u/[login]`,
- wyszukiwanie odbiorcy zaproszenia lub polecenia może zaczynać się od loginu.

### Tożsamość i sesja

Najważniejsze pliki:

- `src/middleware.ts`
- `src/lib/supabase.ts`
- `src/lib/auth/guards.ts`
- `src/lib/auth/display-name.ts`

`src/middleware.ts` ustawia:

- `context.locals.user`,
- `context.locals.isAdmin`.

API powinno używać:

- `requireAuth(context.locals)` dla endpointów fana,
- `requireAdmin(context.locals)` tylko dla moderacji/admina,
- `createClient(context.request.headers, context.cookies)` dla Supabase SSR.

Warto użyć wzorca etykiety autora z `src/lib/auth/display-name.ts`:

- `loginFromEmailLocalPart(email)`,
- `authorLabelFromEmail(email)`,
- `DELETED_USER_AUTHOR_LABEL`.

Dla powiadomień warto zapisywać snapshot nazwy nadawcy, np. `actor_label`, tak jak komentarze zapisują `author_label`. Dzięki temu powiadomienie nadal ma sens, nawet jeśli konto autora zostanie później usunięte.

## Istniejące wzorce wydarzeń

Najważniejsze pliki:

- `src/pages/events/[id].astro`
- `src/pages/events.astro`
- `src/components/discovery/EventDiscoveryCard.tsx`
- `src/components/discovery/EventDiscoveryGrid.tsx`
- `src/components/discovery/EventList.tsx`
- `src/components/discovery/EventsMap.tsx`
- `src/lib/services/events.ts`
- `src/lib/events/mapper.ts`
- `src/types.ts`

Wydarzenia używają UUID jako ID. Link do szczegółów ma formę:

```text
/events/<event-id>
```

Nie ma slugów wydarzeń.

Najbliższy wzorzec dla "poleć wydarzenie" to S-19 `event_attendance`:

- `supabase/migrations/20260623100000_event_attendance.sql`
- `src/lib/services/event-attendance.ts`
- `src/pages/api/events/[id]/attendance.ts`
- `src/components/hooks/useEventAttendance.ts`
- `src/components/events/EventRsvpButtons.tsx`
- `src/components/events/EventAttendanceSection.tsx`

Ten wzorzec pokazuje:

- jak łączyć `user_id` z `event_id`,
- jak robić `UNIQUE (user_id, event_id)`,
- jak budować API pod `/api/events/[id]/...`,
- jak walidować UUID przez zod,
- jak używać `credentials: "include"` po stronie Reacta.

Dla S-23 endpoint polecania mógłby mieć jeden z kształtów:

```text
POST /api/events/[id]/recommendations
```

albo:

```text
POST /api/fan/recommendations
```

Pierwszy wariant jest bliższy istniejącemu układowi `attendance` i `comments`, bo akcja zaczyna się od konkretnego wydarzenia.

## Istniejące wzorce społecznościowe

Najważniejsze pliki:

- `supabase/migrations/20260624140000_forum_threads.sql`
- `src/pages/forum.astro`
- `src/pages/forum/[id].astro`
- `src/pages/api/forum/threads/index.ts`
- `src/pages/api/forum/threads/[id]/comments.ts`
- `src/pages/api/fan/forum-comments/[id].ts`
- `src/pages/api/admin/forum-threads/[id].ts`
- `src/pages/api/admin/forum-comments/[id].ts`
- `src/lib/services/forum-threads.ts`
- `src/lib/services/forum-comments.ts`
- `src/lib/services/forum-authors.ts`
- `src/lib/forum/thread-schema.ts`
- `src/lib/forum/comment-schema.ts`

Forum daje dobry wzorzec dla:

- dwóch powiązanych tabel,
- mapowania snake_case z bazy na camelCase w TypeScript,
- zod schema dla danych wejściowych,
- paginacji,
- rozdziału API fana i API admina,
- testów jednostkowych API i testów integracyjnych RLS.

Dla S-23 szczególnie ważny jest `src/lib/services/forum-authors.ts`, bo pokazuje jak rozwiązać publiczną etykietę autora na podstawie profilu fana.

## E-mail i powiadomienia

### Ważna rozbieżność

Roadmap mówi "opcjonalnie e-mail (Resend)", ale aktualny kod wysyłki e-maili używa **Cloudflare Email Binding**, nie SDK Resend.

Najważniejsze pliki:

- `src/pages/api/contact/report-issue.ts`
- `src/lib/cloudflare/email.ts`
- `src/lib/contact/report-issue-schema.ts`
- `src/components/contact/ReportIssueForm.tsx`
- `src/pages/report-issue.astro`
- `wrangler.jsonc`
- `worker-configuration.d.ts`

`src/lib/cloudflare/email.ts` pobiera binding:

```text
env.EMAIL
```

`wrangler.jsonc` deklaruje binding `send_email` pod nazwą `EMAIL`.

W praktyce S-23 ma dwie opcje:

1. **MVP bez e-maila**: tylko powiadomienia w aplikacji.
2. **E-mail jako faza 2**: użyć istniejącego Cloudflare Email Binding albo świadomie dodać Resend jako nową zależność i sekret.

Rekomendacja na plan: zostawić e-mail jako osobną fazę po MVP in-app, bo sam system znajomych i powiadomień jest już średnim zakresem.

### Brak istniejącego panelu powiadomień

W kodzie nie ma jeszcze:

- tabeli `notifications`,
- strony `/notifications`,
- dzwonka/panelu powiadomień,
- badge z liczbą nieprzeczytanych powiadomień.

Najbliższe miejsce integracji UI:

- `src/components/shell/AppMenu.tsx`
- `src/components/shell/AppShell.astro`
- `src/lib/routes.ts`
- `src/middleware.ts`

Jeśli powstanie chroniona strona, np. `/notifications`, trzeba dodać ją do `PROTECTED_ROUTES` w `src/middleware.ts`.

## API: konwencje do skopiowania

Każdy nowy endpoint pod `src/pages/api/` powinien:

- eksportować `const prerender = false`,
- używać uppercase handlerów `GET`, `POST`, `PUT`, `DELETE`,
- używać zod do walidacji,
- używać `requireAuth` dla akcji fana,
- zwracać JSON przez `jsonResponse`,
- trzymać logikę biznesową w `src/lib/services/`,
- mieć polskie komunikaty błędów.

Najlepsze pliki-wzorce:

- `src/pages/api/events/[id]/attendance.ts`
- `src/pages/api/events/[id]/comments.ts`
- `src/pages/api/forum/threads/index.ts`
- `src/pages/api/contact/report-issue.ts`
- `src/lib/api/json.ts`
- `src/lib/auth/guards.ts`

## Baza danych i RLS

S-23 prawdopodobnie potrzebuje trzech obszarów danych:

1. zaproszenia/relacje znajomych,
2. polecenia wydarzeń,
3. powiadomienia.

### Tabela zaproszeń do znajomych

Proponowany kierunek do planu:

```sql
friend_requests (
  id uuid primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

Ważne zasady:

- `requester_id <> addressee_id`,
- użytkownik nie może zaprosić samego siebie,
- trzeba zablokować duplikaty A -> B i B -> A,
- tylko odbiorca powinien akceptować lub odrzucać zaproszenie,
- obie strony powinny widzieć zaproszenie/relację.

W Supabase constraint na "nie duplikuj relacji w obie strony" najlepiej rozwiązać przez kolumny pomocnicze albo indeks funkcyjny na `least(requester_id, addressee_id)` i `greatest(requester_id, addressee_id)`.

### Tabela poleceń wydarzeń

Proponowany kierunek do planu:

```sql
event_recommendations (
  id uuid primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_label text not null,
  message text,
  created_at timestamptz not null default now(),
  read_at timestamptz
)
```

Możliwe uproszczenie: zamiast osobnej tabeli `event_recommendations`, traktować polecenie jako typ powiadomienia w tabeli `notifications`.

### Tabela powiadomień

Proponowany kierunek do planu:

```sql
notifications (
  id uuid primary key,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_label text not null,
  type text not null,
  event_id uuid references public.events(id) on delete cascade,
  friend_request_id uuid references public.friend_requests(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
)
```

RLS dla powiadomień jest trudniejsze niż w dotychczasowych publicznych tabelach:

- odbiorca powinien czytać tylko swoje powiadomienia,
- odbiorca powinien móc oznaczyć swoje powiadomienie jako przeczytane,
- inny użytkownik nie powinien bezpośrednio wstawiać dowolnego powiadomienia komuś innemu.

W planie trzeba rozważyć `SECURITY DEFINER` RPC albo bardzo precyzyjne polityki `WITH CHECK`.

## Testy do skopiowania

Testy jednostkowe API:

- `tests/unit/event-attendance-api.test.ts`
- `tests/unit/event-comments-api.test.ts`
- `tests/unit/forum-api.test.ts`
- `tests/unit/fan-profile-api.test.ts`

Testy schematów zod:

- `tests/unit/forum-schema.test.ts`
- `tests/unit/comment-schema.test.ts`
- `tests/unit/fan-schema.test.ts`
- `tests/unit/event-schema.test.ts`

Testy integracyjne RLS:

- `tests/integration/event-attendance-rls.test.ts`
- `tests/integration/event-comments-rls.test.ts`
- `tests/integration/forum-rls.test.ts`
- `tests/integration/fan-profile-rls.test.ts`
- `tests/integration/change-suggestions-rls.test.ts`
- `tests/helpers/supabase.ts`

Dla S-23 testy RLS będą ważne, bo pierwszy raz pojawia się prywatny odczyt dla dwóch konkretnych użytkowników, a nie publiczny odczyt dla wszystkich.

Możliwy brak w helperach: obecnie integracje mogą mieć tylko jednego standardowego nie-admina. Do testów znajomych będą potrzebni przynajmniej dwaj zwykli użytkownicy.

## Proponowany podział planu

Research potwierdza ryzyko z roadmapy: warto podzielić S-23 na fazy.

### Faza 1: znajomi

Cel:

- użytkownik widzi publiczny profil innego fana,
- może wysłać zaproszenie,
- odbiorca widzi zaproszenie,
- odbiorca akceptuje lub odrzuca,
- zaakceptowani znajomi są widoczni w profilu lub osobnej sekcji.

Wymaga:

- migracji `friend_requests` albo `friendships`,
- API fana,
- UI na profilu publicznym i/lub `/profile`,
- testów RLS i API.

### Faza 2: polecanie wydarzeń

Cel:

- użytkownik na stronie wydarzenia może polecić event znajomemu,
- odbiorca dostaje powiadomienie w aplikacji,
- powiadomienie linkuje do wydarzenia.

Wymaga:

- API rekomendacji,
- `notifications` albo `event_recommendations`,
- UI wyboru znajomego,
- panelu powiadomień.

### Faza 3: e-mail

Cel:

- wybrane powiadomienia mogą dodatkowo wysyłać e-mail.

Wymaga decyzji:

- Cloudflare Email Binding, bo już istnieje w kodzie,
- czy Resend, bo jest wspomniany w roadmapie i polityce prywatności.

Rekomendacja: e-mail zostawić jako opcjonalny etap po działającym MVP in-app.

## Ryzyka i decyzje dla planowania

1. **Model relacji znajomych:** jedna tabela `friend_requests` ze statusem czy osobne `friend_requests` + `friendships`.
2. **Duplikaty relacji:** trzeba technicznie zablokować sytuację A zaprasza B i B zaprasza A jako dwa oddzielne zaproszenia.
3. **Prywatność:** relacje i powiadomienia nie powinny być publiczne jak forum.
4. **Powiadomienia tworzone dla innej osoby:** standardowe RLS `user_id = auth.uid()` nie wystarczy 1:1.
5. **E-mail:** roadmap mówi Resend, kod używa Cloudflare Email Binding.
6. **Admin:** trzeba ustalić, czy admin może mieć znajomych. Istniejący `fan/profile.ts` blokuje profil fana dla admina, więc najprościej wyłączyć admina z funkcji społecznościowych.
7. **Legal sync:** S-23 jest na liście UGC/legal sync. Przy archiwizacji trzeba zaktualizować:
   - `src/pages/privacy-policy.astro`,
   - `src/pages/terms.astro`,
   - `LEGAL_UPDATED_AT` w `src/lib/legal/paths.ts`.

## Pliki, które warto otworzyć przed planowaniem

- `context/foundation/roadmap.md`
- `context/foundation/partia-iii-shaping.md`
- `src/types.ts`
- `src/middleware.ts`
- `src/lib/routes.ts`
- `src/lib/auth/guards.ts`
- `src/lib/services/fan-profile.ts`
- `src/pages/u/[login].astro`
- `src/components/fan/PublicProfileView.tsx`
- `src/pages/events/[id].astro`
- `src/pages/api/events/[id]/attendance.ts`
- `src/lib/services/event-attendance.ts`
- `src/pages/api/forum/threads/index.ts`
- `src/lib/services/forum-threads.ts`
- `src/pages/api/contact/report-issue.ts`
- `src/lib/cloudflare/email.ts`
- `src/components/shell/AppMenu.tsx`
- `supabase/migrations/20260623100000_event_attendance.sql`
- `supabase/migrations/20260624100000_fan_profiles.sql`
- `supabase/migrations/20260624140000_forum_threads.sql`

## Rekomendacja dla `/10x-plan`

Plan powinien zacząć od małego, bezpiecznego MVP:

1. Najpierw zaproszenia i zaakceptowani znajomi.
2. Potem polecenie eventu do istniejącego znajomego.
3. Potem panel powiadomień in-app.
4. E-mail dopiero jako opcjonalna faza, jeśli zakres nie urośnie za mocno.

Najbardziej konserwatywny wariant techniczny:

- nowa migracja z `friend_requests` i `notifications`,
- endpointy pod `src/pages/api/fan/friends/...` i `src/pages/api/events/[id]/recommendations.ts`,
- typy w `src/types.ts`,
- serwisy w `src/lib/services/friends.ts` i `src/lib/services/notifications.ts`,
- schematy zod w `src/lib/friends/` i `src/lib/notifications/`,
- UI na publicznym profilu i stronie wydarzenia,
- chroniona strona `/notifications`.

---
date: 2026-06-23T12:00:00+02:00
researcher: Cursor Agent
git_commit: 756ed796864e501ab32da75da4749a6f079448fe
branch: main
repository: bassmap-pl
topic: "S-19 event-attendance – RSVP «Idę» / «Interesuję się», liczniki, Moje eventy, profil"
tags: [research, codebase, S-19, event-attendance, rsvp, supabase, event-comments]
status: complete
last_updated: 2026-06-23
last_updated_by: Cursor Agent
change_id: event-attendance
roadmap_ref: S-19
---

# Research: S-19 event-attendance – RSVP «Idę» / «Interesuję się»

**Data:** 2026-06-23  
**Zmiana:** S-19 `event-attendance` · issue [#39](https://github.com/ematrejek/bassmap-pl/issues/39)  
**Commit:** `756ed796` (main)  
**Repozytorium:** [ematrejek/bassmap-pl](https://github.com/ematrejek/bassmap-pl)

## Research Question

Jak zaimplementować slice S-19 (`event-attendance`): przyciski «Idę» / «Interesuję się» na stronie wydarzenia, publiczne liczniki, sekcje w Moje eventy i profilu – na bazie istniejącego kodu i wzorców UGC z Partii II?

## Summary

1. **S-18 jest done** – kafelki listy mają placeholder licznika «0 Idzie»; sekcje «Idę» / «Obserwuję» w Moje eventy i skrót «Idę» na profilu są **gotowe wizualnie**, ale z pustymi danymi.
2. **Brak warstwy danych** – nie ma tabeli attendance, serwisu, API ani przycisków RSVP na `/events/[id]`. To pierwsza nowa tabela Supabase w Partii III.
3. **Najbliższy wzorzec implementacji:** `event_comments` (S-15) – migracja + RLS, serwis `ServiceResult`, API `GET/POST` na `/api/events/[id]/…`, React island z SSR prefetch na stronie wydarzenia.
4. **Główne miejsce akcji RSVP:** strona szczegółów `/events/[id]` (decyzja S-18) – między nagłówkiem z ceną a opisem lub obok przycisku «Kup bilet».
5. **Copy debt:** w kodzie jest «Obserwuję» i anchor `#obserwuje`; roadmapa wymaga «Interesuję się» i `#interesuje-sie`.
6. **Otwarte decyzje na `/10x-plan`:** dokładna liczba vs zaokrąglenie liczników; czy licznik «Interesuję się» na kafelku listy; zachowanie wierszy attendance przy usunięciu konta; aktualizacja polityki prywatności (nowe przetwarzanie – kto idzie na event).

## Detailed Findings

### Stan roadmapy i kontekstu produktowego

| Element | Źródło | Ustalenie |
| ------- | ------ | --------- |
| North star Partii III | [roadmap.md](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/foundation/roadmap.md#L27-L28) | Po S-18 → **S-19** |
| Outcome S-19 | [roadmap.md](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/foundation/roadmap.md#L459-L470) | Przyciski, liczniki, sekcje `#ide` / `#interesuje-sie`, profil |
| Copy RSVP | [partia-iii-shaping.md](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/foundation/partia-iii-shaping.md#L38-L41) | «Obserwuję» → **«Interesuję się»**; «Idę» bez zmian |
| Kolejność | [partia-iii-shaping.md](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/foundation/partia-iii-shaping.md#L95-L103) | S-18 → S-19 → S-20… |
| Placeholdery w kodzie | [partia-iii-shaping.md](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/foundation/partia-iii-shaping.md#L19) | Sekcje Moje eventy, wyłączony Edytuj profil |

### Placeholdery UI – co jest gotowe

#### Licznik na kafelku listy (S-18)

Stała placeholder – do zastąpienia prawdziwymi danymi:

```1:2:src/lib/events/rsvp-placeholder.ts
// S-19: replace with real attendance count
export const GOING_COUNT_PLACEHOLDER = 0;
```

Użycie w kafelku – tylko licznik «Idzie», bez «Interesuję się»:

```58:65:src/components/discovery/EventDiscoveryCard.tsx
        <div className="border-border/70 mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <span className="text-accent text-sm font-semibold">{formatEventPrice(event)}</span>

          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4" aria-hidden />
            <span className="text-foreground font-semibold">{GOING_COUNT_PLACEHOLDER}</span>
            Idzie
          </span>
```

Test oczekuje `0`: `tests/unit/event-discovery-card.test.tsx` (linie 44–53).

**Implikacja:** lista `/events` będzie potrzebowała **batch countów** (agregacja po wielu `event_id`) przy `listPublishedEvents` lub osobnym zapytaniu serwisowym.

#### Moje eventy – sekcje «Idę» / «Obserwuję»

```90:120:src/components/fan/MyEventsPage.tsx
  // Placeholder – slice «Idę» / «Obserwuję» (RSVP) w przyszłości.
  const goingEvents: Event[] = [];
  const watchingEvents: Event[] = [];
  ...
        title="Idę"
        id="ide"
  ...
        title="Obserwuję"
        id="obserwuje"
```

Strona Astro **nie ładuje** danych RSVP – tylko zgłoszenia i sugestie:

```18:21:src/pages/my-events/index.astro
const listResult = supabase && user ? await listEventsByCreator(supabase, user.id) : { data: [] as Event[] };
const suggestionsResult = supabase && user ? await listChangeSuggestionsForFan(supabase, user.id) : { data: [] };
```

Copy strony (linia 62) nadal mówi „obserwujesz” – do zmiany przy S-19.

#### Profil – skrót «Idę»

`ProfileSection` ma prop `goingEvents` (domyślnie `[]`), ale `profile.astro` go nie przekazuje:

```37:41:src/components/fan/ProfileSection.tsx
interface Props {
  email: string;
  /** Wydarzenia z «Idę» – placeholder do slice RSVP. */
  goingEvents?: Event[];
}
```

Brak sekcji «Interesuję się» na profilu – tylko «Idę» (roadmapa wymaga skrótu «Idę» na profilu; «Interesuję się» tylko w Moje eventy).

### Strona szczegółów wydarzenia – główna luka

[`src/pages/events/[id].astro`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/src/pages/events/[id].astro) ma: okładkę, nagłówek, opis, podgatunki, lineup, sugestie zmian, bilet, komentarze. **Brak jakiegokolwiek UI RSVP.**

Logiczne miejsce nowego islandu (np. `EventAttendanceSection`):

1. **Po nagłówku z ceną** (po linii 88) – użytkownik widzi „co to za impreza” i od razu może zareagować.
2. **Obok «Kup bilet»** (linie 136–145) – klaster akcji.

Wzorzec integracji jak komentarze – SSR prefetch + React:

```39:40:src/pages/events/[id].astro
const commentsResult = event && supabase ? await listEventComments(supabase, event.id) : null;
const initialComments = commentsResult && "data" in commentsResult ? commentsResult.data : [];
```

```147:155:src/pages/events/[id].astro
            <EventCommentsSection
              client:load
              eventId={event.id}
              initialComments={initialComments}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              currentUserId={user?.id ?? null}
              redirectPath={eventPagePath}
            />
```

**Decyzja S-18 (archiwum):** klik kafelka → szczegóły; RSVP **nie** na kafelku listy, tylko na stronie eventu. Kafelek pokazuje wyłącznie licznik «Idzie».

### Warstwa danych – stan: brak

| Warstwa | Stan |
| ------- | ---- |
| Migracje | Brak `event_attendance` / `rsvp` – są `event_comments`, `change_suggestions` |
| `src/types.ts` | Brak typów attendance – wzorzec: `EventComment` / `EventCommentRow` (linie 214–230) |
| Serwisy | Brak `event-attendance.ts` – wzorzec: `src/lib/services/event-comments.ts` |
| API | Brak tras attendance – wzorzec: `src/pages/api/events/[id]/comments.ts` |

### Wzorzec migracji + RLS (event_comments)

```3:49:supabase/migrations/20260619100000_event_comments.sql
CREATE TABLE public.event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ...
);

CREATE POLICY event_comments_select_public
  ...
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'published'));

CREATE POLICY event_comments_insert_authenticated
  ...
  WITH CHECK (author_id = auth.uid() AND EXISTS (... published ...));
```

**Propozycja schematu dla S-19:**

| Kolumna | Typ | Uwagi |
| ------- | --- | ----- |
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid FK → `auth.users` | `ON DELETE CASCADE` (brak publicznej etykiety jak przy komentarzach) |
| `event_id` | uuid FK → `events` | `ON DELETE CASCADE` |
| `status` | enum/text | `going` \| `interested` |
| `created_at` | timestamptz | domyślnie `now()` |
| UNIQUE | `(user_id, event_id)` | jeden status na user+event – toggle going ↔ interested |

RLS (analogia do komentarzy):

- **SELECT** – `anon` + `authenticated`, tylko gdy parent event `published` (liczniki publiczne).
- **INSERT / UPDATE / DELETE** – `authenticated`, `user_id = auth.uid()`, parent `published`.
- Rozważyć politykę **UPDATE** zamiast DELETE+INSERT przy zmianie statusu.

**Eligibility:** jak komentarze – `getPublishedEventById` w API (published, bez wymogu „upcoming”). Archiwalne opublikowane eventy mogą nadal zbierać RSVP wstecz – do potwierdzenia w planie.

### Wzorzec API (event_comments)

```26:48:src/pages/api/events/[id]/comments.ts
export const GET: APIRoute = async (context) => {
  ...
  const event = await getPublishedEventById(supabase, idResult.id);
  if (!event) {
    return jsonResponse({ error: "Nie znaleziono wydarzenia" }, 404);
  }
  const result = await listEventComments(supabase, idResult.id);
  ...
  return jsonResponse({ comments: result.data }, 200);
};
```

**Propozycja kontraktu S-19:**

```
GET    /api/events/[id]/attendance  → { goingCount, interestedCount, userStatus: null | "going" | "interested" }
PUT    /api/events/[id]/attendance  → { status: "going" | "interested" }  (auth) – upsert, wzajemne wykluczanie
DELETE /api/events/[id]/attendance  → usuń RSVP użytkownika (auth)
```

Alternatywa: `POST` z toggle – ważne, żeby **«Idę» i «Interesuję się»** były wzajemnie wykluczające (jeden wiersz per user+event).

Wymagania techniczne (jak w repo):

- `export const prerender = false`
- Zod UUID na `params.id`
- `requireAuth` dla mutacji
- Mapowanie błędu RLS `42501` w serwisie
- Gość na UI → link `SIGN_IN_PATH?redirect=…` (wzorzec `EventCommentsSection`)

### Middleware i trasy chronione

```7:7:src/middleware.ts
const PROTECTED_ROUTES = [PROFILE_PATH, MY_EVENTS_PATH, TEAM_PATH, FORUM_PATH];
```

`/events` i `/events/[id]` są **publiczne** – RSVP wymaga logowania w API, nie w middleware (jak komentarze). **Bez zmian middleware** dla S-19.

### React island – wzorzec interakcji

`EventCommentsSection` – `useState` + `fetch` do API, `readApiError`, gość → sign-in z redirect.

Nowy komponent (np. `EventAttendanceSection`) powinien przyjąć z SSR:

- `eventId`, `isLoggedIn`, `currentUserId`, `redirectPath`
- `initialGoingCount`, `initialInterestedCount`, `initialUserStatus`

### Usuwanie konta (S-16)

Komentarze: `author_id` SET NULL + anonimizacja `author_label`. Dla attendance prawdopodobnie **CASCADE DELETE** wierszy (brak publicznej etykiety „kto idzie”) – do zapisania w planie i ewentualnej aktualizacji `account-deletion.ts` jeśli potrzebna jawna ścieżka.

### Legal / RODO

Roadmapa nie wymienia S-19 w liście slice'ów z obowiązkowym legal sync przy archive (w przeciwieństwie do S-12–S-17, S-20+). Mimo to **«kto idzie na event»** to dane osobowe powiązane z kontem – warto zaplanować aktualizację `privacy-policy.astro` + `LEGAL_UPDATED_AT` (analogia §2.8 komentarzy).

## Code References

| Plik | Linie | Rola dla S-19 |
| ---- | ----- | ------------- |
| [`src/lib/events/rsvp-placeholder.ts`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/src/lib/events/rsvp-placeholder.ts#L1-L2) | 1–2 | Placeholder – do usunięcia/zastąpienia |
| [`src/components/discovery/EventDiscoveryCard.tsx`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/src/components/discovery/EventDiscoveryCard.tsx#L58-L65) | 58–65 | UI licznika «Idzie» |
| [`src/components/fan/MyEventsPage.tsx`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/src/components/fan/MyEventsPage.tsx#L90-L120) | 90–120 | Sekcje `#ide` / `#obserwuje` – podłączyć props |
| [`src/pages/my-events/index.astro`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/src/pages/my-events/index.astro#L18-L72) | 18–72 | SSR – dodać fetch list attendance |
| [`src/components/fan/ProfileSection.tsx`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/src/components/fan/ProfileSection.tsx#L37-L169) | 37–169 | Skrót «Idę» – podłączyć `goingEvents` |
| [`src/pages/profile.astro`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/src/pages/profile.astro#L17) | 17 | Brak przekazania `goingEvents` |
| [`src/pages/events/[id].astro`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/src/pages/events/[id].astro#L76-L155) | 76–155 | Główny punkt integracji RSVP |
| [`src/pages/api/events/[id]/comments.ts`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/src/pages/api/events/[id]/comments.ts) | cały plik | Wzorzec API |
| [`src/lib/services/event-comments.ts`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/src/lib/services/event-comments.ts) | cały plik | Wzorzec serwisu |
| [`supabase/migrations/20260619100000_event_comments.sql`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/supabase/migrations/20260619100000_event_comments.sql) | cały plik | Wzorzec RLS |
| [`tests/unit/event-comments-api.test.ts`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/tests/unit/event-comments-api.test.ts) | cały plik | Wzorzec testów unit API |
| [`tests/integration/event-comments-rls.test.ts`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/tests/integration/event-comments-rls.test.ts) | cały plik | Wzorzec testów RLS |

## Architecture Insights

1. **Placeholdery z wyprzedzeniem** – S-12 dodał sekcje Moje eventy, S-18 dodał `rsvp-placeholder.ts` i licznik na kafelku. S-19 **podmienia dane**, nie przebudowuje layoutu.
2. **Jeden wzorzec UGC na event page** – published parent → serwis → API → island → SSR na stronie. Komentarze są kanonicznym szablonem.
3. **Jawne filtry w serwisie** – lesson z `lessons.md`: publiczne odczyty nie polegają wyłącznie na RLS; liczniki i listy attendance powinny filtrować `published` w kodzie serwisu.
4. **Fan read + auth write** – gość widzi liczniki; mutacja tylko po logowaniu. Middleware nie blokuje strony eventu.
5. **Batch counts na liście** – bez N+1: agregacja `COUNT(*) GROUP BY event_id` lub jedno zapytanie z mapą countów przy renderze `/events`.
6. **Copy i anchory** – ujednolicić «Interesuję się» i `#interesuje-sie` w jednym PR z logiką.

## Historical Context (from prior changes)

| Artefakt | Wniosek |
| -------- | ------- |
| [`context/archive/2026-06-22-event-card-redesign/plan.md`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/archive/2026-06-22-event-card-redesign/plan.md) | S-18: placeholder `GOING_COUNT_PLACEHOLDER = 0`; prawdziwy RSVP → S-19; RSVP na stronie szczegółów |
| [`context/archive/2026-06-22-event-card-redesign/plan-brief.md`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/archive/2026-06-22-event-card-redesign/plan-brief.md) | Klik kafelka → `/events/[id]`; licznik tylko «Idzie» |
| [`context/archive/2026-06-15-fan-account-zone/reviews/impl-review.md`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/archive/2026-06-15-fan-account-zone/reviews/impl-review.md) | Puste sekcje «Idę»/«Obserwuję» zaakceptowane jako forward-looking |
| [`context/archive/2026-06-19-event-comments/plan.md`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/archive/2026-06-19-event-comments/plan.md) | Eligibility published; API GET public + POST auth; island na `[id].astro` |
| [`context/foundation/lessons.md`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/foundation/lessons.md) | Jawne filtry fan read; `npm run verify` przed pushem; `as unknown as APIContext` w testach |

## Related Research

- [`context/archive/2026-06-14-app-shell-navigation/research.md`](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/archive/2026-06-14-app-shell-navigation/research.md) – layout i nawigacja (placeholdery `/team`, `/forum`)
- Brak `research.md` w archiwach `event-comments` i `event-card-redesign` – decyzje w `plan.md` / `plan-brief.md`

## Proposed Implementation Checklist (for `/10x-plan`)

| # | Obszar | Zadanie |
| - | ------ | ------- |
| 1 | DB | Migracja `event_attendance` + RLS + indeksy `(event_id, status)`, `(user_id, status)` |
| 2 | Typy | `AttendanceStatus`, `EventAttendance`, `EventAttendanceRow` w `src/types.ts` |
| 3 | Serwis | `event-attendance.ts`: counts, upsert/toggle, list events by user+status, batch counts |
| 4 | API | `GET/PUT/DELETE /api/events/[id]/attendance` |
| 5 | UI event | `EventAttendanceSection` + podpięcie w `[id].astro` |
| 6 | UI lista | Zamiana placeholder w `EventDiscoveryCard` + batch counts w `events.astro` |
| 7 | Moje eventy | Props `goingEvents` / `interestedEvents` + SSR w `my-events/index.astro` |
| 8 | Profil | SSR `goingEvents` w `profile.astro` |
| 9 | Copy | «Obserwuję» → «Interesuję się»; `#obserwuje` → `#interesuje-sie` |
| 10 | Testy | Unit API + integration RLS + update `event-discovery-card.test.tsx` |
| 11 | Legal | Opcjonalnie privacy policy – nowy cel przetwarzania RSVP |
| 12 | Roadmap | Issue #39 → In Progress przy `/10x-implement`; PR `Refs #39` |

## Open Questions

1. **Liczniki** – dokładna liczba vs zaokrąglenie („10+”) przy małej skali? ([roadmap.md](https://github.com/ematrejek/bassmap-pl/blob/756ed796864e501ab32da75da4749a6f079448fe/context/foundation/roadmap.md#L467-L468)) – Owner: user.
2. **Kafelek listy** – czy pokazywać też licznik «Interesuję się», czy tylko «Idzie» (jak w S-18)?
3. **Archiwalne eventy** – czy RSVP dozwolone na przeszłych `published` (jak komentarze), czy tylko nadchodzące?
4. **Usuwanie konta** – CASCADE vs jawna ścieżka w `account-deletion.ts`?
5. **Legal sync** – czy S-19 wymaga aktualizacji polityki w tej samej sesji co implementacja (rekomendacja: tak, § nowy cel przetwarzania)?

---
topic: Event cover photos (roadmap S-03)
researcher: agent
date: 2026-06-12
change_id: event-cover-photos
---

# Research: Event cover photos

Grounding for `/10x-plan event-cover-photos`. Roadmap **S-03**: fan widzi zdjęcia okładek na kartach listy i stronie szczegółów; admin uploaduje plakat przy tworzeniu/edycji wydarzenia. S-02 świadomie odłożył to na osobny slice (placeholder graficzny, brak pola w DB).

## Executive summary

| Area | Verdict | Recommendation |
|------|---------|----------------|
| **Storage** | Brak w repo — zero bucketów, zero R2, zero upload API | **Supabase Storage** — publiczny bucket `event-covers`, spójny ze stackiem i PRD zero-cost (1 GB free tier) |
| **DB** | Tabela `events` bez kolumny na okładkę | Migracja: nullable `cover_path text` (ścieżka w buckecie, nie pełny URL) |
| **Admin upload** | `EventForm` wysyła tylko JSON (`fetch` + `Content-Type: application/json`) | Upload z przeglądarki admina przez ten sam klient Supabase SSR (sesja cookie) **albo** osobna trasa `POST /api/admin/events/cover` z `FormData` — preferuj **klient bezpośrednio do Storage** (mniej kodu na Workerze) |
| **Fan UI** | Placeholder tylko w `EventPreviewCard`; lista i szczegóły bez miniatury | Wspólny komponent `EventCover` z fallbackiem gradient „DnB”; miniatury w `EventList`, hero w `/events/[id]` |
| **Testy** | Vitest + integracja Supabase już działają | Unit: walidacja MIME/rozmiaru + helper URL; integracja: polityki Storage + `cover_path` w serwisie |

**Największe ryzyko:** kolejność create + upload (brak `event.id` przed pierwszym zapisem) oraz orphan files przy nieudanym PATCH. **Najtańsza ochrona:** upload po udanym `createEvent` (2 kroki w jednym submit handlerze) lub `cover_path` opcjonalny przy create.

---

## Outcome (z roadmapy)

Fan:
- widzi miniaturę okładki na karcie w liście (`EventList`),
- widzi okładkę w podglądzie po kliknięciu (`EventPreviewCard`),
- widzi większą okładkę na stronie szczegółów (`/events/[id]`).

Admin:
- może dodać/zmienić/usunąć okładkę w formularzu create/edit,
- istniejące wydarzenia bez okładki nadal działają (fallback jak dziś).

---

## Current state (verified in codebase)

### Baza i typy

Tabela `events` (`supabase/migrations/20260610100000_create_events.sql`) — **brak** pola na obraz. RLS: publiczny `SELECT` tylko `published` + `is_upcoming`; admin pełny CRUD.

`Event` / `EventRow` / `mapEventRow` / `toEventInsertRow` — **brak** pola cover (`src/types.ts`, `src/lib/events/mapper.ts`).

### Serwis i API

`src/lib/services/events.ts` — `select("*")` na wszystkich ścieżkach; po migracji nowa kolumna wejdzie automatycznie do mappera po rozszerzeniu typów.

Admin API (`src/pages/api/admin/events/index.ts`, `[id].ts`) — JSON + Zod (`parseEventCreate` / `parseEventUpdate`). **Brak** `multipart/form-data`, **brak** tras upload.

### UI fana (placeholdery)

| Plik | Stan |
|------|------|
| `EventList.tsx` | Tylko tekst — **brak** miniatury (roadmap mówi „karty”; trzeba dodać) |
| `EventPreviewCard.tsx` | Kwadrat 64×64, gradient + napis „DnB” |
| `events/[id].astro` | Brak sekcji hero — sam nagłówek tekstowy |

S-02 plan (`context/archive/2026-06-11-fan-event-discovery/plan.md`):

> Pole `image_url` / upload plakatów — placeholder graficzny na MVP; prawdziwe zdjęcia w osobnym slice.

### UI admina

`EventForm.tsx` — pola tekstowe + checkboxy; submit przez `fetch` JSON. **Brak** `<input type="file">`.

`AdminEventsTable` — lista tekstowa; miniatura opcjonalna (nice-to-have, nie w roadmap outcome).

### Infrastruktura

| Element | Stan |
|---------|------|
| `wrangler.jsonc` | Brak bindingu R2 |
| `astro.config.mjs` `env.schema` | Tylko `SUPABASE_URL`, `SUPABASE_KEY` |
| `supabase/config.toml` `[storage]` | `enabled = true`, `file_size_limit = "50MiB"`; **brak** skonfigurowanego bucketa (zakomentowany przykład `images`) |
| `src/lib/supabase.ts` | Tylko serwerowy klient SSR (cookie) — **brak** osobnego klienta browser; formularz admina i tak robi `fetch` do API, nie do Supabase z JS |

### Testy

Istnieją: `tests/unit/event-schema.test.ts`, integracje fan-read, mutation fixtures w `tests/helpers/`. Brak testów Storage.

---

## Storage options (challenge)

### A. Supabase Storage (recommended)

**Za:**
- Już używamy Supabase (auth + Postgres).
- Free tier: **1 GB** storage, **5 GB** egress/mies. — wystarczy na setki okładek MVP (~200–500 KB/plakat).
- Public bucket: fan czyta obraz bez JWT (CDN); upload/delete chronione RLS + `is_admin()` (jak przy `events`).
- Migracja SQL może utworzyć bucket + polityki obok tabeli `events`.

**Przeciw:**
- Osobny system (nie Cloudflare R2); egress liczy się przy trafficie na obrazy.
- Image transformation wymaga Pro — **poza scope**; serwujemy oryginał z `loading="lazy"` + CSS `object-cover`.

### B. Cloudflare R2

**Za:** Zero egress przy serwowaniu z tego samego ekosystemu co Worker.

**Przeciw:** Nowy binding w `wrangler.jsonc`, nowe sekrety/API upload na Workerze, osobne polityki dostępu — **więcej moving parts** niż Supabase Storage przy obecnym stacku. Odrzucone na ten slice.

### C. Tylko zewnętrzny URL (admin wkleja link)

**Za:** Zero Storage, jedna kolumna `cover_url text`.

**Przeciw:** Roadmap explicite: „storage + **upload** admina”; zewnętrzne linki mogą zniknąć (Facebook CDN), brak kontroli nad formatem. Odrzucone jako główna ścieżka; ewentualnie „paste URL” jako **parked** v2.

### D. Base64 w Postgres

Odrzucone — rozdmuchuje DB, złe dla cache i limitów 500 MB.

---

## Recommended design (for plan)

### 1. Schema

```sql
ALTER TABLE public.events ADD COLUMN cover_path text;
-- opcjonalnie: CHECK (cover_path IS NULL OR cover_path ~ '^[0-9a-f-]{36}/cover\.(jpg|jpeg|png|webp)$')
```

- **`cover_path` nullable** — istniejące wiersze = `NULL` = fallback UI.
- Konwencja ścieżki: `{event_uuid}/cover.{ext}` — jeden plik na event, łatwe `upsert` i cleanup.

### 2. Storage bucket (migracja SQL)

- Bucket: `event-covers`, **public: true** (fan read bez auth).
- Polityki na `storage.objects`:
  - `INSERT` / `UPDATE` / `DELETE`: `public.is_admin()`
  - `SELECT` na public bucket: nie wymaga polityki dla anon read (Supabase docs); upload nadal chroniony.
- Bucket-level: `allowed_mime_types`: `image/jpeg`, `image/png`, `image/webp`; `file_size_limit`: np. **2–5 MB** (plan wybierze dokładnie).

### 3. Public URL helper

`src/lib/storage/event-covers.ts`:

```ts
export function getEventCoverUrl(coverPath: string | null): string | null {
  if (!coverPath) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/event-covers/${coverPath}`;
}
```

`SUPABASE_URL` jest już w env serwerowym; na kliencie fan read dostaje gotowy `coverUrl` z SSR (jak `startsAt`) — **nie** eksponować klucza anon w nowym kliencie tylko po to.

### 4. Upload flow (admin)

**Rekomendacja: dwuetapowy submit w `EventForm` (bez nowego multipart API na start).**

1. Walidacja formularza (jak dziś) + opcjonalny plik (typ, rozmiar po stronie klienta).
2. `POST/PUT` JSON wydarzenia (bez pliku) — jak dziś.
3. Jeśli wybrano plik:
   - utworzyć klienta Supabase w przeglądarce (`createBrowserClient` z `@supabase/ssr` — ten sam wzorzec co serwer, cookies),
   - `storage.from('event-covers').upload(\`${eventId}/cover.webp\`, file, { upsert: true })`,
   - `PUT` JSON `{ coverPath: '...' }` lub rozszerzyć `updateEvent` o cover.
4. Przy **create**: krok 3 dopiero po `201` z `event.id`.
5. Przy **replace**: `upsert: true` nadpisuje; przy **remove cover**: `storage.remove` + `cover_path = null`.
6. Przy **delete event** (`deleteEvent`): usuń obiekt Storage jeśli `cover_path` ustawione.

**Alternatywa (większy scope):** `POST /api/admin/events/cover` z `FormData` na Workerze — proxy do Storage service role. Więcej kontroli walidacji po stronie serwera, ale Worker musi streamować body; **odłóż**, jeśli RLS + client-side walidacja wystarczą.

### 5. Fan UI

Wspólny komponent np. `EventCoverImage`:

- props: `coverUrl: string | null`, `alt`, `className`, `size: 'thumb' | 'card' | 'hero'`
- jeśli `coverUrl` — `<img src={...} alt={...} loading="lazy" decoding="async" className="object-cover" />`
- else — ten sam gradient „DnB” co dziś (wydzielony z `EventPreviewCard`)

Miejsca użycia:

| Plik | Zmiana |
|------|--------|
| `EventList.tsx` | Lewa miniatura (~48–64px) w wierszu karty |
| `EventPreviewCard.tsx` | Zamiana bloku „DnB” na `EventCoverImage` |
| `events/[id].astro` | Hero nad `<h1>` (aspect-ratio 16/9 lub 2/1) |

### 6. Zod / API

Rozszerzyć `commonEventFields` lub osobne pole opcjonalne:

- `coverPath`: `z.string().min(1).nullable().optional()` — ścieżka musi pasować do wzorca bucketu (unit test).
- Upload pliku **nie** przez JSON — tylko metadata `coverPath` po uploadzie.

### 7. Open Graph (opcjonalne, low cost)

Na `events/[id].astro` dodać `<meta property="og:image" …>` gdy `coverUrl` — lepsze udostępnianie linków. Nie blokuje slice; plan może włączyć w tej samej fazie co hero.

---

## Call graph (po implementacji)

```
Admin EventForm
  → parseEventCreate/Update (Zod)
  → POST/PUT /api/admin/events[*]     → createEvent / updateEvent (cover_path)
  → [if file] browser supabase.storage.upload
  → PUT cover_path (jeśli osobny krok)

Fan index.astro
  → listPublishedEvents → Event.coverPath → getEventCoverUrl (SSR)
  → DiscoveryShell → EventList / EventPreviewCard / EventsMap (mapa bez zmian)

Fan events/[id].astro
  → getPublishedEventById → hero cover
```

---

## Challenge notes

### „Wystarczy kolumna URL z Facebooka”

**Odrzucone** jako MVP — roadmap i change notes wymagają uploadu; zewnętrzne URL są kruche i nie spełniają „jednego źródła prawdy” o wizualce eventu.

### „Fan read przez RLS wystarczy, bez cover_path w serwisie”

**Odrzucone** — `lessons.md`: jawne filtry w serwisie; tu analogicznie jawne mapowanie `cover_path` → `coverUrl` w mapperze, nie poleganie na magicznym `select` bez typu.

### „Image resize na Workerze”

**Poza scope** — brak Pro Supabase transforms; ewentualnie admin uploaduje rozsądny rozmiar (walidacja max 2–5 MB + copy w UI „zalecane 1200×630”). Resize pipeline = osobny slice.

### „Miniatury na liście nie było w S-02”

Roadmap S-03 explicite: „na **kartach** i stronie szczegółów”. Lista musi dostać miniaturę — to nie scope creep.

---

## Files likely touched

| Warstwa | Pliki |
|---------|--------|
| DB | `supabase/migrations/YYYYMMDDHHmmss_event_cover_photos.sql` (kolumna + bucket + RLS storage) |
| Types | `src/types.ts` |
| Mapper | `src/lib/events/mapper.ts` |
| Schema | `src/lib/events/schema.ts` |
| Storage helper | `src/lib/storage/event-covers.ts` (nowy) |
| Service | `src/lib/services/events.ts` (`deleteEvent` cleanup, create/update cover_path) |
| Admin UI | `src/components/admin/EventForm.tsx` |
| Fan UI | `src/components/discovery/EventCoverImage.tsx` (nowy), `EventList.tsx`, `EventPreviewCard.tsx`, `src/pages/events/[id].astro` |
| Browser client | `src/lib/supabase-browser.ts` (nowy, jeśli upload z klienta) |
| Testy | `tests/unit/event-cover*.test.ts`, opcjonalnie `tests/integration/event-cover-storage.test.ts` |
| Fixtures | `tests/helpers/event-fixtures.ts`, `mutation-fixtures.ts` — opcjonalne `cover_path` |

**Bez zmian:** `EventsMap.tsx`, filtry fan, middleware, wrangler (przy Supabase Storage).

---

## Test recommendations (for `/10x-plan`)

| Warstwa | Co testować |
|---------|-------------|
| Unit | `getEventCoverUrl(null)` → null; poprawna ścieżka → URL; `coverPath` Zod odrzuca `../evil` |
| Unit | Walidacja rozszerzenia/MIME (jeśli wydzielona funkcja) |
| Integration | Service role: insert do `event-covers` jako admin JWT symulowany — lub test polityki: anon nie może upload, admin może |
| Integration | `listPublishedEvents` zwraca `coverPath` z wiersza; fan bez okładki → null |
| Regression | Istniejące testy `event-schema`, fan-read — zielone po dodaniu opcjonalnego pola |

Nie wymaga Playwright na ten slice — SSR `<img src>` wystarczy.

---

## Open decisions for plan (user/agent)

1. **Dokładny limit pliku** — 2 MB vs 5 MB (bucket vs UX).
2. **Czy okładka opcjonalna przy create** — rekomendacja: **tak** (nie blokować dodawania eventu bez plakatu).
3. **Czy przycisk „Usuń okładkę”** na edit — rekomendacja: **tak**.
4. **Format zapisu** — trzymać oryginalne rozszerzenie vs normalizacja do `.webp` — rekomendacja: **zachować jpeg/png/webp** (prostsze dla admina).
5. **Miniatura w `AdminEventsTable`** — opcjonalna faza 2 planu.

---

## Cost & ops

- Supabase free: 1 GB storage ≈ 2000–5000 okładek po ~200 KB.
- Egress 5 GB/mies. — przy ~100 KB/miniatura × wyświetlenia monitorować po launch; na MVP traffic bassmap.pl prawdopodobnie OK.
- Brak nowych sekretów poza istniejącymi `SUPABASE_*`.
- Deploy: migracja `supabase db push` / pipeline jak dotąd; bucket w SQL migracji.

---

## Next step

`/10x-plan event-cover-photos` — research pokrywa storage, schema, upload flow, UI touchpoints i testy; plan może od razu fazować: (1) migracja + helper, (2) admin upload, (3) fan UI + fallback.

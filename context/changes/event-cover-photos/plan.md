# Event Cover Photos Implementation Plan

## Overview

Slice **S-03**: admin może opcjonalnie wgrać okładkę wydarzenia (max **5 MB**, JPEG/PNG/WebP); fan widzi ją na liście, w podglądzie i na stronie szczegółów. Pliki w **Supabase Storage** (publiczny bucket `event-covers`); w bazie nullable `cover_path`. Istniejące wydarzenia bez okładki zachowują gradientowy fallback „DnB”.

## Current State Analysis

- Tabela `events` — brak kolumny na obraz (`supabase/migrations/20260610100000_create_events.sql`).
- `Event` / mapper / Zod schema — bez `coverPath` (`src/types.ts`, `src/lib/events/mapper.ts`, `src/lib/events/schema.ts`).
- Fan UI: placeholder tylko w `EventPreviewCard.tsx` (64×64 „DnB”); `EventList.tsx` bez miniatury; `events/[id].astro` bez hero.
- Admin: `EventForm.tsx` — wyłącznie JSON `fetch`; brak `<input type="file">`; `AdminEventsTable.tsx` — kolumna tekstowa bez miniatury.
- Brak bucketów Storage w migracjach; `wrangler.jsonc` bez R2.
- Vitest + integracja Supabase — gotowe (`tests/unit/`, `tests/integration/`).

### Key Discoveries:

- S-02 świadomie odłożył zdjęcia — `context/archive/2026-06-11-fan-event-discovery/plan.md` (out of scope `image_url`).
- Upload z przeglądarki admina przez `createBrowserClient` (`@supabase/ssr`) + cookie sesji — bez multipart API na Workerze.
- Przy **create** upload dopiero po `201` z `event.id` (research: ryzyko orphan files).
- `getEventCoverUrl(coverPath, supabaseUrl)` — fan dostaje gotowy URL z SSR; klucz anon tylko na chronionych stronach admina.
- `deleteEvent` musi usuwać obiekt Storage gdy `cover_path` ustawione.

## Desired End State

1. Admin na `/admin/events/new` i `/edit` może **opcjonalnie** wybrać plik (max 5 MB, jpeg/png/webp), zobaczyć podgląd; na edycji — **„Usuń okładkę”** czyści Storage + `cover_path`.
2. Tabela `/admin` pokazuje miniaturę okładki (lub placeholder) obok nazwy.
3. Fan na `/` widzi miniaturę na karcie listy, w podglądzie po kliknięciu i hero na `/events/[id]`; brak okładki → ten sam gradient „DnB”.
4. `npm run lint`, `npm run build`, `npm test`, `npm run test:ci` przechodzą.
5. Migracja zastosowana na produkcji (Supabase remote).

### Weryfikacja ręczna:

- Utworzenie eventu **bez** pliku — działa jak dziś.
- Utworzenie z plakatem — miniatura na liście fana i hero na szczegółach.
- Edycja: zamiana pliku, usunięcie okładki, usunięcie całego eventu (plik znika ze Storage).
- Plik > 5 MB lub zły typ — komunikat PL w formularzu, brak zapisu pliku.
- Udostępnienie linku `/events/[id]` z okładką — `og:image` w `<head>` (opcjonalnie w tej samej fazie co hero).

## What We're NOT Doing

- Cloudflare R2, resize/obróbka obrazów, Supabase Image Transformations (Pro).
- Wklejanie zewnętrznego URL zamiast uploadu.
- Okładka **obowiązkowa** przy tworzeniu wydarzenia.
- Zmiany mapy (`EventsMap`), filtrów fana, auth.
- Playwright / E2E przeglądarkowe.
- Usuwanie orphan files w tle (cron) — tylko best-effort przy delete/replace.

## Implementation Approach

Cztery fazy sekwencyjne:

1. **Fundament** — migracja SQL (kolumna + bucket + RLS Storage), typy, mapper, helpery URL/walidacji, Zod `coverPath`, serwis (persist + cleanup przy delete).
2. **Admin upload** — klient przeglądarkowy Supabase, rozszerzenie `EventForm` (file, podgląd, usuń), dwuetapowy submit (zapis eventu → upload → PATCH `coverPath`).
3. **UI fana + admin tabela** — `EventCoverImage`, lista/podgląd/szczegóły, miniatura w `AdminEventsTable`, enrichment `coverUrl` w Astro frontmatter.
4. **Testy** — unit helperów + schema; integracja `cover_path` w odczycie; regresja istniejących testów.

## Critical Implementation Details

- **Kolejność create:** `POST /api/admin/events` → odczyt `event.id` z JSON → `storage.upload(\`${id}/cover.${ext}\`, { upsert: true })` → `PUT` z `{ coverPath }`. Błąd uploadu po udanym create: pokaż komunikat PL („Wydarzenie zapisane, ale okładka nie została wgrana”) i przekieruj do edycji — event istnieje bez `cover_path`.
- **Ścieżka pliku:** `{event_uuid}/cover.{jpg|jpeg|png|webp}` — jeden obiekt na event; rozszerzenie z MIME uploadu.
- **Stałe:** `MAX_COVER_BYTES = 5 * 1024 * 1024`; bucket `file_size_limit = 5242880` w migracji.
- **Konfig Supabase w adminie:** przekaż `supabaseUrl` + `supabaseAnonKey` z `astro:env/server` w `new.astro` / `edit.astro` do `EventForm` (tylko trasy admin — fan nie dostaje klucza w HTML poza publicznym URL obrazów).

---

## Phase 1: Migracja, typy i warstwa domenowa

### Overview

Kolumna `cover_path`, bucket Storage z limitami, mapowanie w TypeScript, walidacja ścieżki, serwis usuwa plik przy `deleteEvent`.

### Changes Required:

#### 1. Migracja SQL

**File**: `supabase/migrations/20260612120000_event_cover_photos.sql`

**Intent**: Dodać nullable `cover_path`, utworzyć publiczny bucket `event-covers` (5 MB, dozwolone MIME obrazów), polityki RLS Storage dla admina.

**Contract**:

- `ALTER TABLE public.events ADD COLUMN cover_path text;`
- Opcjonalny CHECK: `cover_path IS NULL OR cover_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/cover\.(jpg|jpeg|png|webp)$'`
- `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('event-covers', 'event-covers', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT (id) DO UPDATE SET ...`
- Polityki `storage.objects`: `INSERT` / `UPDATE` / `DELETE` dla `authenticated` z `bucket_id = 'event-covers' AND public.is_admin()`

#### 2. Typy i mapper

**Files**: `src/types.ts`, `src/lib/events/mapper.ts`

**Intent**: `Event.coverPath: string | null`; `EventInsert` / `EventUpdate` opcjonalne `coverPath`; `EventRow.cover_path` w mapperze i `toEventInsertRow` / `toEventUpdateRow`.

#### 3. Helpery Storage

**File**: `src/lib/storage/event-covers.ts` (nowy)

**Intent**: Czyste funkcje bez side-effectów — testowalne unitowo.

**Contract**:

- `EVENT_COVERS_BUCKET = 'event-covers'`
- `MAX_COVER_BYTES = 5 * 1024 * 1024`
- `ALLOWED_COVER_MIME_TYPES` — `image/jpeg`, `image/png`, `image/webp`
- `getEventCoverUrl(coverPath: string | null, supabaseUrl: string): string | null`
- `buildCoverStoragePath(eventId: string, mimeType: string): string` — mapuje MIME → rozszerzenie
- `isValidCoverPath(path: string): boolean` — regex zgodny z CHECK
- `validateCoverFile(file: File): { ok: true } | { ok: false; error: string }` — rozmiar + MIME (dla klienta)
- `enrichEventWithCoverUrl<T extends Event>(event: T, supabaseUrl: string): T & { coverUrl: string | null }`

#### 4. Zod schema

**File**: `src/lib/events/schema.ts`

**Intent**: Opcjonalne `coverPath` w create/update — tylko metadata po uploadzie, nie plik w JSON.

**Contract**:

- `coverPathSchema`: `z.string().refine(isValidCoverPath, …).nullable().optional()`
- Dodać do `eventUpdatePartialSchema`; create **nie** wymaga `coverPath` (ustawiane osobnym PUT po uploadzie)

#### 5. Serwis events

**File**: `src/lib/services/events.ts`

**Intent**: Persist `cover_path`; przy `deleteEvent` — `storage.from('event-covers').remove([coverPath])` jeśli nie null (ignoruj błąd remove jeśli obiekt już nie istnieje, log nie wymagany w MVP).

**Contract**:

- `updateEvent` — obsługa `parsed.coverPath` (w tym `null` = wyczyść kolumnę)
- `deleteEvent` — przed `DELETE` z tabeli usuń obiekt Storage
- Eksportować helper `removeEventCoverFromStorage(supabase, coverPath)` jeśli używany też z formularza przez API — preferuj centralizację w serwisie przy PUT `coverPath: null`

### Success Criteria:

#### Automated Verification:

- `npx supabase db reset` (lokalnie) — migracja bez błędów
- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- W Supabase Studio / SQL: kolumna `cover_path` i bucket `event-covers` istnieją
- Polityki Storage: anon może odczytać public URL; nie-admin nie może upload

**Implementation Note**: Po fazie 1 i automated verification — potwierdzenie manualne przed fazą 2.

---

## Phase 2: Admin — upload, podgląd, usuwanie okładki

### Overview

Klient Supabase w przeglądarce, rozszerzony `EventForm`, konfiguracja przekazywana z Astro.

### Changes Required:

#### 1. Klient przeglądarkowy

**File**: `src/lib/supabase-browser.ts` (nowy)

**Intent**: `createBrowserSupabaseClient(url: string, anonKey: string)` używając `createBrowserClient` z `@supabase/ssr` — cookies document, bez persistSession override poza domyślnym SSR.

#### 2. EventForm — upload

**File**: `src/components/admin/EventForm.tsx`

**Intent**: Opcjonalny plik, walidacja `validateCoverFile`, podgląd (`URL.createObjectURL`), przycisk „Usuń okładkę” (tylko `mode === 'edit'`, gdy jest `initialEvent.coverPath` lub nowo wybrany plik).

**Contract**:

- Props: `supabaseUrl`, `supabaseAnonKey` (wymagane)
- Stan: `coverFile: File | null`, `removeCover: boolean`, `coverPreviewUrl`
- `handleSubmit`:
  1. Walidacja Zod pól tekstowych (jak dziś)
  2. Jeśli `coverFile` — `validateCoverFile`
  3. `POST`/`PUT` JSON pól eventu (bez pliku)
  4. Przy create: parsuj `{ event }` z odpowiedzi po `201`
  5. Jeśli `removeCover` && edit: `storage.remove` + `PUT { coverPath: null }`
  6. Jeśli `coverFile`: `upload` na `buildCoverStoragePath(eventId, file.type)` z `{ upsert: true }` → `PUT { coverPath }`
  7. `window.location.href = '/admin'`
- Copy PL pod inputem: „Opcjonalnie. JPEG, PNG lub WebP, max 5 MB.”
- `accept="image/jpeg,image/png,image/webp"`

#### 3. Strony admin formularza

**Files**: `src/pages/admin/events/new.astro`, `src/pages/admin/events/[id]/edit.astro`

**Intent**: Import `SUPABASE_URL`, `SUPABASE_KEY` z `astro:env/server`; przekaż do `EventForm`.

#### 4. API — odpowiedź create

**File**: `src/pages/api/admin/events/index.ts`

**Intent**: Upewnić się, że body `201` zawiera `event` z `id` (już tak jest) — formularz polega na tym.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- Create bez pliku — OK
- Create z plikiem — okładka widoczna po powrocie na listę admina (po fazie 3 na stronie fana)
- Edit: zamiana pliku, „Usuń okładkę”, submit bez zmiany pliku
- Plik 6 MB / PDF — błąd PL, brak uploadu
- Nie-admin nie może upload (403 / błąd Storage RLS)

**Implementation Note**: Po fazie 2 — manualne testy uploadu przed fan UI.

---

## Phase 3: UI fana i miniatura w panelu admina

### Overview

Wspólny komponent okładki, enrichment URL na SSR, hero + opcjonalny `og:image`.

### Changes Required:

#### 1. Komponent EventCoverImage

**File**: `src/components/discovery/EventCoverImage.tsx` (nowy)

**Intent**: Jedna implementacja fallbacku gradient „DnB” + `<img>` z `object-cover`, `loading="lazy"`, `decoding="async"`, sensowny `alt` (np. `Okładka: ${eventName}`).

**Contract**:

- Props: `coverUrl: string | null`, `alt: string`, `className?: string`, `variant?: 'thumb' | 'preview' | 'hero'` (predefiniowane rozmiary przez className wariantu lub caller podaje className)

#### 2. EventList

**File**: `src/components/discovery/EventList.tsx`

**Intent**: Layout wiersza: miniatura po lewej (~56–64px), treść po prawej; `Event` rozszerzony o `coverUrl` w props (typ lokalny lub `enrichEventWithCoverUrl`).

#### 3. EventPreviewCard

**File**: `src/components/discovery/EventPreviewCard.tsx`

**Intent**: Zamienić blok „DnB” na `EventCoverImage` (`variant="preview"`).

#### 4. DiscoveryShell / index

**Files**: `src/pages/index.astro`, ewentualnie `src/components/discovery/DiscoveryShell.tsx` (tylko typ props jeśli potrzebny)

**Intent**: W frontmatter: `const supabaseUrl = SUPABASE_URL ?? ''`; mapuj `events` przez `enrichEventWithCoverUrl` przed przekazaniem do `DiscoveryShell`.

#### 5. Strona szczegółów

**File**: `src/pages/events/[id].astro`

**Intent**: Hero `EventCoverImage` nad nagłówkiem (`aspect-video` lub `aspect-[2/1]`); gdy `coverUrl` — w `<Layout>` lub fragmencie head: `<meta property="og:image" content={coverUrl} />` (slot head w Layout lub inline w page — rozszerz `Layout.astro` o opcjonalny `ogImage` prop jeśli czystsze).

#### 6. AdminEventsTable

**File**: `src/components/admin/AdminEventsTable.tsx`

**Intent**: Nowa kolumna „Okładka” (pierwsza lub obok nazwy): miniatura 40×40 `EventCoverImage` lub ten sam gradient w małym rozmiarze; `events` z `coverUrl` z `admin/index.astro`.

**File**: `src/pages/admin/index.astro` — enrichment jak na `index.astro` fana.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- `/` — miniatury na liście i w podglądzie; event bez okładki — gradient
- `/events/[id]` — hero; 404 bez regresji
- `/admin` — kolumna z miniaturą
- Mobile: miniatury nie psują layoutu listy

**Implementation Note**: Po fazie 3 — pełny przegląd wizualny przed testami.

---

## Phase 4: Testy automatyczne

### Overview

Unit + jedna integracja regresji `cover_path`; istniejące suite zielone.

### Changes Required:

#### 1. Unit — event-covers

**File**: `tests/unit/event-covers.test.ts` (nowy)

**Contract**:

- `getEventCoverUrl(null, url)` → `null`
- Poprawna ścieżka → pełny public URL
- `isValidCoverPath` odrzuca `../evil`, akceptuje UUID/cover.jpg
- `validateCoverFile` — mock File: za duży, zły MIME, OK

#### 2. Unit — schema

**File**: `tests/unit/event-schema.test.ts` (rozszerzenie)

**Contract**:

- `parseEventUpdate({ coverPath: valid })` success
- `parseEventUpdate({ coverPath: 'bad' })` fail
- `parseEventUpdate({ coverPath: null })` success

#### 3. Integracja — fan read

**File**: `tests/integration/event-cover-read.test.ts` (nowy)

**Intent**: Service role insert wiersz z `cover_path` → `listPublishedEvents` / `getPublishedEventById` zwracają `coverPath`; wiersz bez okładki → `null`.

#### 4. Fixtures (opcjonalnie)

**Files**: `tests/helpers/event-fixtures.ts` — pole `cover_path` w insert jeśli potrzebne.

### Success Criteria:

#### Automated Verification:

- `npm test` przechodzi
- `npm run test:ci` przechodzi (jeśli Supabase lokalny w CI)
- `npm run lint` i `npm run build` przechodzą

#### Manual Verification:

- Brak — pokryte automated.

---

## Testing Strategy

### Unit Tests:

- Helpery URL, ścieżki, walidacja pliku, Zod `coverPath`

### Integration Tests:

- Odczyt `cover_path` z DB przez serwis fan read

### Manual Testing Steps:

1. Admin: create z/bez okładki, edit replace/remove, delete event ze Storage cleanup
2. Fan: lista, podgląd, szczegóły — z okładką i bez
3. Odrzucenie pliku > 5 MB w UI
4. Produkcja: `supabase db push` / pipeline migracji + smoke na https://bassmap.pl

## Performance Considerations

- `loading="lazy"` na wszystkich `<img>` fan-facing; lista może mieć wiele miniaturek — akceptowalne na MVP.
- Public bucket CDN Supabase — bez proxy przez Worker.
- Brak transformacji rozmiaru — admin powinien wgrywać rozsądne pliki (copy w UI).

## Migration Notes

- Istniejące wiersze: `cover_path = NULL` — automatyczny fallback UI.
- Po deploy migracji na remote Supabase: zweryfikować bucket w dashboardzie Storage.
- Lokalnie: `npx supabase db reset` lub `migration up`.

## References

- Research: `context/changes/event-cover-photos/research.md`
- S-02 plan (placeholder): `context/archive/2026-06-11-fan-event-discovery/plan.md`
- Lessons fan read: `context/foundation/lessons.md`
- Supabase Storage buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Migracja, typy i warstwa domenowa

#### Automated

- [x] 1.1 `npx supabase db reset` — migracja bez błędów — e752a33
- [x] 1.2 `npm run lint` przechodzi — e752a33
- [x] 1.3 `npm run build` przechodzi — e752a33

#### Manual

- [x] 1.4 Kolumna `cover_path` i bucket `event-covers` w Supabase — e752a33
- [x] 1.5 RLS Storage: tylko admin upload/delete — e752a33

### Phase 2: Admin — upload, podgląd, usuwanie okładki

#### Automated

- [x] 2.1 `npm run lint` przechodzi
- [x] 2.2 `npm run build` przechodzi

#### Manual

- [x] 2.3 Create bez pliku działa
- [x] 2.4 Create z plikiem — upload + cover_path
- [x] 2.5 Edit: zamiana, usuń okładkę, walidacja 5 MB / typu

### Phase 3: UI fana i miniatura w panelu admina

#### Automated

- [x] 3.1 `npm run lint` przechodzi
- [x] 3.2 `npm run build` przechodzi

#### Manual

- [x] 3.3 Fan: lista, podgląd, hero szczegółów + fallback
- [x] 3.4 Admin tabela: kolumna miniatur
- [x] 3.5 Mobile layout OK

### Phase 4: Testy automatyczne

#### Automated

- [x] 4.1 `npm test` przechodzi — 51/51
- [x] 4.2 `npm run test:ci` przechodzi (lokalnie z Supabase)
- [x] 4.3 `npm run lint` i `npm run build` przechodzą

#### Manual

- [x] 4.4 (brak — tylko automated)

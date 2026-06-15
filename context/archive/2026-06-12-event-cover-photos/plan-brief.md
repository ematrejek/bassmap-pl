# Event Cover Photos — Plan Brief

> Full plan: `context/changes/event-cover-photos/plan.md`
> Research: `context/changes/event-cover-photos/research.md`

## What & Why

Fani DnB widzą dziś szare placeholdery zamiast plakatów imprez. Slice S-03 dodaje opcjonalne zdjęcia okładek: admin wgrywa plakat w panelu, a fan widzi go na liście, w podglądzie i na stronie szczegółów — bez psucia wydarzeń, które jeszcze nie mają grafiki.

## Starting Point

MVP (S-02) celowo nie miał pola `image_url` w bazie — tylko gradient „DnB” w podglądzie. Admin zapisuje wydarzenia jako JSON; Supabase Storage nie jest skonfigurowany. Vitest i integracje Supabase już działają.

## Desired End State

Admin może opcjonalnie dodać, zmienić lub usunąć okładkę (max 5 MB). Fan widzi miniatury wszędzie tam, gdzie dziś jest tekst lub placeholder. Stare wydarzenia bez pliku wyglądają jak dotąd. Usunięcie eventu czyści plik ze Storage.

## Key Decisions Made

| Decision                  | Choice                                               | Why (1 sentence)                                           | Source      |
| ------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| Magazyn plików            | Supabase Storage, bucket public `event-covers`       | Ten sam stack co DB/auth; zero nowych bindingów Cloudflare | Research    |
| Pole w DB                 | `cover_path text` nullable                           | Stare wiersze bez migracji danych; URL budowany w kodzie   | Research    |
| Max rozmiar               | **5 MB**                                             | Zgodnie z decyzją użytkownika i limitem bucketa            | Plan        |
| Okładka przy create       | **Opcjonalna**                                       | Nie blokować dodawania eventu bez plakatu                  | Plan / User |
| Usuń okładkę na edit      | **Tak**                                              | Przycisk czyści Storage + `cover_path`                     | User        |
| Miniatura w tabeli admina | **Tak**                                              | Szybka weryfikacja wizualna listy wydarzeń                 | User        |
| Upload path               | Przeglądarka admina → Storage, potem PUT `coverPath` | Mniej kodu na Workerze niż multipart API                   | Research    |
| Format pliku              | JPEG / PNG / WebP, oryginalne rozszerzenie           | Prosto dla admina bez konwersji                            | Research    |

## Scope

**In scope:** migracja SQL, upload/edit/remove admin, fan UI (lista, podgląd, hero, og:image), miniatura w `AdminEventsTable`, testy unit + integracja, cleanup Storage przy delete.

**Out of scope:** R2, resize obrazów, obowiązkowa okładka, zewnętrzne URL, Playwright, cron orphan cleanup.

## Architecture / Approach

```
Admin EventForm → POST/PUT JSON (pola eventu)
              → [opcjonalnie] browser storage.upload → PUT { coverPath }
Fan pages (SSR) → listPublishedEvents → enrichEventWithCoverUrl → EventCoverImage
deleteEvent     → storage.remove(cover_path) → DELETE row
```

Pliki pod `{event_uuid}/cover.{ext}`; publiczny odczyt przez URL Supabase; zapis tylko dla `is_admin()`.

## Phases at a Glance

| Phase             | What it delivers                               | Key risk                       |
| ----------------- | ---------------------------------------------- | ------------------------------ |
| 1. Fundament      | Kolumna, bucket, typy, helpery, serwis cleanup | Błędne polityki RLS Storage    |
| 2. Admin upload   | Formularz + klient browser + walidacja 5 MB    | Upload fail po udanym create   |
| 3. Fan + admin UI | Miniatury, hero, tabela admina                 | Layout mobile przy miniaturach |
| 4. Testy          | Unit + integracja cover_path                   | CI bez lokalnego Supabase      |

**Prerequisites:** Supabase lokalny (Docker) do migracji i testów; sekrety `SUPABASE_*` w CI.
**Estimated effort:** ~2–3 sesje, 4 fazy sekwencyjne.

## Open Risks & Assumptions

- Orphan plik w Storage jeśli upload OK ale PUT `coverPath` fail — akceptowalne w MVP; cleanup ręczny lub przyszły cron.
- Free tier egress 5 GB/mies. — monitorować po wzroście ruchu.
- Migracja produkcyjna wymaga `db push` na remote Supabase w tej samej sesji co deploy kodu.

## Success Criteria (Summary)

- Admin wgrywa/zmienia/usuwa okładkę (max 5 MB); tabela admina pokazuje miniaturę.
- Fan widzi okładki na liście, podglądzie i szczegółach; bez okładki — gradient „DnB”.
- `npm run lint`, `npm run build`, `npm test` zielone.

# Smoke checklist (koniec slicu)

Krótka lista do ręcznego sprawdzenia **raz na slice** – resztę łapią `npm run verify`, `npm run build` i `npm run test:e2e` (Playwright).

## Automatycznie (przed pushem / w CI)

| Krok | Komenda            | Co łapie                                                              |
| ---- | ------------------ | --------------------------------------------------------------------- |
| 1    | `npm run verify`   | typy, lint, testy Vitest (API, RLS, komponenty)                       |
| 2    | `npm run build`    | błędy produkcyjnego bundla                                            |
| 3    | `npm run test:e2e` | React się ładuje, brak wiszącego „Ładowanie listy…”, redirect profilu |

Pełny gate lokalny: **`npm run verify:full`** (= verify + build + e2e).

Po zmianie `astro.config.mjs` lub dziwnym zachowaniu w dev: **`npm run cache:clean`**, potem `npm run dev`.

## SEO i audyt (ui-audit-seo-nav)

Automatycznie w `tests/e2e/seo-discovery.spec.ts` i `tests/e2e/smoke.spec.ts`:

- `meta[name="description"]` na `/` i `/events`
- View Source `/events` – `data-discovery-ssr-list` i nazwy wydarzeń (gdy baza ma dane)

Ręcznie przed merge do `main` (gdy zmieniasz meta/OG):

1. **View Source** `/events` – w HTML widać nazwy nadchodzących wydarzeń (bez włączonego JS)
2. **[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)** lub podgląd linku w Discord – `/` i `/events` (tytuł, opis, obraz OG)

## Ręcznie (2–3 min, tylko nowa funkcja slicu)

Sprawdź **tylko to, co dodałeś w slicu** – np. edycja profilu, nowe API. Nie przeklikuj całej aplikacji.

Stała czwórka (jeśli nie było `test:e2e` lub coś podejrzane):

1. `/events` – lista i przycisk „Filtruj” (nie wisi „Ładowanie listy wydarzeń…”)
2. Jeden event – strona szczegółu się otwiera
3. `/profile` – jako fan: profil; jako gość: przekierowanie na logowanie
4. `/profile` lub `/u/{login}` – «Udostępnij» kopiuje kanoniczny link do profilu
5. Wyloguj / zaloguj – jeśli slice dotyka konta

## Kiedy dopisać test E2E

Nowa **krytyczna ścieżka użytkownika** (np. publiczny profil `/u/@login` w S-20 faza 4) → dodaj scenariusz do `tests/e2e/smoke.spec.ts` lub osobnego pliku w `tests/e2e/`.

---
change_id: subgenre-catalog-v2
title: Katalog podgatunków v2 (13 pozycji, bez migracji danych)
roadmap_ref: S-29
status: archived
created: 2026-06-28
updated: 2026-06-29
archived_at: 2026-06-29T18:47:06Z
---

# Change: subgenre-catalog-v2

Roadmap **S-29** – uproszczenie katalogu podgatunków DnB do **13 pozycji** widocznych w całej aplikacji. Stare wartości zapisane w bazie **pozostają nietknięte**; znikają tylko z UI (filtry, formularze, badge'e). Nowe gatunki (Garage, Bassline, Dubstep, Bass House, Bounce) wymagają **wyłącznie dodania** do enumu Postgres (`ADD VALUE`), bez usuwania ani aktualizacji istniejących wierszy.

## Outcome

Fan, admin i zalogowany użytkownik widzi i wybiera wyłącznie poniższy katalog (kolejność UI):

| Etykieta UI | Id w bazie (snake_case) | Uwagi |
| ----------- | ----------------------- | ----- |
| Liquid | `liquid_dnb` | zmiana etykiety z „Liquid DnB” |
| Neurofunk | `neurofunk` | bez zmian |
| Jump-up | `jump_up` | bez zmian |
| Dancefloor | `dancefloor` | bez zmian |
| Garage | `garage` | **nowy** enum |
| Bassline | `bassline` | **nowy** enum |
| Dubstep | `dubstep` | **nowy** enum |
| Bass House | `bass_house` | **nowy** enum |
| Jungle | `jungle` | bez zmian |
| Techstep | `techstep` | bez zmian |
| Hardcore | `hardcore_oldschool` | zmiana etykiety z „Hardcore (oldschool)” |
| Bounce | `bounce` | **nowy** enum |
| Trance | `trancestep` | zmiana etykiety z „Trancestep” |

## Zakres powierzchni (must cover)

- **Lista eventów** – filtry (`SubgenreFilter`), kafelki (`EventCardSubgenreBadges`), mapa (`EventsMap`), archiwum
- **Szczegóły eventu** – `events/[id].astro`
- **Dodawanie / edycja eventów** – `EventForm` (admin + fan submit)
- **Mój profil** – `ProfileEditor`, `ProfileView`, `ProfileEventCard`
- **Ekipy** – `CrewForm`, `CrewDashboard`
- **Sugestie zmian** – rozszerzenie formularza + schematu payloadu o podgatunki (dziś brak pola)

## Zasada migracji danych

**Nie wykonujemy** `UPDATE` ani `DELETE` na istniejących `subgenres` / `favorite_subgenres`. **Nie usuwamy** wartości z enumu Postgres. Rekordy ze starymi tagami (np. `halftime`, `liquid_funk`) nadal istnieją w DB; aplikacja **filtruje je przy wyświetlaniu** i **nie pokazuje w selektorach**. Przy zapisie nowych/edytowanych rekordów dozwolone są tylko wartości z aktywnego katalogu (13 poz.).

## Notes

- Zmiana **niezależna** od S-24 (`crew-teams`) – można implementować równolegle; ekipy już używają `SUBGENRES` – po wdrożeniu v2 automatycznie dostaną nowy katalog.
- Po archive: zaktualizować tabelę podgatunków w `context/foundation/prd.md`, podbić `subgenre_catalog_version` w `roadmap.md`, ewentualnie FR-003 (liczba pozycji katalogu).
- GitHub issue + wpis w roadmapie – do utworzenia przy `/10x-implement` (plan gotowy).

# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Fan read queries – jawne filtry niezależnie od RLS

**Context:** `src/lib/services/events.ts` – `listPublishedEvents`, `getPublishedEventById`, `listDistinctCities`

**Problem:** Zapytania „dla fana” polegające wyłącznie na RLS pokazują adminowi szkice i przeszłe eventy na stronach publicznych. Przy skali MVP brak paginacji i DISTINCT po stronie DB zwiększa transfer przy wzroście danych.

**Rule:** Publiczne funkcje read zawsze filtrują `status = published` i nadchodzące daty w kodzie serwisu – nie polegaj wyłącznie na RLS, gdy zalogowany użytkownik ma szersze polityki. Przed skalą produkcyjną dodaj limit/paginację list i `DISTINCT` miast po stronie DB.

**Applies to:** `src/lib/services/*` – ścieżki odczytu dla widoku publicznego (fan discovery, landing pages).

## Typografia – en dash zamiast em dash

**Context:** Copy UI, tytuły stron, komentarze w `src/`, dokumenty aktywnej zmiany.

**Problem:** Długi myślnik em dash (U+2014, `—`) wygląda zbyt ciężko w polskim tekście i bywa niespójny między plikami.

**Rule:** Używaj wyłącznie **en dash** (U+2013, `–`, w JS/CSS `\u2013`). Nie używaj em dash w nowym kodzie ani copy. Przy edycji istniejących plików w `src/` zamieniaj `—` na `–`.

**Applies to:** `src/**`, `context/changes/**` (aktywne zmiany), teksty widoczne dla użytkownika.

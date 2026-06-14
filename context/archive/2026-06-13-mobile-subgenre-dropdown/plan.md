# Subgatunki na mobile — dropdown wielokrotnego wyboru — Implementation Plan

## Overview

Na wąskich ekranach (< `640px`, breakpoint Tailwind `sm`) zastępujemy przewijaną listę 26 checkboxów podgatunków kompaktowym przyciskiem otwierającym Popover z listą wielokrotnego wyboru. Formularz GET, parametry URL `subgenre=…` i logika filtra pozostają bez zmian — to wyłącznie warstwa UI. Slice roadmapy **S-07** / change-id **`mobile-subgenre-dropdown`**. **Bez migracji DB, bez zmian w `fan-schema.ts` ani `listPublishedEvents`.**

## Current State Analysis

- **`EventFilters.tsx`** (L49–69) — `<fieldset>` z 26 checkboxami `name="subgenre"` w siatce `grid-cols-1 sm:grid-cols-2`, `max-h-48 overflow-y-auto`. Na telefonie jedna kolumna + scroll zajmuje dużo miejsca w panelu filtrów obok daty, miasta i „darmowych”.
- **`DateRangeFilter.tsx`** — wzorzec Popover + Button trigger + ukryte pola `from`/`to`; `readLiveFiltersFromForm` czyta `formData.getAll("subgenre")` — **ukryte** `<input type="hidden" name="subgenre">` będą działać z presetami dat.
- **`fan-schema.ts`** — parser `subgenre` z URL bez zmian; 26 wartości z katalogu `SUBGENRES`.
- **`DiscoveryShell.tsx`** — `hasActiveFilters` już uwzględnia `subgenres.length > 0`; brak zmian.
- **UI shadcn** — `popover`, `checkbox`, `button`, `label` już w `src/components/ui/`; **nie** trzeba `dropdown-menu`.
- **Katalog** — 26 podgatunków w `src/types.ts` (`SUBGENRES`, `SUBGENRE_LABELS`).
- **Breakpointy** — reszta discovery używa `md:` dla split list/map; filtry podgatunków używają `sm:` — zachować spójność (`sm` = granica mobile/desktop dla tego kontrolera).
- **`public-roadmap.ts`** — wpis `mobile-subgenre-dropdown` już istnieje.

### Key Discoveries

- S-02 ustanowił multi-select OR przez powtarzany param `subgenre` — nie dotykamy backendu.
- S-05/S-06 pokazały wzorzec: kontrolka React wewnątrz formularza GET + ukryte pola dla submitu + `readLiveFiltersFromForm` dla nawigacji presetów.
- Radix Popover domyślnie montuje content w portalu — przy zamkniętym popoverze checkboxy z `name="subgenre"` **mogłyby** zniknąć z DOM. Bezpieczniejszy wzorzec: **stan React + ukryte inputy** zawsze w drzewie formularza (jak daty w `DateRangeFilter`).
- Roadmapa: desktop **może** zostać bez zmian — zostawiamy obecną siatkę checkboxów od `sm:` w górę.

## Desired End State

1. **Mobile (< `sm`):** sekcja „Podgatunki” to jeden przycisk (Popover trigger) z etykietą typu „Wybierz podgatunki” / „3 podgatunki” / nazwa pojedynczego wyboru; klik otwiera panel z przewijaną listą checkboxów (shadcn `Checkbox`).
2. **Desktop (`sm+`):** obecna siatka 2-kolumnowa checkboxów — wizualnie i funkcjonalnie jak dziś (bez scrolla na pełnej wysokości siatki, bez `max-h-48` na desktopie opcjonalnie — patrz Phase 2).
3. **Formularz GET:** submit „Filtruj” wysyła wybrane `subgenre=…` identycznie jak dziś; URL po odświeżeniu przywraca zaznaczenia.
4. **Presety dat:** klik „Dziś” / „W tym tygodniu” nie gubi wybranych podgatunków (`readLiveFiltersFromForm` czyta ukryte pola).
5. **„Wyczyść filtry”** → `/` — bez zmian.
6. CI: lint, build, testy zielone (brak nowych testów obowiązkowych — brak logiki poza UI).

### Weryfikacja ręczna

- Viewport ~375px: panel filtrów krótszy; podgatunki = jeden wiersz + popover.
- Wybierz 2–3 podgatunki w popoverze → „Filtruj” → URL `?subgenre=…&subgenre=…`, lista zawężona (OR).
- Odśwież stronę — popover trigger pokazuje poprawny stan; ukryte inputy zgodne.
- Z wybranymi podgatunkami klik preset „Dziś” — URL zachowuje `subgenre`.
- Viewport ≥640px: siatka checkboxów jak przed zmianą; submit i URL identyczne.
- Kombinacja: miasto + podgatunki + data + `free=1` — bez regresji.
- Mapa — te same pinezki co lista.

## What We're NOT Doing

- Zmiana parsera URL, `FanEventFilters`, `listPublishedEvents`, RLS, migracji.
- Wyszukiwarka / grupowanie podgatunków w UI (PRD dopuszcza „group or search” w przyszłości — nie teraz).
- Zastąpienie desktop checkboxów popoverem (chyba że w trakcie implementacji okaże się prostsze użyć jednego komponentu wszędzie — wtedy desktop może dostać ten sam wzorzec, ale **nie jest wymagane**).
- shadcn `Command` / `dropdown-menu` — Popover + Checkbox wystarczy.
- Tłumaczenie UI na EN.
- Usunięcie wpisu z `src/data/public-roadmap.ts` — dopiero przy `/10x-archive`.
- Testy E2E / Playwright — poza zakresem; manual QA na mobile wystarczy.

## Implementation Approach

Dwie fazy: (1) nowy komponent `SubgenreFilter` ze wspólnym stanem i ukrytymi polami; (2) podmiana fieldsetu w `EventFilters` + dopieszczenie copy/stylów desktop vs mobile. Zachować SSR: `defaultValue`/`useState` z `currentFilters.subgenres` po hydratacji.

## Critical Implementation Details

### Wspólny stan i ukryte pola formularza

```tsx
// Pseudokod — src/components/discovery/SubgenreFilter.tsx
const [selected, setSelected] = useState<Set<Subgenre>>(
  () => new Set(currentFilters.subgenres),
);

// Zawsze w DOM (wewnątrz <form>):
{[...selected].map((subgenre) => (
  <input key={subgenre} type="hidden" name="subgenre" value={subgenre} />
))}
```

Widoczne checkboxy (mobile i desktop) **bez** atrybutu `name` — tylko `checked` + `onCheckedChange` aktualizują `selected`.

Toggle:

```typescript
function toggleSubgenre(subgenre: Subgenre, checked: boolean) {
  setSelected((prev) => {
    const next = new Set(prev);
    if (checked) next.add(subgenre);
    else next.delete(subgenre);
    return next;
  });
}
```

### Etykieta triggera (mobile)

**File:** helper w `SubgenreFilter.tsx` (inline, bez osobnego modułu — 26 etykiet to stała mapa).

| Wybrane | Tekst na przycisku |
| ------- | ------------------ |
| 0 | „Wybierz podgatunki” |
| 1 | `SUBGENRE_LABELS[selected[0]]` |
| 2+ | „{n} podgatunki” (np. „3 podgatunki”) |

Styl triggera: spójny z `DateRangeFilter` — `Button variant="outline"`, `border-white/20 bg-white/5`, opcjonalnie `ChevronDown` z lucide.

### Mobile Popover

```tsx
<div className="space-y-2 sm:hidden">
  <Label>Podgatunki</Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button type="button" …>{formatTriggerLabel([...selected])}</Button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      className="max-h-[min(60vh,320px)] w-[min(100vw-2rem,20rem)] overflow-y-auto border-white/10 bg-slate-950/95 p-2 …"
    >
      {/* lista Checkbox + Label per SUBGENRES */}
    </PopoverContent>
  </Popover>
  <p className="text-xs text-blue-100/50">…</p>
</div>
```

- `type="button"` na triggerze — nie submituje formularza.
- `PopoverContent`: `max-h` + `overflow-y-auto` — scroll wewnątrz panelu, nie całego filtra.
- Opcjonalnie przycisk „Wyczyść” w stopce popovera (`setSelected(new Set())`).

### Desktop siatka

```tsx
<fieldset className="hidden space-y-2 sm:block">
  <legend>Podgatunki</legend>
  <div className="grid grid-cols-2 gap-2">
    {/* te same SUBGENRES.map — Checkbox controlled */}
  </div>
  <p className="text-xs …">Zaznacz kilka — pokażemy wydarzenia pasujące do dowolnego z nich.</p>
</fieldset>
```

Usunąć `max-h-48 overflow-y-auto` z desktop siatki — 26 pozycji w 2 kolumnach mieści się bez wewnętrznego scrolla na typowym laptopie. Na mobile i tak używamy popovera.

### Integracja w EventFilters

Zastąpić obecny `<fieldset>` (L49–69) jednym `<SubgenreFilter currentFilters={currentFilters} />`.

Reszta formularza (Data, Miasto, darmowe, przyciski) — bez zmian.

### DateRangeFilter — brak zmian wymaganych

`readLiveFiltersFromForm` już iteruje `formData.getAll("subgenre")`. Ukryte inputy wystarczą. **Zweryfikować ręcznie** po implementacji.

---

## Phase 1: Komponent SubgenreFilter

### Overview

Wyodrębnienie logiki podgatunków do reużywalnego islandu z mobile popover + ukrytymi polami. Po fazie można podpiąć do formularza.

### Changes Required

#### 1. Nowy komponent SubgenreFilter

**File**: `src/components/discovery/SubgenreFilter.tsx`

**Intent**: Jedno źródło prawdy dla wyboru podgatunków w formularzu GET.

**Contract**:

- Props: `{ currentFilters: FanEventFilters }` (używamy tylko `currentFilters.subgenres`).
- Eksport domyślny, React island (importowany z `EventFilters`).
- Renderuje ukryte `name="subgenre"` dla każdego wybranego.
- Mobile: Popover + lista `Checkbox` + krótka podpowiedź (ten sam copy co dziś).
- Desktop: `hidden sm:block` fieldset z siatką 2-kolumnową.
- Importy: `@/components/ui/*`, `@/types`, `cn`, lucide (`ChevronDown` opcjonalnie).

#### 2. (Opcjonalnie) Drobna refaktoryzacja duplikatu isSubgenre

**Files**: `DateRangeFilter.tsx`, `fan-schema.ts`

**Intent**: Uniknąć trzeciej kopii `SUBGENRE_SET` — **nie robić w tej fazie**, jeśli scope ma zostać minimalny. `SubgenreFilter` nie potrzebuje walidacji stringów (pracuje na typie `Subgenre`).

### Success Criteria

#### Automated Verification

- [ ] 1.1 `npm run lint` przechodzi
- [ ] 1.2 `npm run build` przechodzi
- [ ] 1.3 `npm test` — pełna regresja (bez nowych testów)

#### Manual Verification

- [ ] 1.4 Tymczasowo podpiąć komponent w `EventFilters` (lub Storybook dev) — ukryte pola widoczne w DevTools po zaznaczeniu w popoverze

**Implementation Note**: Po fazie 1 komponent istnieje; pełny slice wymaga fazy 2 (integracja + QA).

---

## Phase 2: Integracja w EventFilters i QA mobile/desktop

### Overview

Podmiana starego fieldsetu, dopieszczenie stylów, weryfikacja presetów dat i regresji filtrów.

### Changes Required

#### 1. EventFilters — użycie SubgenreFilter

**File**: `src/components/discovery/EventFilters.tsx`

**Intent**: Usunąć inline fieldset podgatunków; import `SubgenreFilter`.

**Contract**:

- Usunąć import `SUBGENRES`, `SUBGENRE_LABELS`, `Subgenre` jeśli nieużywane.
- `<SubgenreFilter currentFilters={currentFilters} />` między sekcją Miasto a „Pokaż tylko darmowe”.
- Usunąć lokalne `selectedSubgenres` Set.

#### 2. (Opcjonalnie) PRD FR-011

**File**: `context/foundation/prd.md`

**Intent**: Dodać wymaganie z roadmapy.

**Contract**:

```markdown
- FR-011: On mobile viewports, the subgenre filter uses a compact multi-select dropdown instead of a long scrolling checkbox list. Priority: must-have (Partia I)
```

Tylko jeśli team synchronizuje PRD w tej samej sesji co implementacja.

#### 3. Roadmap / GitHub (przy `/10x-implement`)

**Files**: `context/foundation/roadmap.md`, nowe issue GitHub, project board

**Intent**: Utworzyć issue dla S-07 (brak numeru w Backlog Handoff), kolumna **In Progress** na projekcie 2 — **nie** w tej fazie planu, jeśli użytkownik nie startuje implementacji.

### Success Criteria

#### Automated Verification

- [ ] 2.1 `npm run lint` przechodzi
- [ ] 2.2 `npm run build` przechodzi
- [ ] 2.3 `npm test` przechodzi

#### Manual Verification

- [ ] 2.4 Mobile (~375px): popover, wybór wielu, „Filtruj”, poprawny URL i lista
- [ ] 2.5 Mobile: preset dat z zachowaniem `subgenre`
- [ ] 2.6 Desktop (≥640px): siatka checkboxów, brak regresji vs przed slice'em
- [ ] 2.7 „Wyczyść filtry” resetuje podgatunki
- [ ] 2.8 Mapa zgodna z listą przy filtrze podgatunków

**Implementation Note**: Usunąć `mobile-subgenre-dropdown` z `public-roadmap.ts` dopiero przy `/10x-archive`.

---

## Testing Strategy

### Unit Tests

- Brak obowiązkowych — brak nowej logiki poza UI. Opcjonalnie test helpera `formatSubgenreTriggerLabel` tylko jeśli zostanie wyciągnięty do `src/lib/` (nie rekomendowane przy minimalnym scope).

### Integration Tests

- Nie wymagane — `fan-schema` i `listPublishedEvents` bez zmian.

### Manual Testing Steps

1. DevTools → responsive 375×812 — otwórz `/`.
2. Otwórz popover podgatunków — przewiń listę, zaznacz Neurofunk + Jump-up.
3. „Filtruj” — URL zawiera oba parametry; lista pokazuje eventy OR.
4. Klik „W tym tygodniu” — URL nadal ma `subgenre`.
5. Przełącz na desktop width — siatka checkboxów odzwierciedla wybór.
6. Odznacz wszystko na desktopie → „Filtruj” — brak `subgenre` w URL.
7. Regresja: filtry miasto/data/darmowe bez podgatunków.

## Performance Considerations

- 26 checkboxów w Popoverze — lekki DOM; montowany przy pierwszym otwarciu (Radix).
- Brak nowych zależności npm.
- Ten sam SSR + jeden React island co dziś (`DiscoveryShell` → `EventFilters`).

## Migration Notes

- Brak migracji DB.
- Deploy: sam `wrangler deploy` po merge.

## References

- Roadmap S-07: `context/foundation/roadmap.md` § S-07
- Wzorzec filtrów S-02: `context/archive/2026-06-11-fan-event-discovery/plan.md`
- Wzorzec Popover + ukryte pola: `src/components/discovery/DateRangeFilter.tsx`
- Obecny UI podgatunków: `src/components/discovery/EventFilters.tsx` L49–69
- Katalog podgatunków: `src/types.ts` (`SUBGENRES`, `SUBGENRE_LABELS`)
- PRD FR-003, FR-011 (propozycja): `context/foundation/roadmap.md` § S-07

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Komponent SubgenreFilter

#### Automated

- [x] 1.1 `SubgenreFilter.tsx` — stan, ukryte pola, mobile popover, desktop siatka
- [x] 1.2 `npm run lint` przechodzi
- [x] 1.3 `npm run build` przechodzi
- [x] 1.4 `npm test` — regresja

#### Manual

- [x] 1.5 DevTools — ukryte `subgenre` po wyborze w popoverze

### Phase 2: Integracja w EventFilters i QA mobile/desktop

#### Automated

- [x] 2.1 `EventFilters.tsx` — podmiana fieldsetu na `SubgenreFilter`
- [x] 2.2 `npm run lint` przechodzi
- [x] 2.3 `npm run build` przechodzi
- [x] 2.4 `npm test` przechodzi

#### Manual

- [x] 2.5 Mobile QA (375px) — popover, URL, lista
- [x] 2.6 Presety dat + podgatunki
- [x] 2.7 Desktop QA (≥640px) — siatka bez regresji
- [x] 2.8 Mapa zgodna z listą

# Prawa autorskie treści zgłoszenia (S-17) – Implementation Plan

## Overview

Slice roadmapy **S-17** (`change-id`: **`event-content-copyright`**). Uzupełnia compliance praw autorskich po **S-12**: dropdown źródła okładki, warunkowe oświadczenia zależne od źródła, audyt w bazie (źródło + rodzaj oświadczenia + timestamp), walidacja przy uploadzie okładki (fan **i** admin), zachowanie ogólnej zgody na opis przy tworzeniu zgłoszenia fana oraz rozszerzenie regulaminu (art. 29) i polityki prywatności.

**PRD:** FR-025. **North star Partii II** – must-have przed S-13 (duplikaty).

## Miejsce w roadmapie (Stream D, Partia II)

```
S-12 (strefa fana + zgłoszenia) → S-17 (prawa autorskie) → S-13 (duplikaty) → S-14 / S-15 → S-16
```

**Dlaczego zaraz po S-12:** w S-12 fan już może wgrywać okładkę (rozszerzenie poza pierwotny plan S-12). Bez S-17 upload grafik opiera się tylko na ogólnym checkboxie i §5.6 regulaminu – to **za mało** jako dowód **źródła** grafiki i **rodzaju** zgody. S-13 (duplikaty) celowo **wymaga S-17** – compliance przed skalowaniem zgłoszeń.

**Kolejność prac:** S-12 archived (2026-06-15) → **S-17** → dopiero **S-13**.

**GitHub:** issue [#30](https://github.com/ematrejek/bassmap-pl/issues/30) (S-17); **In Progress** na project board 2.

## Art. 29 ustawy o prawie autorskim – co obejmuje opisy?

**Częściowo tak, z ważnymi ograniczeniami.** Art. 29 pozwala bez zgody autora cytować **rozpowszechnione utwory** (fragmenty), gdy m.in.:

- cel jest **informacyjny** (agregator eventów – sensowny argument),
- **zakres jest uzasadniony** celem (nie cały długi opis promocyjny wklejony 1:1),
- podaje się **autora i źródło**,
- nie wprowadza się w błąd co do autorstwa.

**To nie zastępuje porady prawnej.** Finalne brzmienie § o art. 29 wymaga **review właściciela przed deployem** (open question w roadmapie – actionable: projekt w fazie 4).

| Treść                | Art. 29?                                                      | Działanie w S-17                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Okładka / plakat** | **Nie** – cytat nie zastępuje licencji na publikację grafiki  | Dropdown źródła + warunkowy checkbox (zgoda twórcy / prawa własne) + audyt w DB                                                                                    |
| **Opis eventu**      | **Może** obejmować krótkie fragmenty przy spełnieniu warunków | Regulamin §5.9: cytat w uzasadnionym zakresie + źródło/autor; **nie** jako zgoda na wklejenie całego cudzego tekstu. **Bez** osobnego pola UI (decyzja planowania) |

## Co już jest vs co brakuje

| Element                        | Stan (po S-12)                                       | S-17 dostarcza                                                                                                               |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Regulamin §5.6–5.7             | Ogólne oświadczenie + odpowiedzialność zgłaszającego | §5.6 doprecyzowany; §5.8 audyt; §5.9 art. 29 opisy                                                                           |
| Dropdown źródła grafiki        | Brak                                                 | Facebook / Instagram / Strona organizatora / Własna                                                                          |
| Różne checkboxy wg źródła      | Jeden ogólny w UI                                    | Checkbox A (FB/IG/strona org.) vs B (Własna) przy okładce                                                                    |
| Audyt w bazie                  | Brak                                                 | `cover_source`, `cover_declaration_kind`, `cover_copyright_declared_at` (+ `description_rights_accepted_at` przy fan create) |
| Walidacja API (Zod)            | Tylko `acceptContentRights` przy create              | Walidacja audytu okładki przy upload cover; Zod w `cover-rights`                                                             |
| Formularz – logika UI okładki  | Brak                                                 | Dropdown + warunkowy checkbox; **dialog** gdy plik bez oświadczenia                                                          |
| Panel admina – ten sam wzorzec | Open question w roadmapie (domyślnie fan-only)       | **W scope** – decyzja planowania 2026-06-15: fan **+ admin**                                                                 |

**Uwaga:** §5.6 regulaminu **nie zastępuje** UI S-17 – to klauzula ogólna; bez dropdownu i audytu w DB brak dowodu operacyjnego.

## Current State Analysis

- **`EventForm.tsx`** – fan create: ogólny checkbox `acceptContentRights` (L840–882); upload okładki w tym samym submit (L302–316), ale `uploadCoverFile()` wysyła tylko `file` + `coverAspect` (L82–84) – **bez** źródła ani oświadczenia okładki.
- **`POST /api/fan/events`** – `stripFanSubmitConsent()` wymaga boolean `acceptContentRights`; brak timestampu w DB (`src/lib/legal/fan-submit-consent.ts`, `src/pages/api/fan/events/index.ts` L38–44).
- **`POST /api/fan/events/[id]/cover`** – walidacja pliku + aspect; update `cover_path` / `cover_aspect` – **zero** consent (`src/pages/api/fan/events/[id]/cover.ts` L86–124).
- **`POST /api/admin/events/[id]/cover`** – identyczna luka (`src/pages/api/admin/events/[id]/cover.ts`).
- **Tabela `events`** – `cover_path`, `cover_aspect`, `created_by`; brak pól audytu S-17 (`context/foundation/roadmap.md` L75).
- **Regulamin §5.6–5.7** – ogólny checkbox S-12; brak rozróżnienia oświadczeń wg źródła i art. 29 dla opisów (`src/pages/terms.astro` L87–96).
- **Polityka §2.2** – opis zgłoszeń i okładki; brak źródła okładki i timestampu oświadczenia (`src/pages/privacy-policy.astro` L41–60).
- **`AdminEventsTable.tsx`** – brak kolumny źródła okładki / daty oświadczenia.

### Key Discoveries

- Dwuetapowy flow (create JSON → cover FormData) wymaga walidacji audytu **na endpoincie cover**, nie tylko przy create – inaczej upload można obejść lub wgrać okładkę bez dowodu źródła.
- `requiresContentRights` dotyczy tylko `variant === "fan" && mode === "create"` (L167) – admin potrzebuje osobnej flagi UI dla pól okładki.
- `AdminEventRow` / mapper – naturalne miejsce rozszerzenia typów bez nowej tabeli (audyt per wydarzenie, retencja z rekordem).
- Wzorzec migracji: `supabase/migrations/20260616120000_fan_event_submissions.sql` – naming `YYYYMMDDHHmmss_short_description.sql`, RLS bez zmian (kolumny audytu na istniejącej tabeli).

## Desired End State

1. **Fan create** – ogólny checkbox opisu (`acceptContentRights`) nadal obowiązkowy; API zapisuje `description_rights_accepted_at`.
2. **Upload okładki (fan pending + admin create/edit)** – dropdown „Źródło grafiki” (Facebook / Instagram / Strona organizatora / Własna); warunkowy checkbox:
   - FB / IG / Strona organizatora: _„Oświadczam, że posiadam zgodę twórcy na publikację grafiki”_
   - Własna: _„Oświadczam, że posiadam prawa autorskie do grafiki”_
   - **Brak oświadczenia okładki przy wybranym pliku** → okno dialogowe (patrz punkt 2a), nie twardy błąd inline jako jedyna ścieżka.
     2a. **Dialog „kontynuować bez grafiki?”** – gdy użytkownik wybrał plik okładki, ale **nie** zaznaczył wymaganego checkboxa oświadczenia okładki (lub nie wybrał źródła – ten sam dialog):
   - Treść: _„Nie zadeklarowałeś możliwości publikacji grafiki. Czy chcesz kontynuować bez dodawania grafiki?”_
   - **Tak** → zgłoszenie idzie dalej **bez okładki** (pominięcie kroku upload cover; wyczyszczenie `coverFile` w stanie formularza).
   - **Nie** → **anulowanie wysyłki** (dialog się zamyka, formularz zostaje, **nic nie trafia do API** – użytkownik może poprawić oświadczenie lub usunąć plik).
   - Komponent: shadcn `AlertDialog` (wzorzec jak `DeleteEventButton.tsx`).
   - Dotyczy **fana i admina** gdy `coverFile !== null` i brak kompletnego audytu okładki.
3. **API cover** – odrzuca brak `coverSource`, niepoprawne źródło lub brak/niespójne oświadczenie (walidacja Zod w `cover-rights`); zapisuje `cover_source`, `cover_declaration_kind`, `cover_copyright_declared_at` razem z plikiem.
4. **Moderacja** – `AdminEventsTable` (sekcja pending fanów) pokazuje źródło okładki i datę oświadczenia gdy okładka istnieje.
5. **Regulamin** – §5.6–5.9 (projekt treści **zaakceptowany przez właściciela** 2026-06-15; zalecany krótki przegląd prawnika przed produkcją); **polityka** §2.2 + §4; `LEGAL_UPDATED_AT` zaktualizowany.
6. **Testy** – unit: fan create consent, cover upload z/bez audytu, walidacja `cover-rights`.
7. CI: `npm run lint`, `npm run build`, `npm test` zielone.

### Weryfikacja ręczna

- Fan: zgłoszenie **bez** okładki – wymaga ogólnego checkboxa opisu; brak dropdownu okładki.
- Fan: zgłoszenie **z** okładką – pełna ścieżka (dropdown + checkbox) → sukces + audyt w DB.
- Fan: plik okładki **bez** oświadczenia → dialog; **Tak** → zgłoszenie bez okładki; **Nie** → brak wysyłki.
- Fan: próba POST cover bez pól audytu (devtools) → 400.
- Admin: nowe wydarzenie z okładką – ten sam dropdown/checkbox; audyt w DB.
- Admin: moderacja pending – widać źródło okładki i datę.
- Regulamin `#event-submissions` – nowe paragrafy; data dokumentu zaktualizowana.

## What We're NOT Doing

- Wykrywanie duplikatów (S-13), sugestie zmian (S-14), komentarze (S-15), usuwanie konta (S-16).
- Podpowiedź art. 29 przy polu opisu w formularzu (decyzja: tylko dokumenty prawne).
- Opcja dropdown „Inne” lub pole wolnego tekstu źródła.
- Osobna tabela audytu / historia wielu oświadczeń na jedno wydarzenie (jeden audyt per aktualna okładka – nadpisanie przy re-upload).
- Backfill audytu dla okładek sprzed wdrożenia.
- Sync pliku `BassMap_PL_dokumenty_prawne.docx` (poza repo).
- Zamknięcie issue GitHub / archive roadmap – dopiero przy `/10x-archive`.

## Implementation Approach

Pięć faz: (1) migracja + typy + moduł prawny okładki, (2) API create + cover endpoints, (3) UI formularzy, (4) dokumenty prawne + widok moderacji, (5) testy i weryfikacja. Każda faza kończy się lint/build; fazy 2–4 wymagają krótkiej weryfikacji ręcznej przed kolejną fazą.

## Critical Implementation Details

Przy re-upload okładki (fan pending retry lub admin edit) nowe wartości audytu **nadpisują** poprzednie w tym samym wierszu `events` – nie appenduj historii. Invariant w API/serwisie przy upload cover: jeśli ustawiamy `cover_path`, wymagane `cover_source`, `cover_declaration_kind`, `cover_copyright_declared_at` – NULL audytu tylko gdy brak okładki (w tym legacy wiersze sprzed migracji).

**Dialog „bez grafiki”:** decyzja użytkownika **Tak** musi być realizowana w UI przez **pominięcie** wywołania `uploadCoverFile` – API create **nigdy** nie wgrywa okładki bez osobnego requestu cover z audytem. Ścieżka „Tak” = to samo co zgłoszenie bez okładki od początku.

## Phase 1: Schema, typy i moduł cover-rights

### Overview

Dodać kolumny audytu do `events`, rozszerzyć typy TypeScript i mapper, utworzyć współdzielony moduł walidacji źródeł okładki i rodzajów oświadczeń.

### Changes Required:

#### 1. Migracja Supabase

**File**: `supabase/migrations/YYYYMMDDHHmmss_event_cover_rights_audit.sql`

**Intent**: Trwale przechowywać audyt zgody na opis (fan) oraz audyt źródła i oświadczenia okładki.

**Contract**:

- Kolumny na `public.events`:
  - `description_rights_accepted_at timestamptz NULL` – ustawiane przy fan create gdy `acceptContentRights`
  - `cover_source text NULL` – CHECK IN (`facebook`, `instagram`, `organizer_website`, `own`)
  - `cover_declaration_kind text NULL` – CHECK IN (`creator_consent`, `own_copyright`)
  - `cover_copyright_declared_at timestamptz NULL` – kiedy złożono oświadczenie dotyczące okładki
- CHECK: gdy `cover_path IS NOT NULL`, trzy pola okładki audytu muszą być NOT NULL (nazwa constraint np. `events_cover_rights_when_cover_present`). Legacy wiersze z okładką bez audytu wymagają jednorazowego UPDATE NULL cover audit **albo** pozostawienia wyjątku – **decyzja: wyjątek tylko dla wierszy istniejących przed migracją** – constraint `NOT VALID` + `VALIDATE` po deploy, albo constraint stosowany tylko na nowych INSERT/UPDATE przez aplikację bez DB constraint na legacy (prostsze MVP: **bez** constraint DB – invariant w API/serwisie przy upload cover; dokument w komentarzu migracji).

**Rekomendacja implementera:** invariant w API przy upload cover (NOT NULL audyt gdy ustawiamy `cover_path`); opcjonalny CHECK bez retroaktywnej walidacji starych wierszy.

#### 2. Typy i mapper

**File**: `src/types.ts`

**Intent**: Udostępnić typy domenowe dla UI, API i serwisu.

**Contract**: Nowe typy `CoverSource`, `CoverDeclarationKind`; pola na `Event`, `EventInsert` / update payload w serwisie: `descriptionRightsAcceptedAt`, `coverSource`, `coverDeclarationKind`, `coverCopyrightDeclaredAt` (camelCase w TS, snake `cover_copyright_declared_at` w DB).

**File**: `src/lib/events/mapper.ts`

**Intent**: Mapowanie nowych kolumn w obie strony.

**Contract**: `EventRow` rozszerzony o cztery kolumny; `mapEventRow` i `toEventRow` / insert mapper uwzględniają nowe pola.

#### 3. Moduł cover-rights

**File**: `src/lib/legal/cover-rights.ts` (nowy)

**Intent**: Jedno źródło prawdy dla enum, etykiet UI po polsku, mapowania źródło → wymagany rodzaj oświadczenia i walidacji payloadu uploadu.

**Contract**:

- `COVER_SOURCES`: readonly tuple `facebook` | `instagram` | `organizer_website` | `own`
- `COVER_SOURCE_LABELS`: Record → etykiety PL („Facebook”, „Instagram”, „Strona organizatora”, „Własna”)
- `declarationKindForSource(source): CoverDeclarationKind` – `own` → `own_copyright`; pozostałe → `creator_consent`
- `DECLARATION_LABELS`: teksty checkboxów PL (z roadmapy)
- Schematy **Zod** dla `coverSource` i spójności z `declarationKind`
- `parseCoverRightsFormData(formData: FormData): { ok: true; coverSource; declarationKind } | { ok: false; error: string }` – walidacja pól `coverSource` + `coverDeclarationAccepted` (wartość `"true"`)
- `parseCoverRightsFields(record: Record<string, unknown>)` – wariant dla JSON (testy)

#### 4. Rozszerzenie fan-submit-consent

**File**: `src/lib/legal/fan-submit-consent.ts`

**Intent**: Zachować strip `acceptContentRights` z body create; przygotować helper zwracający timestamp do zapisu.

**Contract**: Funkcja np. `fanDescriptionConsentAccepted(body): boolean` (refactor istniejącego strip) + eksport stałej pola bez zmiany nazwy API `acceptContentRights`.

### Success Criteria:

#### Automated Verification:

- Migracja stosuje się lokalnie: `npx supabase db reset` lub `supabase migration up`
- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- Po migracji kolumny widoczne w `\d events` / Supabase Studio
- Typy TS kompilują się bez błędów w mapperze

**Implementation Note**: Po tej fazie i zielonym lint/build – potwierdzenie ręczne przed fazą 2.

---

## Phase 2: API – create fan + upload cover (fan i admin)

### Overview

Zapisywać timestamp zgody na opis przy fan create; wymagać i persistować audyt okładki na obu endpointach upload cover.

### Changes Required:

#### 1. Fan create

**File**: `src/pages/api/fan/events/index.ts`

**Intent**: Po udanej walidacji `acceptContentRights` przekazać do serwisu moment zgody na opis.

**Contract**: `createFanSubmittedEvent` otrzymuje opcjonalnie `descriptionRightsAcceptedAt: string` (ISO) ustawiane na `new Date().toISOString()` gdy consent true.

**File**: `src/lib/services/events.ts`

**Intent**: Persist `description_rights_accepted_at` na INSERT fan pending.

**Contract**: `createFanSubmittedEvent(supabase, userId, data, { descriptionRightsAcceptedAt? })` – pole w insert row.

#### 2. Fan cover upload

**File**: `src/pages/api/fan/events/[id]/cover.ts`

**Intent**: Odrzucić upload bez poprawnego audytu; zapisać audyt razem z okładką.

**Contract**: Po walidacji pliku – `parseCoverRightsFormData(formData)` (Zod); błąd 400 z komunikatem PL; update row: `cover_path`, `cover_aspect`, `cover_source`, `cover_declaration_kind`, `cover_copyright_declared_at = now()` (UTC). Zachować istniejące guardy: owner, status `pending`.

#### 3. Admin cover upload

**File**: `src/pages/api/admin/events/[id]/cover.ts`

**Intent**: Identyczna walidacja audytu jak fan – spójność compliance.

**Contract**: Ten sam `parseCoverRightsFormData` (Zod); update przez `updateEvent` z polami audytu okładki + `coverCopyrightDeclaredAt`.

**File**: `src/lib/services/events.ts` – `updateEvent` akceptuje nowe pola audytu.

#### 4. Komunikaty błędów

**Intent**: Spójne komunikaty PL dla UI.

**Contract** (przykłady):

- Brak źródła: „Wybierz źródło grafiki okładki”
- Brak checkboxa: „Musisz złożyć wymagane oświadczenie dotyczące okładki”
- Niespójność źródło/oświadczenie: „Nieprawidłowe oświadczenie dla wybranego źródła grafiki”

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi
- Testy fazy 5 (można napisać w fazie 5, ale API gotowe do testów) – tymczasowo manual API via curl

#### Manual Verification:

- POST cover bez `coverSource` → 400
- POST cover z poprawnymi polami → 200; w DB wypełnione kolumny audytu
- Fan create z consent → `description_rights_accepted_at` NOT NULL

**Implementation Note**: Potwierdzenie ręczne przed fazą 3.

---

## Phase 3: UI formularzy (fan + admin)

### Overview

Dropdown źródła okładki i warunkowe checkboxy w `EventForm`; rozszerzenie `uploadCoverFile` o pola audytu; walidacja frontend przed wysłaniem.

### Changes Required:

#### 1. Stan i walidacja w EventForm

**File**: `src/components/admin/EventForm.tsx`

**Intent**: Gdy użytkownik wybierze plik okładki (`coverFile !== null`), wymagać wyboru źródła i właściwego checkboxa przed submit/upload.

**Contract**:

- Nowy stan: `coverSource: CoverSource | null`, `coverDeclarationAccepted: boolean`, błędy walidacji
- Sekcja UI **pod** inputem pliku okładki (w bloku `showCoverUpload`), widoczna gdy `coverFile !== null ||` (create z pending preview – tylko gdy nowy plik)
- `<select>` lub shadcn Select z `COVER_SOURCE_LABELS`
- Checkbox z tekstem z `DECLARATION_LABELS[declarationKindForSource(coverSource)]` – render gdy `coverSource !== null`
- Przy zmianie źródła reset `coverDeclarationAccepted`
- Fan create: sekcja okładki audytu **nie zastępuje** ogólnego checkboxa opisu na dole formularza
- Admin: sekcja audytu okładki gdy `coverFile !== null` (create i edit); brak ogólnego `acceptContentRights`

**Walidacja `handleSubmit`**:

- Fan: istniejąca walidacja `acceptContentRights` (opis)
- Gdy `coverFile && showCoverUpload` i brak kompletnego audytu okładki (`!coverSource || !coverDeclarationAccepted`):
  - **Nie** wysyłaj od razu – otwórz `AlertDialog` (stan `coverWithoutDeclarationDialogOpen`)
  - **Tak** w dialogu → ustaw flagę `skipCoverUpload: true`, wyczyść `coverFile` / preview, kontynuuj normalny submit **bez** `uploadCoverFile`
  - **Nie** w dialogu → zamknij dialog, `return` (brak requestu do API)
- Gdy audyt okładki kompletny → normalny submit z uploadem cover

#### 2. Dialog „kontynuować bez grafiki?”

**File**: `src/components/admin/EventForm.tsx` (lub `src/components/legal/CoverDeclarationDialog.tsx` jeśli ekstrakcja poprawia czytelność)

**Intent**: Dać użytkownikowi świadomy wybór: wysłać zgłoszenie bez okładki zamiast blokady suchym błędem.

**Contract**:

- Trigger: submit z `coverFile !== null` i niekompletny audyt okładki
- `AlertDialogTitle` / opis: _„Nie zadeklarowałeś możliwości publikacji grafiki. Czy chcesz kontynuować bez dodawania grafiki?”_
- Przyciski: **Tak** (`AlertDialogAction`) / **Nie** (`AlertDialogCancel`)
- Dostępność: focus trap, zamknięcie Esc = **Nie**
- Ten sam dialog dla `variant="fan"` i `variant="admin"`

#### 3. uploadCoverFile

**File**: `src/components/admin/EventForm.tsx` (funkcje pomocnicze L76–99)

**Intent**: Przekazać audyt w FormData do API cover.

**Contract**: `formData.append("coverSource", coverSource)`, `formData.append("coverDeclarationAccepted", "true")` gdy checkbox zaznaczony.

#### 4. Etykiety i dostępność

**Intent**: Polskie etykiety; powiązanie label/select/checkbox (`htmlFor`, `aria-invalid` na błędach – wzorzec jak `contentRightsError`).

**Contract**: Inline komunikat błędu pod sekcją okładki tylko gdy brak **źródła** przed otwarciem dialogu (opcjonalnie); główna ścieżka dla braku checkboxa = dialog, nie sam `setContentRightsError`.

#### 5. Opcjonalny ekstrakt komponentu

**File**: `src/components/legal/CoverRightsFields.tsx` (nowy, opcjonalnie)

**Intent**: Odciążyć `EventForm` jeśli sekcja rośnie – **tylko jeśli** czytelność spada; nie obowiązkowe.

**Contract**: Props: `coverSource`, `onCoverSourceChange`, `declarationAccepted`, `onDeclarationChange`, `error`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- Fan: wybrany plik, brak checkboxa oświadczenia → dialog; **Tak** → sukces bez okładki w DB; **Nie** → formularz bez zmian, brak POST
- Fan: wybrany plik bez dropdown źródła → ten sam dialog (lub inline hint na dropdown + dialog przy submit)
- Fan: pełna ścieżka z oświadczeniem → redirect sukces; okładka + audyt w DB
- Admin: create/edit z okładką – ten sam flow + dialog przy braku oświadczenia
- Fan bez okładki: brak sekcji dropdown; tylko ogólny checkbox opisu

**Implementation Note**: Potwierdzenie ręczne przed fazą 4.

---

## Phase 4: Dokumenty prawne i widok moderacji

### Overview

Wprowadzić **zaakceptowany projekt** zapisów regulaminu i polityki (właściciel 2026-06-15); pokazać audyt okładki adminowi w tabeli moderacji. Implementer wkleja treść do `.astro` niemal dosłownie; przed merge do `main` – ostatni sign-off właściciela (zalecany przegląd prawnika).

### Changes Required:

#### 1. Regulamin

**File**: `src/pages/terms.astro` (sekcja `id="event-submissions"`, ok. L65–96)

**Intent**: Rozdzielić zgodę na opis i oświadczenia okładki; opisać audyt; art. 29; odpowiedzialność cywilna zgłaszającego i **informacyjne** ostrzeżenie o możliwej odpowiedzialności karnej (bez „przenoszenia” kary regulaminem).

**Contract** – **projekt do wdrożenia** (zastępuje obecne §5.6–5.7; numeracja §5.8–5.9 nowa):

**§5.6** – Przed wysłaniem zgłoszenia użytkownik musi: (a) aktywnie potwierdzić (checkbox w formularzu), że posiada prawa do treści **opisowych** zgłoszenia lub działa za zgodą uprawnionego, a ewentualne cytaty w opisie spełniają wymogi §5.9; (b) w przypadku dodania okładki – wybrać **źródło grafiki** (Facebook, Instagram, strona organizatora wydarzenia lub własne materiały) oraz złożyć **oświadczenie adekwatne do wyboru**: o posiadaniu zgody twórcy na publikację grafiki (Facebook / Instagram / strona organizatora) albo o posiadaniu praw autorskich do grafiki (własne materiały). Wysłanie zgłoszenia z okładką bez złożenia wymaganego oświadczenia jest niedozwolone; użytkownik może kontynuować zgłoszenie **bez okładki** po wyraźnym potwierdzeniu w formularzu.

**§5.7** – Zgłaszający ponosi **wyłączną odpowiedzialność cywilną** za treści przesłane w formularzu, w tym za naruszenie praw autorskich do okładek i opisów. Złożenie **nieprawdziwego** oświadczenia o posiadaniu praw lub zgody na publikację grafiki może skutkować odrzuceniem zgłoszenia, usunięciem konta oraz roszczeniami osób trzecich wobec zgłaszającego; w razie skierowania roszczeń do Administratora zgłaszający zobowiązany jest do zaspokojenia szkód w granicach przepisów prawa. **Publikacja cudzego utworu** (w tym grafiki okładki) **bez wymaganego uprawnienia** może – zgodnie z obowiązującymi przepisami prawa polskiego, w tym ustawą o prawie autorskim – **pociągać za sobą odpowiedzialność karną po stronie osoby publikującej**. Administrator nie zachęca do kopiowania cudzych grafik ani opisów bez licencji – zaleca korzystanie z własnych materiałów lub materiałów, do których zgłaszający ma prawo.

**§5.8** – W celu moderacji i dokumentowania oświadczeń Administrator przechowuje w systemie informatycznym Serwisu: wybrane źródło grafiki okładki, rodzaj złożonego oświadczenia oraz datę jego złożenia, a przy utworzeniu zgłoszenia – datę potwierdzenia oświadczenia dotyczącego treści opisowych. Dane te służą weryfikacji zgłoszeń i obronie przed roszczeniami osób trzecich.

**§5.9** – W opisach wydarzeń dopuszczalne jest cytowanie **fragmentów** rozpowszechnionych utworów w **uzasadnionym zakresie**, na potrzeby **informacyjne** o wydarzeniu, z **wskazaniem autora i źródła** i bez wprowadzania w błąd co do autorstwa – zgodnie z art. 29 ustawy z dnia 4 lutego 1994 r. o prawie autorskim i prawach pokrewnych. **Nie** stanowi to zezwolenia na wklejanie w całości cudzych opisów promocyjnych (np. w brzmieniu identycznym z postem organizatora) bez podstawy prawnej. **Prawo cytatu nie dotyczy grafik** okładek, plakatów ani innych utworów wizualnych – do publikacji okładki wymagane są uprawnienia opisane w §5.6 lit. b.

**Notatka implementacyjna (nie w regulaminie):** klauzula o odpowiedzialności karnej ma charakter **informacyjny**; karną ustala ustawa i organy ścigania, nie regulamin. Właściciel zaakceptował brzmienie 2026-06-15.

**Pozostałe paragrafy §5.1–5.5** – bez zmian merytorycznych. Anchor `id="event-submissions"` na `<h2>` sekcji 5.

#### 2. Polityka prywatności

**File**: `src/pages/privacy-policy.astro`

**Intent**: Opisać przetwarzanie danych audytu oświadczeń (RODO).

**Contract** – dopiski do wdrożenia:

**§2.2** (po akapicie o okładce) – dodać akapit:

> W przypadku dodania okładki przetwarzamy także: wybrane przez użytkownika **źródło grafiki** (Facebook, Instagram, strona organizatora, własne materiały), **rodzaj oświadczenia** praw autorskich do grafiki oraz **datę i czas** jego złożenia. Przy utworzeniu zgłoszenia zapisujemy **datę potwierdzenia** oświadczenia dotyczącego treści opisowych. Cele: moderacja zgłoszeń, audyt zgodności z Regulaminem, obrona przed roszczeniami osób trzecich. Podstawa: art. 6 ust. 1 lit. b RODO (świadczenie usługi) oraz art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes – wiarygodność bazy wydarzeń i dokumentowanie oświadczeń).

**§4** (w akapicie o zgłoszeniach wydarzeń) – doprecyzować zdanie:

> Dane audytu oświadczeń (źródło okładki, rodzaj oświadczenia, daty) przechowywane są **tak długo, jak powiązane zgłoszenie lub opublikowane wydarzenie** pozostaje w Serwisie, a po usunięciu wydarzenia – przez okres niezbędny do obrony przed roszczeniami, nie dłużej niż przedawnienie roszczeń cywilnych, o ile dalsze przechowywanie nie wynika z obowiązku prawnego.

#### 3. Data dokumentów

**File**: `src/lib/legal/paths.ts`

**Intent**: Odzwierciedlić aktualizację prawną S-17.

**Contract**: `LEGAL_UPDATED_AT` – data deploy/archive S-17 (np. dzień wdrożenia – ustawić przy implementacji tej fazy).

#### 4. Widok moderacji

**File**: `src/components/admin/AdminEventsTable.tsx`

**Intent**: Admin widzi źródło okładki i datę oświadczenia przy moderacji pending.

**Contract**:

- Nowa kolumna lub podtekst pod miniaturą okładki gdy `showModerationActions && event.coverPath`
- Wyświetl `COVER_SOURCE_LABELS[event.coverSource]` i sformatowaną `coverCopyrightDeclaredAt` (np. `formatEventDate` lub krótki datetime PL)
- Gdy okładka bez audytu (legacy NULL) – „Brak danych audytu” szarym tekstem

**File**: `src/lib/legal/cover-rights.ts` – eksport helpera `formatCoverSourceLabel(source | null)` jeśli potrzebny w UI.

#### 5. Copy checkboxa opisu (fan)

**File**: `src/components/admin/EventForm.tsx` (label `acceptContentRights`)

**Intent**: Doprecyzować, że checkbox dotyczy **opisu**; odesłać do §5.9 (cytaty) i §5.6 (okładka osobno).

**Contract** – projekt labelu (zaakceptowany):

> Oświadczam, że posiadam prawa do treści **opisowych** zgłoszenia (w tym opisu wydarzenia) lub działam za zgodą uprawnionego, a ewentualne cytaty spełniają wymogi określone w [Regulaminie](`/terms#event-submissions`) (§5.9). Oświadczenia dotyczące **okładki** składam osobno przy dodawaniu pliku graficznego.

#### 6. Dialog „bez grafiki” – copy

**File**: `EventForm` / `CoverDeclarationDialog`

**Contract** – tekst dialogu (zaakceptowany):

> Nie zadeklarowałeś możliwości publikacji grafiki. Czy chcesz kontynuować bez dodawania grafiki?

Przyciski: **Tak** / **Nie** (patrz faza 3).

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi

#### Manual Verification:

- `/terms#event-submissions` – nowe paragrafy widoczne; data aktualizacji w shell
- `/privacy-policy` – §2.2 i §4 zaktualizowane
- Panel admina – pending fan submit z okładką pokazuje źródło i datę
- **Właściciel zatwierdził** projekt §5.6–5.9 i dopisków polityki (2026-06-15); opcjonalny przegląd prawnika przed produkcją

**Implementation Note**: Potwierdzenie ręczne + sign-off prawny przed fazą 5 / deploy.

---

## Phase 5: Testy i weryfikacja końcowa

### Overview

Unit testy walidacji i API; pełna regresja CI; przygotowanie pod `/10x-implement` handoff.

### Changes Required:

#### 1. Testy fan create

**File**: `tests/unit/fan-events-api.test.ts`

**Intent**: Regresja consent; opcjonalnie asercja że serwis dostaje timestamp (mock `createFanSubmittedEvent`).

**Contract**: Istniejące testy zielone; dodać test że successful create przekazuje `descriptionRightsAcceptedAt` gdy mock pozwala sprawdzić argumenty.

#### 2. Testy cover-rights

**File**: `tests/unit/cover-rights.test.ts` (nowy)

**Intent**: Pokryć mapowanie źródeł, walidację FormData, komunikaty błędów.

**Contract**: Cases: brak source, invalid source, own + creator_consent mismatch, poprawne pary dla każdego z 4 źródeł.

#### 3. Testy API cover (fan)

**File**: `tests/unit/fan-cover-api.test.ts` (nowy)

**Intent**: POST cover bez audytu → 400; z audytem → 200 (mock storage + supabase jak w innych testach API).

**Contract**: Minimalne mocki `createServiceRoleClient`, `getEventById` – wzorzec z `fan-events-api.test.ts`.

#### 4. Roadmap sync (start implementacji – nie na końcu archive)

**Intent**: Przy rozpoczęciu `/10x-implement` utworzyć issue GitHub dla S-17 (docelowo **#29** jeśli wolny), przenieść na **In Progress** (project board 2, owner `ematrejek`); PR z `Refs #N`.

**Contract**: `context/foundation/roadmap.md` – wpisać numer issue w Backlog Handoff; status S-17 → in progress w tej samej sesji co pierwszy commit implementacji. `change.md` – uzupełnić `github-issue`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` przechodzi
- `npm run build` przechodzi
- `npm test` przechodzi

#### Manual Verification:

- Pełna ścieżka fan submit z okładką na dev
- Pełna ścieżka admin create z okładką
- Regresja: discovery, auth, fan submit bez okładki, moderacja publish/reject

**Implementation Note**: Po zielonym CI i manual QA – gotowe do `/10x-impl-review` i `/10x-archive`.

---

## Testing Strategy

### Unit Tests

- `cover-rights.ts` – wszystkie źródła i negatywne przypadki
- `fan-events-api.test.ts` – consent opisu
- `fan-cover-api.test.ts` – audyt okładki na API

### Integration Tests

- Brak dedykowanego testu integracyjnego uploadu pliku w repo – manual QA w fazie 5.

### Manual Testing Steps

1. Fan – zgłoszenie bez okładki: tylko checkbox opisu, sukces, `description_rights_accepted_at` w DB.
2. Fan – z okładką, każde ze 4 źródeł: poprawny checkbox, sukces, audyt w DB.
   2b. Fan – plik okładki bez checkboxa: dialog → **Tak** = zgłoszenie bez okładki; **Nie** = brak POST.
3. Fan – DevTools POST cover bez pól audytu: 400.
4. Admin – nowe wydarzenie z okładką: audyt w DB.
5. Admin – moderacja: widoczne źródło i data.
6. Regulamin/polityka – §5.6–5.9 (w tym art. 29 i ostrzeżenie o odpowiedzialności karnej); data aktualizacji.

## Performance Considerations

Pomijalne – kilka nullable kolumn na istniejącym wierszu; brak dodatkowych zapytań poza update insert.

## Migration Notes

- Wiersze z okładką sprzed S-17 mogą mieć NULL w polach audytu – admin UI pokazuje „Brak danych audytu”.
- Re-upload okładki nadpisuje audyt – zamierzone.
- Po migracji: `npx supabase db push` / reset lokalnie przed testami API.

## References

- Roadmap S-17: `context/foundation/roadmap.md` L332–348
- PRD FR-025: `context/foundation/prd.md` L121, L185
- S-12 archive: `context/archive/2026-06-15-fan-account-zone/`
- Istniejący consent: `src/lib/legal/fan-submit-consent.ts`
- Fan cover API: `src/pages/api/fan/events/[id]/cover.ts`
- Admin cover API: `src/pages/api/admin/events/[id]/cover.ts`
- EventForm: `src/components/admin/EventForm.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Schema, typy i moduł cover-rights

#### Automated

- [x] 1.1 Migracja stosuje się lokalnie: `npx supabase db reset` lub `supabase migration up` — 79fcc84
- [ ] 1.2 `npm run lint` przechodzi
- [x] 1.3 `npm run build` przechodzi — 79fcc84

#### Manual

- [x] 1.4 Po migracji kolumny widoczne w Supabase Studio / `\d events` — 79fcc84

### Phase 2: API – create fan + upload cover (fan i admin)

#### Automated

- [ ] 2.1 `npm run lint` przechodzi
- [x] 2.2 `npm run build` przechodzi — 7be5f51

#### Manual

- [ ] 2.3 POST cover bez `coverSource` → 400
- [ ] 2.4 POST cover z poprawnymi polami → 200; audyt w DB
- [ ] 2.5 Fan create z consent → `description_rights_accepted_at` NOT NULL

### Phase 3: UI formularzy (fan + admin)

#### Automated

- [ ] 3.1 `npm run lint` przechodzi
- [ ] 3.2 `npm run build` przechodzi

#### Manual

- [ ] 3.3 Fan: plik bez oświadczenia okładki → dialog; Tak = bez okładki, Nie = brak wysyłki
- [ ] 3.4 Fan: pełna ścieżka z oświadczeniem → sukces + audyt w DB
- [ ] 3.5 Admin: dialog przy braku oświadczenia okładki
- [ ] 3.6 Fan bez okładki: tylko ogólny checkbox opisu

### Phase 4: Dokumenty prawne i widok moderacji

#### Automated

- [ ] 4.1 `npm run lint` przechodzi
- [ ] 4.2 `npm run build` przechodzi

#### Manual

- [ ] 4.3 `/terms#event-submissions` – nowe paragrafy i data aktualizacji
- [ ] 4.4 `/privacy-policy` – §2.2 i §4 zaktualizowane
- [ ] 4.5 Panel admina – pending z okładką pokazuje źródło i datę
- [ ] 4.6 §5.7 zawiera informacyjne ostrzeżenie o możliwej odpowiedzialności karnej publikującego

### Phase 5: Testy i weryfikacja końcowa

#### Automated

- [ ] 5.1 `npm run lint` przechodzi
- [ ] 5.2 `npm run build` przechodzi
- [ ] 5.3 `npm test` przechodzi

#### Manual

- [ ] 5.4 Pełna ścieżka fan + admin na dev
- [ ] 5.5 Regresja discovery, auth, moderacja publish/reject

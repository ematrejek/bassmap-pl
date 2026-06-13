---
date: 2026-06-13T12:00:00+02:00
researcher: Cursor Agent
git_commit: 76ba36819ea1db3232f79b1b4457b24bd62993d3
branch: main
repository: bassmap-pl
topic: "Jak dodać linki do Regulaminu i Polityki prywatności — wzorce portali + stan BassMap PL"
tags: [research, legal, privacy, terms, footer, rodo, s-11]
status: complete
last_updated: 2026-06-13
last_updated_by: Cursor Agent
---

# Research: Polityka prywatności i Regulamin — wzorce portali + implementacja w BassMap PL

**Date**: 2026-06-13  
**Researcher**: Cursor Agent  
**Git Commit**: `76ba36819ea1db3232f79b1b4457b24bd62993d3`  
**Branch**: main  
**Repository**: bassmap-pl

## Research Question

Jak inne portale (szczególnie event discovery) udostępniają Regulamin i Politykę prywatności? Co trzeba zrobić w BassMap PL, mając gotowe dokumenty prawne (`BassMap_PL_dokumenty_prawne.docx`), bez czekania na Partię II (app shell, marketing homepage)?

## Summary

1. **Standard branżowy:** linki do Privacy Policy / Terms of Use w **stopce każdej strony** + dodatkowo przy **formularzu rejestracji** (checkbox akceptacji Regulaminu). Songkick, Eventbrite i większość portali stosuje ten wzorzec.
2. **Wymogi PL (RODO + ustawa o świadczeniu usług drogą elektroniczną):** Polityka prywatności obowiązkowa przy zbieraniu danych (cookies sesji, rejestracja). Regulamin obowiązkowy przy świadczeniu usługi (konta użytkowników). Link w stopce + klauzula przy rejestracji.
3. **Stan BassMap PL:** brak stron prawnych, brak stopki, brak checkboxa w `SignUpForm.tsx`. Rejestracja już działa — **luka prawna wymaga szybkiej naprawy**, nie trzeba czekać na F-04 ani S-09.
4. **Treść gotowa:** `BassMap_PL_dokumenty_prawne.docx` zawiera oba dokumenty (aktualizacja 13.06.2026) — Polityka prywatności (~7 sekcji) i Regulamin (~10 sekcji).
5. **Rekomendacja:** slice **S-11 przesunąć do Partii I** (po S-06, równolegle z S-07/S-08). Minimalny zakres: 2 strony Astro + komponent `SiteFooter` + checkbox w rejestracji.

## Detailed Findings

### Wzorce na portalach event / discovery

#### Songkick (songkick.com)

- **Stopka globalna** na każdej podstronie z linkami: Privacy policy, Terms of use, Cookies policy, Community guidelines, Security.
- Strony prawne pod ścieżkami `/info/privacy`, `/info/terms`.
- Stopka zawiera też nawigację produktową (Support, About, API) — legal links w osobnej kolumnie / wierszu.
- Przy rejestracji / subskrypcji alertów — odniesienie do polityki prywatności (TermsFeed / PrivacyPolicies best practice).

#### Ogólne best practices (TermsFeed, PrivacyPolicies, Eleken footer UX 2026)

| Miejsce | Co umieścić | Priorytet |
| ------- | ------------- | --------- |
| Stopka (footer) | Polityka prywatności, Regulamin, ewentualnie Cookies | **Obowiązkowe** — użytkownicy tego oczekują |
| Formularz rejestracji | Checkbox „Akceptuję Regulamin” + linki | **Obowiązkowe** — clickwrap, dowód zgody |
| Formularz kontaktowy | Klauzula RODO + link do polityki | Gdy powstanie (S-10) |
| Strona główna | Dyskretny wiersz linków (alternatywa do footera) | OK na MVP bez globalnego footera |

**Nie wystarczy** tylko stopka — przy każdym miejscu zbierania danych osobowych (rejestracja) musi być bezpośredni dostęp do polityki i akceptacja regulaminu.

#### Wymogi polskie (RODO + serwis z kontami)

- **Polityka prywatności:** obowiązkowa; link w stopce każdej podstrony; klauzula informacyjna przy formularzach.
- **Regulamin:** obowiązkowy przy usługach online z rejestracją; checkbox wymagany przy rejestracji; osobna podstrona `/regulamin`.
- **Cookies:** BassMap używa cookies sesji (Supabase auth) — polityka już to opisuje (§6); osobna „Polityka cookies” opcjonalna na start (treść w §6 Polityki wystarczy na MVP).
- **Ścieżki URL (konwencja PL):** `/polityka-prywatnosci`, `/regulamin` (lub krótsze `/prywatnosc` — rekomendacja: pełne polskie slugi dla SEO i czytelności).

### Treść dokumentów prawnych (BassMap_PL_dokumenty_prawne.docx)

Gotowe dokumenty od właściciela produktu (13.06.2026):

**Polityka prywatności** — sekcje:
1. Administrator (Emilia Matrejek, matrejekemilia@gmail.com, osoba fizyczna)
2. Jakie dane (konto: email, login, opcjonalnie imię/nazwisko/miasto; dane techniczne: IP)
3. Podmioty przetwarzające (Supabase, Cloudflare, Resend — transfer do USA ze standardowymi klauzulami)
4. Okres przechowywania
5. Prawa użytkownika (RODO art. 15–21, UODO)
6. Cookies (tylko sesja auth, bez marketingowych)
7. Zmiany polityki

**Regulamin** — sekcje:
1. Postanowienia ogólne (agregator DnB, nie sprzedaje biletów)
2. Usługi (lista, filtry, mapa, konta)
3. Rejestracja i konto
4. Prawa i obowiązki użytkownika
5. Prawa administratora
6. Własność intelektualna
7. Odpowiedzialność (osoba fizyczna, usługa bezpłatna)
8. Zmiany regulaminu (14 dni notice)
9. Reklamacje (14 dni na odpowiedź)
10. Postanowienia końcowe (prawo polskie)

**Uwaga implementacyjna:** Polityka wspomina pola (login, imię, nazwisko, miasto), których obecny formularz rejestracji **jeszcze nie zbiera** — treść jest „przyszłościowa” (Partia II). To OK; lepiej mieć politykę szerszą niż węższą.

### Stan codebase BassMap PL

#### Layout — brak stopki i stron prawnych

`src/layouts/Layout.astro` — minimalny HTML wrapper (meta, CSS, slot). **Brak** nawigacji, footera, linków prawnych.

#### Strona główna

`src/pages/index.astro` — Topbar + DiscoveryShell + RoadmapTeaser. **Brak** linków prawnych na dole.

#### Rejestracja — luka prawna

`src/components/auth/SignUpForm.tsx` (L65–132) — tylko email + hasło. **Brak** checkboxa akceptacji regulaminu, **brak** linków do dokumentów.

`src/pages/api/auth/signup.ts` — walidacja email/hasło, **brak** weryfikacji zgody.

#### Brak routów prawnych

W `src/pages/` nie ma `/polityka-prywatnosci`, `/regulamin` ani folderu `legal/`.

### Rekomendowana implementacja (minimalna, przed Partią II)

#### 1. Strony statyczne

```
src/pages/polityka-prywatnosci.astro
src/pages/regulamin.astro
```

Wzorzec wizualny: jak `src/pages/events/[id].astro` — Layout + bg-cosmic + Topbar + czytelna kolumna tekstu (`max-w-2xl`, `prose`-style). Treść z docx → markdown/HTML w komponencie Astro lub pliki `.md` importowane w stronach.

#### 2. Komponent stopki

```
src/components/SiteFooter.astro
```

Mały, dyskretny footer:
- Polityka prywatności · Regulamin
- Opcjonalnie: © 2026 BassMap PL · kontakt@bassmap.pl
- Klasy: `text-xs text-blue-100/50`, zgodne z design system

**Gdzie dodać:**
- `index.astro` — pod RoadmapTeaser
- `events/[id].astro` — na dole
- `auth/signup.astro` — pod kartą formularza
- `auth/signin.astro` — opcjonalnie (mniej krytyczne)

Alternatywa bez komponentu: inline w każdej stronie — gorsze utrzymanie.

#### 3. Checkbox w rejestracji

W `SignUpForm.tsx` przed SubmitButton:

```tsx
<label className="flex items-start gap-2 text-xs text-blue-100/70">
  <input type="checkbox" name="acceptTerms" required className="mt-0.5" />
  <span>
    Akceptuję{" "}
    <a href="/regulamin" target="_blank" className="text-purple-300 hover:underline">
      Regulamin
    </a>{" "}
    i zapoznałem/am się z{" "}
    <a href="/polityka-prywatnosci" target="_blank" className="text-purple-300 hover:underline">
      Polityką prywatności
    </a>
  </span>
</label>
```

Backend (`signup.ts`): opcjonalnie walidacja `acceptTerms === "on"` — defense in depth.

#### 4. Po Partii II (F-04 / S-09)

Gdy powstanie app shell z marketing homepage:
- Przenieść `SiteFooter` do globalnego layoutu shellu (linki na **wszystkich** stronach)
- Homepage marketingowa może mieć rozbudowaną stopkę z sekcjami
- Checkbox rejestracji zostaje niezależnie od shellu

### Dlaczego nie czekać na S-09 (marketing homepage)?

| Argument | Wyjaśnienie |
| -------- | ----------- |
| Rejestracja już działa | Użytkownicy mogą zakładać konta **teraz** — bez regulaminu to luka prawna |
| Cookies sesji | Supabase auth ustawia cookies — polityka powinna być dostępna |
| Niski koszt | 2 strony Astro + mały footer + checkbox ≈ 1 mały slice |
| Treść gotowa | Docx od właściciela — nie trzeba placeholderów |
| Roadmapa oryginalna | S-11 miało prerequisite S-09 tylko dlatego, że link miał być „na stronie głównej marketingowej” — obecna `/` to lista eventów; footer/link na dole wystarczy |

## Code References

- `src/layouts/Layout.astro:1-42` — minimalny layout bez footera
- `src/pages/index.astro:32-48` — strona główna, miejsce na footer pod RoadmapTeaser
- `src/components/auth/SignUpForm.tsx:65-132` — formularz bez akceptacji regulaminu
- `src/pages/auth/signup.astro:8-21` — strona rejestracji bez linków prawnych
- `src/components/Topbar.astro:5-43` — nawigacja operacyjna (nie miejsce na dokumenty prawne)
- `context/foundation/roadmap.md:301-316` — oryginalna definicja S-11 (Partia II)

## Architecture Insights

- **Astro SSR:** strony prawne to statyczne `.astro` z `prerender = false` (spójność z resztą) — zero bazy, zero API.
- **Treść prawna:** trzymać w `src/content/legal/` jako markdown lub bezpośrednio w `.astro` — łatwa aktualizacja przy zmianach regulaminu.
- **Komponent SiteFooter:** pierwszy krok do globalnego footera w F-04; nie duplikować później.
- **public-roadmap.ts:** NIE dodawać S-11 — to nie user-visible feature, tylko compliance.

## Historical Context

- `context/foundation/roadmap.md` — S-11 pierwotnie w Partii II (Stream C: F-04 → S-09 → S-10 → S-11), prerequisite S-09.
- `context/foundation/prd.md` — NFR Privacy: „no personal data from anonymous fans” — wymaga aktualizacji po wdrożeniu kont (Partia II), ale polityka już opisuje rejestrację.
- Brak wcześniejszych change folderów dla legal-pages.

## Related Research

- Brak wcześniejszych `research.md` dla tego tematu.

## Open Questions

1. **Ścieżki URL:** `/polityka-prywatnosci` vs `/prywatnosc` — rekomendacja: pełne slugi; Owner: user. Block: no.
2. **Format treści:** markdown w repo vs HTML w Astro — rekomendacja: markdown w `src/content/legal/` dla łatwej edycji; Owner: team. Block: no.
3. **Walidacja checkboxa w API:** tylko frontend `required` vs też backend — rekomendacja: oba; Owner: team. Block: no.
4. **Osobna Polityka cookies / banner:** na MVP wystarczy §6 w Polityce; pełny cookie banner gdy dodamy analitykę — Owner: user. Block: no.
5. **Aktualizacja PRD NFR Privacy:** po wdrożeniu S-11 zsynchronizować `prd.md` — Owner: user. Block: no.

## Rekomendacja roadmapy

**Przesunąć S-11 z Partii II do Partii I** — status `ready`, prerequisites `S-02`, równolegle z S-07/S-08. Uzasadnienie: gotowe dokumenty prawne + działająca rejestracja + niski koszt implementacji + wymogi RODO.

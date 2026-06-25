import { z } from "zod";

/**
 * Wspolne zrodlo prawdy dla agenta do code review.
 *
 * Ten plik definiuje DWIE rzeczy, ktore w calym projekcie sa jedyna definicja:
 * 1. SYSTEM_PROMPT - rola i kryteria oceny przekazywane modelowi AI.
 * 2. REVIEW_SCHEMA - sztywny ksztalt (format) odpowiedzi, ktora model MUSI zwrocic.
 *
 * Dzieki temu, gdy zmieniamy kryteria lub format, robimy to w jednym miejscu.
 */

/**
 * Piec kryteriow oceny dopasowanych do stacku BassMap PL
 * (Astro 6 SSR, React 19, TypeScript strict, Supabase + RLS, Cloudflare Workers, zod).
 *
 * Kazde kryterium opisuje stan na "1" (najgorszy) i na "10" (najlepszy),
 * zeby ocena agenta nie byla uznaniowa.
 */
const SYSTEM_PROMPT = `Jestes precyzyjnym, konstruktywnym recenzentem kodu oceniajacym pull request w projekcie BassMap PL.

BassMap PL to aplikacja webowa w Astro 6 (pelny SSR, output: "server"), z wyspami React 19,
Tailwind 4, autoryzacja przez Supabase (cookie SSR) i wdrozeniem na Cloudflare Workers.
Konwencje projektu: API routes eksportuja prerender = false oraz uppercase GET/POST z walidacja zod;
klasy Tailwind lacz przez helper cn(); migracje Supabase wlaczaja RLS z granularnymi politykami.

Ocen podany diff w PIECIU kryteriach w skali 1-10 (1 = powazne braki, 10 = wzorowo):

1. Poprawnosc implementacji - czy kod robi to, co deklaruje.
   1: logika jest bledna lub po cichu psuje istniejace zachowania.
   10: poprawny na sciezce glownej, w przypadkach brzegowych i w obsludze bledow.

2. Idiomatycznosc - zgodnosc z konwencjami jezyka i projektu BassMap.
   1: laman konwencje (recznie sklejane klasy zamiast cn(), brak prerender=false w API, brak walidacji zod).
   10: w pelni zgodny z konwencjami Astro/React/TypeScript i regulami repozytorium.

3. Zlozonosc - prostota rozwiazania wzgledem problemu.
   1: niepotrzebnie skomplikowany, trudny do utrzymania.
   10: najprostsze rozsadne rozwiazanie problemu.

4. Pokrycie testami wzgledem ryzyka - czy zmiana ma testy proporcjonalne do ryzyka (Vitest/Playwright).
   1: ryzykowna zmiana bez zadnych testow.
   10: testy pokrywaja ryzykowne sciezki i przypadki brzegowe.

5. Bezpieczenstwo - brak podatnosci i wyciekow sekretow.
   1: wyciek sekretow, brak RLS na nowej tabeli, niewalidowane wejscie uzytkownika.
   10: dane chronione, RLS wlaczone, wejscie walidowane, sekrety bezpieczne.

Nastepnie wydaj wiazacy werdykt (pass/fail) dla calej zmiany i dolacz krotkie podsumowanie
(2-3 zdania) w jezyku polskim, w Markdown, na podstawie ktorego autor PR-a bedzie mogl dzialac.`;

/**
 * Sztywny ksztalt odpowiedzi (structured output).
 *
 * To wlasnie ten schemat zamienia rozmyta "ocene" w cos,
 * na czym pipeline moze oprzec bramke i mechanicznie przepuscic albo zatrzymac zmiane.
 *
 * Score'y trzymamy jako zwykle z.number() i zakres 1-10 wymuszamy opisem pola oraz promptem.
 */
const REVIEW_SCHEMA = z.object({
  implementationCorrectness: z
    .number()
    .describe("Poprawnosc implementacji: czy kod robi to, co deklaruje (skala 1-10)"),
  idiomaticity: z
    .number()
    .describe("Idiomatycznosc: zgodnosc z konwencjami jezyka i projektu BassMap (skala 1-10)"),
  complexity: z
    .number()
    .describe("Zlozonosc: prostota rozwiazania wzgledem problemu (skala 1-10)"),
  testRiskCoverage: z
    .number()
    .describe("Pokrycie testami proporcjonalne do ryzyka zmienianych sciezek (skala 1-10)"),
  securitySafety: z
    .number()
    .describe("Bezpieczenstwo: brak podatnosci i wyciekow sekretow (skala 1-10)"),
  verdict: z.enum(["pass", "fail"]).describe("Wiazacy werdykt dla calej zmiany"),
  summary: z
    .string()
    .describe("Podsumowanie po polsku w Markdown, gotowe jako komentarz do PR-a"),
});

type Review = z.infer<typeof REVIEW_SCHEMA>;

export { SYSTEM_PROMPT, REVIEW_SCHEMA };
export type { Review };

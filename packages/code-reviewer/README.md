# @bassmap/code-reviewer

Agent AI do automatycznego code review (przegladu kodu) pull requestow w BassMap PL.
Zlozony z **Vercel AI SDK** + **OpenRouter**. Czesc projektu na odznake **10xChampion**.

Co robi: dostaje na wejscie zmiany w kodzie (`git diff`), wysyla je do modelu AI razem
z 5 kryteriami oceny i zwraca ustrukturyzowana ocene w formacie JSON (ocena 1-10 za kazde
kryterium + werdykt pass/fail + krotkie podsumowanie po polsku).

## 1. Klucz API (OpenRouter)

Klucz to "haslo dostepu" do modelu AI. Bez niego agent nie zadziala. Krok po kroku:

1. Wejdz na https://openrouter.ai i zaloz konto (mozesz zalogowac sie kontem Google).
2. Po zalogowaniu wejdz w **Keys** (https://openrouter.ai/keys).
3. Kliknij **Create Key**, nadaj dowolna nazwe (np. `bassmap-review`) i skopiuj wygenerowany klucz.
   Klucz zaczyna sie od `sk-or-...`. Skopiuj go od razu - pozniej nie da sie go podejrzec ponownie.
4. Doladuj konto (np. 5 USD) - wystarczy na caly projekt certyfikatu.

> Domyslnie uzywamy taniego modelu `google/gemini-2.5-flash-lite` (kilka centow za jedno review).
> Jesli pierwszy model nie zadziala, agent probuje zapasowe: DeepSeek V3 i GPT-5 Mini.

## 2. Zainstaluj zaleznosci

W tym folderze (`packages/code-reviewer`) uruchom raz:

```powershell
npm install
```

## 3. Podaj klucz i uruchom recenzenta

W PowerShell (Windows) ustaw klucz na czas sesji terminala i odpal review na biezacych zmianach:

```powershell
$env:OPENROUTER_API_KEY = "sk-or-...tu-wklej-swoj-klucz..."
```

Najprostszy test, niezalezny od tego, czy masz teraz zmiany w Git:

```powershell
npm run review:sample
```

Test na biezacych, niezacommitowanych zmianach:

```powershell
git diff | npx tsx src/review.ts
```

Test na zmianach z brancha wzgledem `main` (przydatny pozniej w CI/CD):

```powershell
git diff origin/main...HEAD | npx tsx src/review.ts
```

Jesli zobaczysz komunikat `Pusty diff na wejsciu`, to znaczy, ze Git nie przekazal agentowi zadnych zmian.
Wtedy najpierw uruchom test przykladowy:

```powershell
npm run review:sample
```

W odpowiedzi zobaczysz JSON z ocenami i werdyktem. Gdy werdykt to `fail`,
program konczy sie kodem bledu (przyda sie pozniej jako bramka w pipeline CI/CD).

## Konfiguracja

- `OPENROUTER_API_KEY` (wymagane) - klucz z OpenRoutera.
- `REVIEW_MODEL` (opcjonalne) - inny model, np. `deepseek/deepseek-chat-v3-0324`.
  Domyslnie: `google/gemini-2.5-flash-lite`.

## Pliki

- `src/review-schema.ts` - 5 kryteriow oceny (system prompt) + sztywny format odpowiedzi (zod).
- `src/review.ts` - wlasciwy agent: czyta diff, wola model, zwraca JSON.

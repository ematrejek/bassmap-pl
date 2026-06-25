import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { REVIEW_SCHEMA, SYSTEM_PROMPT, type Review } from "./review-schema.js";

/**
 * Agent do code review zlozony z Vercel AI SDK (wersja "do zlozenia").
 *
 * Wejscie: diff z gita (ze standardowego wejscia / stdin).
 * Wyjscie: ustrukturyzowana ocena JSON zgodna z REVIEW_SCHEMA.
 *
 * Uruchomienie lokalne (PowerShell):
 *   git diff origin/main...HEAD | npx tsx src/review.ts
 * albo dowolny inny diff:
 *   git diff | npx tsx src/review.ts
 */

// Domyslnie tani model platny (kilka centow za review). Nadpisz przez REVIEW_MODEL.
const MODEL_ID = process.env.REVIEW_MODEL ?? "google/gemini-2.5-flash-lite";
const FALLBACK_MODEL_IDS = [
  MODEL_ID,
  "deepseek/deepseek-chat-v3-0324",
  "openai/gpt-5-mini",
];
const UNIQUE_MODEL_IDS = [...new Set(FALLBACK_MODEL_IDS)];

// Klucz API czytamy ze zmiennej srodowiskowej. Bez niego agent nie ruszy.
const API_KEY = process.env.OPENROUTER_API_KEY;

/** Czyta diff przekazany na standardowe wejscie (stdin). */
async function readDiff(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** Wyciaga JSON z odpowiedzi modelu i sprawdza go schematem zod. */
function parseReviewResponse(text: string, modelId: string): Review {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonStart = withoutFence.indexOf("{");
  const jsonEnd = withoutFence.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(`Model (${modelId}) nie zwrocil JSON-a. Odpowiedz modelu:\n${text}`);
  }

  const rawJson = withoutFence.slice(jsonStart, jsonEnd + 1);
  const parsedJson: unknown = JSON.parse(rawJson);
  const parsedReview = REVIEW_SCHEMA.safeParse(parsedJson);

  if (!parsedReview.success) {
    throw new Error(`Model zwrocil JSON w zlym formacie: ${parsedReview.error.message}`);
  }

  return parsedReview.data;
}

async function reviewWithModel(diff: string, modelId: string): Promise<Review> {
  const openrouter = createOpenRouter({ apiKey: API_KEY });
  // Darmowe modele OpenRoutera nie zawsze wspieraja natywny structured output.
  // Dlatego wymuszamy JSON promptem, a format sprawdzamy lokalnie przez REVIEW_SCHEMA.
  const result = await generateText({
    model: openrouter(modelId),
    system: SYSTEM_PROMPT,
    prompt: `Zrecenzuj ten diff.

Zwroc WYLACZNIE poprawny JSON, bez Markdown i bez dodatkowego tekstu.
JSON musi miec dokladnie te pola:
{
  "implementationCorrectness": number,
  "idiomaticity": number,
  "complexity": number,
  "testRiskCoverage": number,
  "securitySafety": number,
  "verdict": "pass" | "fail",
  "summary": string
}

Diff:

${diff}`,
  });

  return parseReviewResponse(result.text, modelId);
}

/** Wlasciwy proces oceny: diff wchodzi, ustrukturyzowana ocena wychodzi. */
async function review(diff: string): Promise<Review> {
  if (!API_KEY) {
    throw new Error(
      "Brak klucza API. Ustaw zmienna srodowiskowa OPENROUTER_API_KEY (patrz README.md).",
    );
  }

  const errors: string[] = [];

  for (const modelId of UNIQUE_MODEL_IDS) {
    try {
      console.error(`Probuje modelu: ${modelId}`);
      return await reviewWithModel(diff, modelId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${modelId}: ${message}`);
      console.error(`Model ${modelId} nie zadzialal, probuje kolejnego.`);
    }
  }

  throw new Error(`Zaden model nie zadzialal.\n\n${errors.join("\n\n")}`);
}

// Punkt wejscia calego procesu.
async function main(): Promise<void> {
  const diff = await readDiff();

  if (diff.trim().length === 0) {
    console.error(
      "Pusty diff na wejsciu. Przekaz zmiany, np.: git diff | npx tsx src/review.ts",
    );
    process.exit(1);
  }

  const result = await review(diff);
  console.log(JSON.stringify(result, null, 2));

  // Kod wyjscia 1, gdy werdykt to "fail" - to przyda sie pozniej jako bramka w pipeline.
  if (result.verdict === "fail") process.exit(1);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Review nie powiodlo sie: ${message}`);
  process.exit(1);
});

import { readFile } from "node:fs/promises";
import { REVIEW_SCHEMA, type Review } from "./review-schema.js";

const scoreLabels = [
  ["implementationCorrectness", "Poprawnosc implementacji"],
  ["idiomaticity", "Zgodnosc z konwencjami projektu"],
  ["complexity", "Prostota rozwiazania"],
  ["testRiskCoverage", "Pokrycie testami wzgledem ryzyka"],
  ["securitySafety", "Bezpieczenstwo"],
] as const;

async function readReview(path: string): Promise<Review> {
  const raw = await readFile(path, "utf8");
  const parsedJson: unknown = JSON.parse(raw);
  const parsedReview = REVIEW_SCHEMA.safeParse(parsedJson);

  if (!parsedReview.success) {
    throw new Error(`Plik review ma zly format: ${parsedReview.error.message}`);
  }

  return parsedReview.data;
}

function verdictLabel(verdict: Review["verdict"]): string {
  return verdict === "pass" ? "PASS - zmiana wyglada dobrze" : "FAIL - zmiana wymaga poprawek";
}

function renderMarkdown(review: Review): string {
  const rows = scoreLabels
    .map(([key, label]) => `| ${label} | ${review[key]}/10 |`)
    .join("\n");

  return `## AI Code Review

**Werdykt:** ${verdictLabel(review.verdict)}

| Kryterium | Ocena |
| --- | ---: |
${rows}

### Podsumowanie

${review.summary}

---
Automatyczny komentarz wygenerowany przez BassMap AI code reviewer.
`;
}

async function main(): Promise<void> {
  const [, , reviewPath] = process.argv;

  if (!reviewPath) {
    throw new Error("Podaj sciezke do pliku JSON z wynikiem review.");
  }

  const review = await readReview(reviewPath);
  console.log(renderMarkdown(review));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Nie udalo sie wyrenderowac komentarza: ${message}`);
  process.exit(1);
});

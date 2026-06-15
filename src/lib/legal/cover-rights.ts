import { z } from "zod";
import type { CoverDeclarationKind, CoverSource } from "@/types";

export const COVER_SOURCES = ["facebook", "instagram", "organizer_website", "own"] as const;

export const COVER_SOURCE_LABELS: Record<CoverSource, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  organizer_website: "Strona organizatora",
  own: "Własna",
};

export const COVER_DECLARATION_KINDS = ["creator_consent", "own_copyright"] as const;

export const DECLARATION_LABELS: Record<CoverDeclarationKind, string> = {
  creator_consent: "Oświadczam, że posiadam zgodę twórcy na publikację grafiki",
  own_copyright: "Oświadczam, że posiadam prawa autorskie do grafiki",
};

export function declarationKindForSource(source: CoverSource): CoverDeclarationKind {
  return source === "own" ? "own_copyright" : "creator_consent";
}

export function formatCoverSourceLabel(source: CoverSource | null | undefined): string {
  if (source == null) {
    return "Brak danych audytu";
  }
  return COVER_SOURCE_LABELS[source];
}

const coverSourceSchema = z.enum(COVER_SOURCES, {
  errorMap: () => ({ message: "Wybierz źródło grafiki okładki" }),
});

const coverDeclarationAcceptedSchema = z.literal(true, {
  errorMap: () => ({ message: "Musisz złożyć wymagane oświadczenie dotyczące okładki" }),
});

const coverRightsFieldsSchema = z.object({
  coverSource: coverSourceSchema,
  coverDeclarationAccepted: coverDeclarationAcceptedSchema,
});

export interface CoverRightsParseSuccess {
  ok: true;
  coverSource: CoverSource;
  declarationKind: CoverDeclarationKind;
}

export interface CoverRightsParseFailure {
  ok: false;
  error: string;
}

export type CoverRightsParseResult = CoverRightsParseSuccess | CoverRightsParseFailure;

function parseCoverRightsInput(
  coverSource: unknown,
  coverDeclarationAccepted: unknown,
  declarationKind?: unknown,
): CoverRightsParseResult {
  const declarationAccepted =
    coverDeclarationAccepted === true || coverDeclarationAccepted === "true" ? true : coverDeclarationAccepted;

  const parsed = coverRightsFieldsSchema.safeParse({
    coverSource,
    coverDeclarationAccepted: declarationAccepted,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { ok: false, error: firstIssue.message };
  }

  const coverSourceValue = parsed.data.coverSource;
  const expectedKind = declarationKindForSource(coverSourceValue);

  if (declarationKind !== undefined && declarationKind !== expectedKind) {
    return { ok: false, error: "Nieprawidłowe oświadczenie dla wybranego źródła grafiki" };
  }

  return {
    ok: true,
    coverSource: coverSourceValue,
    declarationKind: expectedKind,
  };
}

export function parseCoverRightsFormData(formData: FormData): CoverRightsParseResult {
  return parseCoverRightsInput(formData.get("coverSource"), formData.get("coverDeclarationAccepted"));
}

export function parseCoverRightsFields(record: Record<string, unknown>): CoverRightsParseResult {
  return parseCoverRightsInput(
    record.coverSource,
    record.coverDeclarationAccepted,
    record.declarationKind ?? record.coverDeclarationKind,
  );
}

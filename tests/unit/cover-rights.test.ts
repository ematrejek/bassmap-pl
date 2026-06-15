import { describe, expect, it } from "vitest";
import {
  COVER_SOURCES,
  declarationKindForSource,
  formatCoverSourceLabel,
  parseCoverRightsFields,
  parseCoverRightsFormData,
} from "@/lib/legal/cover-rights";

describe("formatCoverSourceLabel", () => {
  it("returns audit fallback for null or undefined", () => {
    expect(formatCoverSourceLabel(null)).toBe("Brak danych audytu");
    expect(formatCoverSourceLabel(undefined)).toBe("Brak danych audytu");
  });

  it("returns Polish label for known sources", () => {
    expect(formatCoverSourceLabel("facebook")).toBe("Facebook");
    expect(formatCoverSourceLabel("own")).toBe("Własna");
  });
});

describe("declarationKindForSource", () => {
  it("maps own to own_copyright and external sources to creator_consent", () => {
    expect(declarationKindForSource("own")).toBe("own_copyright");
    expect(declarationKindForSource("facebook")).toBe("creator_consent");
    expect(declarationKindForSource("instagram")).toBe("creator_consent");
    expect(declarationKindForSource("organizer_website")).toBe("creator_consent");
  });
});

describe("parseCoverRightsFormData", () => {
  it("rejects missing cover source", () => {
    const formData = new FormData();
    formData.set("coverDeclarationAccepted", "true");

    const result = parseCoverRightsFormData(formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Wybierz źródło grafiki okładki");
    }
  });

  it("rejects invalid cover source", () => {
    const formData = new FormData();
    formData.set("coverSource", "twitter");
    formData.set("coverDeclarationAccepted", "true");

    const result = parseCoverRightsFormData(formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Wybierz źródło grafiki okładki");
    }
  });

  it("rejects missing declaration checkbox", () => {
    const formData = new FormData();
    formData.set("coverSource", "facebook");

    const result = parseCoverRightsFormData(formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Musisz złożyć wymagane oświadczenie dotyczące okładki");
    }
  });

  it.each(COVER_SOURCES)("accepts valid pair for source %s", (source) => {
    const formData = new FormData();
    formData.set("coverSource", source);
    formData.set("coverDeclarationAccepted", "true");

    const result = parseCoverRightsFormData(formData);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.coverSource).toBe(source);
      expect(result.declarationKind).toBe(declarationKindForSource(source));
    }
  });
});

describe("parseCoverRightsFields", () => {
  it("rejects declaration kind mismatch for own source", () => {
    const result = parseCoverRightsFields({
      coverSource: "own",
      coverDeclarationAccepted: true,
      declarationKind: "creator_consent",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Nieprawidłowe oświadczenie dla wybranego źródła grafiki");
    }
  });

  it("accepts matching declaration kind when provided", () => {
    const result = parseCoverRightsFields({
      coverSource: "instagram",
      coverDeclarationAccepted: true,
      declarationKind: "creator_consent",
    });

    expect(result).toEqual({
      ok: true,
      coverSource: "instagram",
      declarationKind: "creator_consent",
    });
  });
});

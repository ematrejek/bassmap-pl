import { describe, expect, it } from "vitest";
import { parseReportIssue, reportIssueSchema } from "@/lib/contact/report-issue-schema";

describe("reportIssueSchema", () => {
  it("accepts valid payload", () => {
    const result = reportIssueSchema.safeParse({
      email: "fan@example.com",
      message: "Mapa nie ładuje się na telefonie.",
      name: "Ania",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short message", () => {
    const result = parseReportIssue({
      email: "fan@example.com",
      message: "krótko",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/10 znaków/);
    }
  });

  it("rejects invalid email", () => {
    const result = parseReportIssue({
      email: "not-an-email",
      message: "To jest poprawna długość wiadomości.",
    });
    expect(result.success).toBe(false);
  });

  it("treats empty name as undefined", () => {
    const result = parseReportIssue({
      email: "fan@example.com",
      message: "Opis problemu z wystarczającą liczbą znaków.",
      name: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBeUndefined();
    }
  });
});

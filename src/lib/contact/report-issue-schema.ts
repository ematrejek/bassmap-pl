import { z } from "zod";

export const reportIssueSchema = z.object({
  email: z.string().trim().email("Podaj poprawny adres e-mail"),
  message: z
    .string()
    .trim()
    .min(10, "Wiadomość musi mieć co najmniej 10 znaków")
    .max(5000, "Wiadomość może mieć maksymalnie 5000 znaków"),
  name: z
    .string()
    .trim()
    .max(120, "Imię lub nick może mieć maksymalnie 120 znaków")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type ReportIssueInput = z.infer<typeof reportIssueSchema>;

export function parseReportIssue(
  input: unknown,
): { success: true; data: ReportIssueInput } | { success: false; error: string } {
  const result = reportIssueSchema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return { success: false, error: firstIssue.message };
  }
  return { success: true, data: result.data };
}

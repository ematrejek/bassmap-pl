import { z } from "zod";

const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Komentarz nie może być pusty")
  .max(2000, "Komentarz może mieć maksymalnie 2000 znaków");

export type ParsedCommentBody = z.infer<typeof commentBodySchema>;

export function parseCommentBody(
  input: unknown,
): { success: true; data: ParsedCommentBody } | { success: false; error: string } {
  const result = commentBodySchema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0]?.message ?? "Nieprawidłowy komentarz";
    return { success: false, error: firstIssue };
  }

  return { success: true, data: result.data };
}

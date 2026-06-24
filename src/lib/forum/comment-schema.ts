import { z } from "zod";

const forumCommentBodySchema = z
  .string()
  .trim()
  .min(1, "Komentarz nie może być pusty")
  .max(2000, "Komentarz może mieć maksymalnie 2000 znaków");

export type ParsedForumCommentBody = z.infer<typeof forumCommentBodySchema>;

export function parseForumCommentBody(
  input: unknown,
): { success: true; data: ParsedForumCommentBody } | { success: false; error: string } {
  const result = forumCommentBodySchema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0]?.message ?? "Nieprawidłowy komentarz";
    return { success: false, error: firstIssue };
  }

  return { success: true, data: result.data };
}

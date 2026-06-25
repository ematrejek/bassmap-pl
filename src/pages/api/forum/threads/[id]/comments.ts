import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { parseForumCommentBody } from "@/lib/forum/comment-schema";
import { createForumComment, listForumComments } from "@/lib/services/forum-comments";
import { getForumThreadById } from "@/lib/services/forum-threads";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const threadIdSchema = z.string().uuid("Nieprawidłowy identyfikator wątku");

const createCommentBodySchema = z.object({
  body: z.string(),
});

function parseThreadId(params: { id?: string }): { id: string } | { error: string } {
  const result = threadIdSchema.safeParse(params.id);
  if (!result.success) {
    return { error: "Nieprawidłowy identyfikator wątku" };
  }
  return { id: result.data };
}

export const GET: APIRoute = async (context) => {
  const idResult = parseThreadId(context.params);
  if ("error" in idResult) {
    return jsonResponse({ error: idResult.error }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await listForumComments(supabase, idResult.id);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 500);
  }

  return jsonResponse({ comments: result.data }, 200);
};

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const idResult = parseThreadId(context.params);
  if ("error" in idResult) {
    return jsonResponse({ error: idResult.error }, 400);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  if (!user.email) {
    return jsonResponse({ error: "Brak adresu e-mail na koncie" }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const thread = await getForumThreadById(supabase, idResult.id);
  if ("error" in thread) {
    return jsonResponse({ error: "Nie znaleziono wątku" }, 404);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400);
  }

  const parsedBody = createCommentBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return jsonResponse({ error: "Nieprawidłowe dane" }, 400);
  }

  const commentResult = parseForumCommentBody(parsedBody.data.body);
  if (!commentResult.success) {
    return jsonResponse({ error: commentResult.error }, 400);
  }

  const result = await createForumComment(supabase, {
    authorId: user.id,
    authorEmail: user.email,
    threadId: idResult.id,
    body: commentResult.data,
  });

  if ("error" in result) {
    const status = result.error === "Nie można dodać komentarza do tego wątku" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ comment: result.data }, 201);
};

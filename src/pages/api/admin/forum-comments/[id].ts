import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAdmin } from "@/lib/auth/guards";
import { deleteForumComment } from "@/lib/services/forum-comments";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator komentarza");

function parseCommentId(params: { id?: string }): { id: string } | { error: string } {
  const result = idSchema.safeParse(params.id);
  if (!result.success) {
    return { error: "Nieprawidłowy identyfikator komentarza" };
  }
  return { id: result.data };
}

export const DELETE: APIRoute = async (context) => {
  const adminError = requireAdmin(context.locals);
  if (adminError) {
    return adminError;
  }

  const idResult = parseCommentId(context.params);
  if ("error" in idResult) {
    return jsonResponse({ error: idResult.error }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await deleteForumComment(supabase, idResult.id);
  if ("error" in result) {
    const status = result.error === "Nie znaleziono komentarza" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ id: result.data.id }, 200);
};

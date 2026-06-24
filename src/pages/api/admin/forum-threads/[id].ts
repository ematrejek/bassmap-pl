import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAdmin } from "@/lib/auth/guards";
import { deleteForumThread } from "@/lib/services/forum-threads";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator wątku");

function parseThreadId(params: { id?: string }): { id: string } | { error: string } {
  const result = idSchema.safeParse(params.id);
  if (!result.success) {
    return { error: "Nieprawidłowy identyfikator wątku" };
  }
  return { id: result.data };
}

export const DELETE: APIRoute = async (context) => {
  const adminError = requireAdmin(context.locals);
  if (adminError) {
    return adminError;
  }

  const idResult = parseThreadId(context.params);
  if ("error" in idResult) {
    return jsonResponse({ error: idResult.error }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await deleteForumThread(supabase, idResult.id);
  if ("error" in result) {
    const status = result.error === "Nie znaleziono wątku" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ id: result.data.id }, 200);
};

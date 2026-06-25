import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { markNotificationRead } from "@/lib/services/notifications";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const notificationIdSchema = z.string().uuid("Nieprawidłowy identyfikator powiadomienia");

function parseNotificationId(params: { id?: string }): { id: string } | { error: string } {
  const result = notificationIdSchema.safeParse(params.id);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Nieprawidłowy identyfikator powiadomienia" };
  }
  return { id: result.data };
}

export const PATCH: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const idResult = parseNotificationId(context.params);
  if ("error" in idResult) {
    return jsonResponse({ error: idResult.error }, 400);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await markNotificationRead(supabase, user.id, idResult.id);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 404);
  }

  return jsonResponse({ notification: result.data }, 200);
};

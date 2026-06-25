import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { friendRelationshipStatusQuerySchema } from "@/lib/fan/friends-schema";
import { getFriendRelationshipStatus } from "@/lib/services/friends";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  const parsed = friendRelationshipStatusQuerySchema.safeParse({
    userId: context.url.searchParams.get("userId"),
  });
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe zapytanie" }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await getFriendRelationshipStatus(supabase, user.id, parsed.data.userId);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 500);
  }

  return jsonResponse(result.data, 200);
};

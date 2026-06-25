import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { friendRelationshipIdSchema } from "@/lib/fan/friends-schema";
import { FRIENDSHIP_NOT_FOUND_ERROR, removeFriendship } from "@/lib/services/friends";
import { createClient } from "@/lib/supabase";

export const prerender = false;

function parseFriendshipId(params: { id?: string }): { id: string } | { error: string } {
  const result = friendRelationshipIdSchema.safeParse(params.id);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Nieprawidłowy identyfikator relacji znajomych" };
  }
  return { id: result.data };
}

export const DELETE: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const idResult = parseFriendshipId(context.params);
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

  const result = await removeFriendship(supabase, user.id, idResult.id);
  if ("error" in result) {
    const status = result.error === FRIENDSHIP_NOT_FOUND_ERROR ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse(result.data, 200);
};

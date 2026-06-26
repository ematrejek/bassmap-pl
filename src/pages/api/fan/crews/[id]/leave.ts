import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { crewIdSchema } from "@/lib/fan/crew-schema";
import { CREW_OWNER_CANNOT_LEAVE_ERROR, leaveCrew } from "@/lib/services/crews";
import { createClient } from "@/lib/supabase";

export const prerender = false;

function parseCrewId(params: { id?: string }): { id: string } | { error: string } {
  const result = crewIdSchema.safeParse(params.id);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Nieprawidłowy identyfikator ekipy" };
  }
  return { id: result.data };
}

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const idResult = parseCrewId(context.params);
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

  const result = await leaveCrew(supabase, user.id, idResult.id);
  if ("error" in result) {
    const status = result.error === CREW_OWNER_CANNOT_LEAVE_ERROR ? 400 : 404;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse(result.data, 200);
};

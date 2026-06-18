import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAdmin } from "@/lib/auth/guards";
import { applyChangeSuggestionToEvent } from "@/lib/services/change-suggestions";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator sugestii");

function parseSuggestionId(params: { id?: string }): { id: string } | { error: string } {
  const result = idSchema.safeParse(params.id);
  if (!result.success) {
    return { error: "Nieprawidłowy identyfikator sugestii" };
  }
  return { id: result.data };
}

export const POST: APIRoute = async (context) => {
  const adminError = requireAdmin(context.locals);
  if (adminError) {
    return adminError;
  }

  const idResult = parseSuggestionId(context.params);
  if ("error" in idResult) {
    return jsonResponse({ error: idResult.error }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await applyChangeSuggestionToEvent(supabase, idResult.id);
  if ("error" in result) {
    const status = result.error === "Nie znaleziono sugestii" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ event: result.data.event, suggestion: result.data.suggestion }, 200);
};

import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { createFanChangeSuggestion } from "@/lib/services/change-suggestions";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const createSuggestionSchema = z.object({
  eventId: z.string().uuid("Nieprawidłowy identyfikator wydarzenia"),
  body: z
    .string()
    .min(10, "Sugestia musi mieć co najmniej 10 znaków")
    .max(2000, "Sugestia może mieć maksymalnie 2000 znaków"),
});

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  if (context.locals.isAdmin) {
    return jsonResponse({ error: "Admin dodaje wydarzenia w panelu admina" }, 403);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400);
  }

  const parsed = createSuggestionSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Nieprawidłowe dane";
    return jsonResponse({ error: firstIssue }, 400);
  }

  const result = await createFanChangeSuggestion(supabase, user.id, parsed.data);
  if ("error" in result) {
    const status = result.error === "Nie znaleziono wydarzenia" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ suggestion: result.data }, 201);
};

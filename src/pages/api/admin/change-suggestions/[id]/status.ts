import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAdmin } from "@/lib/auth/guards";
import { updateChangeSuggestionStatus } from "@/lib/services/change-suggestions";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator sugestii");

const statusSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
});

function parseSuggestionId(params: { id?: string }): { id: string } | { error: string } {
  const result = idSchema.safeParse(params.id);
  if (!result.success) {
    return { error: "Nieprawidłowy identyfikator sugestii" };
  }
  return { id: result.data };
}

async function handleStatusChange(context: Parameters<APIRoute>[0]): Promise<Response> {
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

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400);
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Nieprawidłowy status" }, 400);
  }

  const result = await updateChangeSuggestionStatus(supabase, idResult.id, parsed.data.status);
  if ("error" in result) {
    const status = result.error === "Nie znaleziono sugestii" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ suggestion: result.data }, 200);
}

export const PATCH: APIRoute = handleStatusChange;

export const POST: APIRoute = handleStatusChange;

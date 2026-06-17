import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAdmin } from "@/lib/auth/guards";
import { parseEventCreate } from "@/lib/events/schema";
import { findSimilarEvents } from "@/lib/events/similarity";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const adminError = requireAdmin(context.locals);
  if (adminError) {
    return adminError;
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

  const parsed = parseEventCreate(body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const result = await findSimilarEvents(supabase, parsed.data);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ matches: result.data }, 200);
};

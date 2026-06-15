import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAdmin } from "@/lib/auth/guards";
import { getEventById, setEventStatus } from "@/lib/services/events";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator wydarzenia");

const statusSchema = z.object({
  status: z.enum(["published", "rejected"]),
});

function parseEventId(params: { id?: string }): { id: string } | { error: string } {
  const result = idSchema.safeParse(params.id);
  if (!result.success) {
    return { error: "Nieprawidłowy identyfikator wydarzenia" };
  }
  return { id: result.data };
}

async function handleStatusChange(context: Parameters<APIRoute>[0]): Promise<Response> {
  const adminError = requireAdmin(context.locals);
  if (adminError) {
    return adminError;
  }

  const idResult = parseEventId(context.params);
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

  const existing = await getEventById(supabase, idResult.id);
  if (!existing) {
    return jsonResponse({ error: "Nie znaleziono wydarzenia" }, 404);
  }

  if (existing.status !== "pending") {
    return jsonResponse({ error: "Można zmienić status tylko zgłoszenia oczekującego" }, 400);
  }

  const result = await setEventStatus(supabase, idResult.id, parsed.data.status);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ event: result.data }, 200);
}

export const PATCH: APIRoute = handleStatusChange;

/** POST – ten sam handler co PATCH (Cloudflare / niektóre proxy lepiej obsługują POST). */
export const POST: APIRoute = handleStatusChange;

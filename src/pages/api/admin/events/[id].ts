import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAdmin } from "@/lib/auth/guards";
import { parseEventUpdate } from "@/lib/events/schema";
import { deleteEvent, updateEvent } from "@/lib/services/events";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator wydarzenia");

function parseEventId(params: { id?: string }): { id: string } | { error: string } {
  const result = idSchema.safeParse(params.id);
  if (!result.success) {
    return { error: "Nieprawidłowy identyfikator wydarzenia" };
  }
  return { id: result.data };
}

export const PUT: APIRoute = async (context) => {
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

  const parsed = parseEventUpdate(body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const result = await updateEvent(supabase, idResult.id, parsed.data);
  if ("error" in result) {
    const status = result.error === "Nie znaleziono wydarzenia" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ event: result.data }, 200);
};

async function removeEventById(context: Parameters<APIRoute>[0]): Promise<Response | null> {
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

  const result = await deleteEvent(supabase, idResult.id);
  if ("error" in result) {
    const status = result.error === "Nie znaleziono wydarzenia" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return null;
}

export const DELETE: APIRoute = async (context) => {
  const errorResponse = await removeEventById(context);
  if (errorResponse) {
    return errorResponse;
  }

  return new Response(null, { status: 204 });
};

export const POST: APIRoute = async (context) => {
  const errorResponse = await removeEventById(context);
  if (errorResponse) {
    return errorResponse;
  }

  return context.redirect("/admin");
};

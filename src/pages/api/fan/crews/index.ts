import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { createCrewSchema } from "@/lib/fan/crew-schema";
import { CREW_ALREADY_EXISTS_ERROR, createCrew, getCrewOverview } from "@/lib/services/crews";
import { createClient } from "@/lib/supabase";

export const prerender = false;

async function readJsonBody(request: Request): Promise<{ body?: unknown; error?: Response }> {
  try {
    return { body: await request.json() };
  } catch {
    return { error: jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400) };
  }
}

export const GET: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await getCrewOverview(supabase, user.id);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 500);
  }

  return jsonResponse(result.data, 200);
};

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const jsonResult = await readJsonBody(context.request);
  if (jsonResult.error) {
    return jsonResult.error;
  }

  const parsed = createCrewSchema.safeParse(jsonResult.body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane ekipy" }, 400);
  }

  const result = await createCrew(supabase, user.id, parsed.data);
  if ("error" in result) {
    const status = result.error === CREW_ALREADY_EXISTS_ERROR ? 409 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ crew: result.data }, 201);
};

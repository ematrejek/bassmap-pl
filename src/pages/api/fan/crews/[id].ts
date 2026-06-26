import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { crewIdSchema, updateCrewSchema } from "@/lib/fan/crew-schema";
import {
  CREW_FORBIDDEN_ERROR,
  CREW_NOT_FOUND_ERROR,
  deleteCrew,
  getCrewByIdForViewer,
  updateCrew,
} from "@/lib/services/crews";
import { createClient } from "@/lib/supabase";

export const prerender = false;

function parseCrewId(params: { id?: string }): { id: string } | { error: string } {
  const result = crewIdSchema.safeParse(params.id);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Nieprawidłowy identyfikator ekipy" };
  }
  return { id: result.data };
}

async function readJsonBody(request: Request): Promise<{ body?: unknown; error?: Response }> {
  try {
    return { body: await request.json() };
  } catch {
    return { error: jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400) };
  }
}

function crewMutationErrorStatus(error: string): number {
  if (error === CREW_NOT_FOUND_ERROR) {
    return 404;
  }
  if (error === CREW_FORBIDDEN_ERROR) {
    return 403;
  }
  return 400;
}

export const GET: APIRoute = async (context) => {
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

  const result = await getCrewByIdForViewer(supabase, user.id, idResult.id);
  if ("error" in result) {
    const status = result.error === CREW_NOT_FOUND_ERROR ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse(result.data, 200);
};

export const PATCH: APIRoute = async (context) => {
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

  const jsonResult = await readJsonBody(context.request);
  if (jsonResult.error) {
    return jsonResult.error;
  }

  const parsed = updateCrewSchema.safeParse(jsonResult.body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane ekipy" }, 400);
  }

  const result = await updateCrew(supabase, user.id, idResult.id, parsed.data);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, crewMutationErrorStatus(result.error));
  }

  return jsonResponse({ crew: result.data }, 200);
};

export const DELETE: APIRoute = async (context) => {
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

  const result = await deleteCrew(supabase, user.id, idResult.id);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, crewMutationErrorStatus(result.error));
  }

  return jsonResponse(result.data, 200);
};

import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { createCrewJoinRequestSchema, crewIdSchema } from "@/lib/fan/crew-schema";
import {
  CREW_ALREADY_MEMBER_ERROR,
  CREW_JOIN_REQUEST_ALREADY_PENDING_ERROR,
  CREW_JOIN_REQUEST_SELF_ERROR,
  CREW_NOT_FOUND_ERROR,
  createCrewJoinRequest,
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

async function readOptionalJsonBody(request: Request): Promise<{ body?: unknown; error?: Response }> {
  const text = await request.text();
  if (text.trim() === "") {
    return { body: {} };
  }

  try {
    return { body: JSON.parse(text) as unknown };
  } catch {
    return { error: jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400) };
  }
}

function createRequestErrorStatus(error: string): number {
  if (error === CREW_NOT_FOUND_ERROR) {
    return 404;
  }
  if (error === CREW_JOIN_REQUEST_SELF_ERROR || error === CREW_ALREADY_MEMBER_ERROR) {
    return 400;
  }
  if (error === CREW_JOIN_REQUEST_ALREADY_PENDING_ERROR) {
    return 409;
  }
  return 400;
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

  const jsonResult = await readOptionalJsonBody(context.request);
  if (jsonResult.error) {
    return jsonResult.error;
  }

  const parsed = createCrewJoinRequestSchema.safeParse(jsonResult.body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane prośby" }, 400);
  }

  const result = await createCrewJoinRequest(supabase, user.id, idResult.id);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, createRequestErrorStatus(result.error));
  }

  return jsonResponse({ request: result.data }, 201);
};

import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { crewIdSchema, crewMemberUserIdSchema } from "@/lib/fan/crew-schema";
import {
  CREW_FORBIDDEN_ERROR,
  CREW_CONTACT_NOT_AVAILABLE_ERROR,
  CREW_MEMBER_NOT_FOUND_ERROR,
  CREW_NOT_FOUND_ERROR,
  CREW_OWNER_CANNOT_LEAVE_ERROR,
  getCrewContactForAcceptedPair,
  removeCrewMember,
} from "@/lib/services/crews";
import { createClient } from "@/lib/supabase";

export const prerender = false;

function parseParams(params: { id?: string; userId?: string }): { id: string; userId: string } | { error: string } {
  const crewIdResult = crewIdSchema.safeParse(params.id);
  if (!crewIdResult.success) {
    return { error: crewIdResult.error.issues[0]?.message ?? "Nieprawidłowy identyfikator ekipy" };
  }

  const userIdResult = crewMemberUserIdSchema.safeParse(params.userId);
  if (!userIdResult.success) {
    return { error: userIdResult.error.issues[0]?.message ?? "Nieprawidłowy identyfikator członka ekipy" };
  }

  return { id: crewIdResult.data, userId: userIdResult.data };
}

function removeMemberErrorStatus(error: string): number {
  if (error === CREW_NOT_FOUND_ERROR || error === CREW_MEMBER_NOT_FOUND_ERROR) {
    return 404;
  }
  if (error === CREW_FORBIDDEN_ERROR) {
    return 403;
  }
  if (error === CREW_OWNER_CANNOT_LEAVE_ERROR) {
    return 400;
  }
  return 400;
}

export const GET: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const paramsResult = parseParams(context.params);
  if ("error" in paramsResult) {
    return jsonResponse({ error: paramsResult.error }, 400);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await getCrewContactForAcceptedPair(supabase, user.id, paramsResult.id, paramsResult.userId);
  if ("error" in result) {
    const status = result.error === CREW_CONTACT_NOT_AVAILABLE_ERROR ? 403 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ contact: result.data }, 200);
};

export const DELETE: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const paramsResult = parseParams(context.params);
  if ("error" in paramsResult) {
    return jsonResponse({ error: paramsResult.error }, 400);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await removeCrewMember(supabase, user.id, paramsResult.id, paramsResult.userId);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, removeMemberErrorStatus(result.error));
  }

  return jsonResponse(result.data, 200);
};

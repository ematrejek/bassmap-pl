import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { friendRelationshipIdSchema, updateFriendRequestStatusSchema } from "@/lib/fan/friends-schema";
import {
  FRIEND_REQUEST_FORBIDDEN_ERROR,
  FRIEND_REQUEST_NOT_FOUND_ERROR,
  FRIEND_REQUEST_NOT_PENDING_ERROR,
  updateFriendRequestStatus,
} from "@/lib/services/friends";
import { createClient } from "@/lib/supabase";

export const prerender = false;

function parseRequestId(params: { id?: string }): { id: string } | { error: string } {
  const result = friendRelationshipIdSchema.safeParse(params.id);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Nieprawidłowy identyfikator zaproszenia" };
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

function updateErrorStatus(error: string): number {
  if (error === FRIEND_REQUEST_NOT_FOUND_ERROR) {
    return 404;
  }
  if (error === FRIEND_REQUEST_FORBIDDEN_ERROR) {
    return 403;
  }
  if (error === FRIEND_REQUEST_NOT_PENDING_ERROR) {
    return 409;
  }
  return 400;
}

export const PATCH: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const idResult = parseRequestId(context.params);
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

  const parsed = updateFriendRequestStatusSchema.safeParse(jsonResult.body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" }, 400);
  }

  const result = await updateFriendRequestStatus(supabase, user.id, idResult.id, parsed.data.status);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, updateErrorStatus(result.error));
  }

  return jsonResponse({ request: result.data }, 200);
};

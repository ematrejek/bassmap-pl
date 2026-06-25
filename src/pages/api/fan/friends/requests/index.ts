import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { sendFriendRequestSchema } from "@/lib/fan/friends-schema";
import {
  createFriendRequestByLogin,
  FRIEND_REQUEST_SELF_ERROR,
  FRIEND_TARGET_NOT_FOUND_ERROR,
  FRIENDSHIP_ALREADY_EXISTS_ERROR,
} from "@/lib/services/friends";
import { createClient } from "@/lib/supabase";

export const prerender = false;

async function readJsonBody(request: Request): Promise<{ body?: unknown; error?: Response }> {
  try {
    return { body: await request.json() };
  } catch {
    return { error: jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400) };
  }
}

function friendRequestErrorStatus(error: string): number {
  if (error === FRIEND_TARGET_NOT_FOUND_ERROR) {
    return 404;
  }
  if (error === FRIEND_REQUEST_SELF_ERROR) {
    return 400;
  }
  if (error === FRIENDSHIP_ALREADY_EXISTS_ERROR) {
    return 409;
  }
  return 400;
}

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

  const parsed = sendFriendRequestSchema.safeParse(jsonResult.body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" }, 400);
  }

  const result = await createFriendRequestByLogin(supabase, user.id, parsed.data.targetLogin);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, friendRequestErrorStatus(result.error));
  }

  const status = result.data.state === "created" ? 201 : 200;
  return jsonResponse(result.data, status);
};

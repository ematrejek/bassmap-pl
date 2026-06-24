import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { loginFromEmailLocalPart } from "@/lib/auth/display-name";
import { requireAuth } from "@/lib/auth/guards";
import { parseFanProfileUpdate, type ParsedFanProfileUpdate } from "@/lib/fan/profile-schema";
import {
  ensureFanProfile,
  FAN_PROFILE_LOGIN_TAKEN_ERROR,
  getFanProfileByUserId,
  updateFanProfile,
} from "@/lib/services/fan-profile";
import { createClient } from "@/lib/supabase";
import type { FanProfileUpdate } from "@/types";

export const prerender = false;

const ADMIN_FAN_FORBIDDEN = "Admin dodaje wydarzenia w panelu admina";

function toFanProfileUpdate(body: Record<string, unknown>, data: ParsedFanProfileUpdate): FanProfileUpdate {
  const patch: FanProfileUpdate = {};

  if ("login" in body && data.login !== undefined) {
    patch.login = data.login;
  }
  if ("bio" in body) {
    patch.bio = data.bio ?? null;
  }
  if ("city" in body) {
    patch.city = data.city ?? null;
  }
  if ("favoriteSubgenres" in body && data.favoriteSubgenres !== undefined) {
    patch.favoriteSubgenres = data.favoriteSubgenres;
  }
  if ("instagramUrl" in body) {
    patch.instagramUrl = data.instagramUrl ?? null;
  }
  if ("soundcloudUrl" in body) {
    patch.soundcloudUrl = data.soundcloudUrl ?? null;
  }
  if ("facebookUrl" in body) {
    patch.facebookUrl = data.facebookUrl ?? null;
  }
  if ("spotifyUrl" in body) {
    patch.spotifyUrl = data.spotifyUrl ?? null;
  }
  if ("twitchUrl" in body) {
    patch.twitchUrl = data.twitchUrl ?? null;
  }

  return patch;
}

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

  if (context.locals.isAdmin) {
    return jsonResponse({ error: ADMIN_FAN_FORBIDDEN }, 403);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const suggestedLogin = user.email ? loginFromEmailLocalPart(user.email) : null;
  const ensureResult = await ensureFanProfile(supabase, user.id, suggestedLogin);
  if ("error" in ensureResult) {
    return jsonResponse({ error: ensureResult.error }, 500);
  }

  const profileResult = await getFanProfileByUserId(supabase, user.id);
  if ("error" in profileResult) {
    return jsonResponse({ error: profileResult.error }, 500);
  }

  return jsonResponse({ profile: profileResult.data });
};

export const PATCH: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  if (context.locals.isAdmin) {
    return jsonResponse({ error: ADMIN_FAN_FORBIDDEN }, 403);
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

  const body = jsonResult.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400);
  }

  const recordBody = body as Record<string, unknown>;

  const parsed = parseFanProfileUpdate(recordBody);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const patch = toFanProfileUpdate(recordBody, parsed.data);
  if (Object.keys(patch).length === 0) {
    return jsonResponse({ error: "Brak pól do aktualizacji" }, 400);
  }

  const updateResult = await updateFanProfile(supabase, user.id, patch);
  if ("error" in updateResult) {
    if (updateResult.error === FAN_PROFILE_LOGIN_TAKEN_ERROR) {
      return jsonResponse({ error: updateResult.error }, 409);
    }
    return jsonResponse({ error: updateResult.error }, 400);
  }

  return jsonResponse({ profile: updateResult.data });
};

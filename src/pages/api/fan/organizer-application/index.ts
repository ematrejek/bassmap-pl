import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { organizerApplicationSchema } from "@/lib/organizer/application-schema";
import { createOrganizerApplication, getOwnOrganizerApplication } from "@/lib/services/organizer-applications";
import { createClient } from "@/lib/supabase";

export const prerender = false;

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

  const result = await getOwnOrganizerApplication(supabase, user.id);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ application: result.data, isOrganizer: context.locals.isOrganizer }, 200);
};

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  if (context.locals.isAdmin) {
    return jsonResponse({ error: "Administrator nie składa wniosku organizatora" }, 403);
  }

  if (context.locals.isOrganizer) {
    return jsonResponse({ error: "Masz już rolę organizatora" }, 409);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
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

  const parsed = organizerApplicationSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Nieprawidłowe dane";
    return jsonResponse({ error: firstIssue }, 400);
  }

  const result = await createOrganizerApplication(supabase, user.id, parsed.data);
  if ("error" in result) {
    const status = result.error === "Masz już aktywny wniosek organizatora" ? 409 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ application: result.data }, 201);
};

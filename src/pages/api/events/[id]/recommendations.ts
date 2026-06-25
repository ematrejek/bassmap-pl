import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { createEventRecommendationSchema } from "@/lib/events/recommendation-schema";
import {
  createEventRecommendation,
  RECOMMENDATION_EVENT_ENDED_ERROR,
  RECOMMENDATION_EVENT_NOT_FOUND_ERROR,
  RECOMMENDATION_NOT_FRIEND_ERROR,
  RECOMMENDATION_SELF_ERROR,
} from "@/lib/services/event-recommendations";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const eventIdSchema = z.string().uuid("Nieprawidłowy identyfikator wydarzenia");

function parseEventId(params: { id?: string }): { id: string } | { error: string } {
  const result = eventIdSchema.safeParse(params.id);
  if (!result.success) {
    return { error: "Nieprawidłowy identyfikator wydarzenia" };
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

function recommendationErrorStatus(error: string): number {
  if (error === RECOMMENDATION_EVENT_NOT_FOUND_ERROR || error === RECOMMENDATION_EVENT_ENDED_ERROR) {
    return 404;
  }
  if (error === RECOMMENDATION_NOT_FRIEND_ERROR) {
    return 403;
  }
  if (error === RECOMMENDATION_SELF_ERROR) {
    return 400;
  }
  return 400;
}

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const idResult = parseEventId(context.params);
  if ("error" in idResult) {
    return jsonResponse({ error: idResult.error }, 400);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }
  if (!user.email) {
    return jsonResponse({ error: "Brak adresu e-mail na koncie" }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const jsonResult = await readJsonBody(context.request);
  if (jsonResult.error) {
    return jsonResult.error;
  }

  const parsed = createEventRecommendationSchema.safeParse(jsonResult.body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane" }, 400);
  }

  const result = await createEventRecommendation(
    supabase,
    { id: user.id, email: user.email },
    idResult.id,
    parsed.data,
  );
  if ("error" in result) {
    return jsonResponse({ error: result.error }, recommendationErrorStatus(result.error));
  }

  return jsonResponse({ recommendation: result.data }, 201);
};

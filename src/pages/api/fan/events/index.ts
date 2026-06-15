import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { parseEventCreate } from "@/lib/events/schema";
import { descriptionRightsAcceptedTimestamp, stripFanSubmitConsent } from "@/lib/legal/fan-submit-consent";
import { createFanSubmittedEvent } from "@/lib/services/events";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  if (context.locals.isAdmin) {
    return jsonResponse({ error: "Admin dodaje wydarzenia w panelu admina" }, 403);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400);
  }

  const { payload, accepted } = stripFanSubmitConsent(body);
  if (!accepted) {
    return jsonResponse(
      { error: "Musisz potwierdzić oświadczenie dotyczące opisu wydarzenia" },
      400,
    );
  }

  const parsed = parseEventCreate(payload);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const result = await createFanSubmittedEvent(supabase, user.id, parsed.data, {
    descriptionRightsAcceptedAt: descriptionRightsAcceptedTimestamp(accepted) ?? undefined,
  });
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ event: result.data }, 201);
};

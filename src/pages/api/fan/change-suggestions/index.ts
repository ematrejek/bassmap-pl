import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { createFanChangeSuggestion } from "@/lib/services/change-suggestions";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const eventIdSchema = z.string().uuid("Nieprawidłowy identyfikator wydarzenia");

const duplicateFlowBodySchema = z
  .string()
  .min(10, "Sugestia musi mieć co najmniej 10 znaków")
  .max(2000, "Sugestia może mieć maksymalnie 2000 znaków");

const optionalCommentSchema = z.string().max(2000, "Komentarz może mieć maksymalnie 2000 znaków").optional().nullable();

const legacyDuplicateFlowSchema = z
  .object({
    eventId: eventIdSchema,
    body: duplicateFlowBodySchema,
  })
  .transform((data) => ({
    eventId: data.eventId,
    source: "duplicate_flow" as const,
    body: data.body,
  }));

const duplicateFlowSchema = z.object({
  eventId: eventIdSchema,
  source: z.literal("duplicate_flow"),
  body: duplicateFlowBodySchema,
});

const eventPageSchema = z.object({
  eventId: eventIdSchema,
  source: z.literal("event_page"),
  payload: z.record(z.string(), z.unknown()),
  body: optionalCommentSchema,
});

const createSuggestionSchema = z.union([eventPageSchema, duplicateFlowSchema, legacyDuplicateFlowSchema]);

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

  const parsed = createSuggestionSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Nieprawidłowe dane";
    return jsonResponse({ error: firstIssue }, 400);
  }

  const input = parsed.data;
  const result =
    input.source === "event_page"
      ? await createFanChangeSuggestion(supabase, user.id, {
          eventId: input.eventId,
          source: "event_page",
          payload: input.payload,
          body: input.body,
        })
      : await createFanChangeSuggestion(supabase, user.id, {
          eventId: input.eventId,
          source: "duplicate_flow",
          body: input.body,
        });

  if ("error" in result) {
    const status = result.error === "Nie znaleziono wydarzenia" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ suggestion: result.data }, 201);
};

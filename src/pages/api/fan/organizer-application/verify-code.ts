import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { organizerVerificationCodeSchema } from "@/lib/organizer/application-schema";
import { verifyOrganizerCode } from "@/lib/services/organizer-applications";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const verifyCodeSchema = z
  .object({
    applicationId: z.string().uuid("Nieprawidłowy identyfikator wniosku"),
  })
  .and(organizerVerificationCodeSchema);

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

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400);
  }

  const parsed = verifyCodeSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Nieprawidłowe dane";
    return jsonResponse({ error: firstIssue }, 400);
  }

  const result = await verifyOrganizerCode(supabase, parsed.data.applicationId, parsed.data.code);
  if ("error" in result) {
    const status = result.error === "Nie znaleziono wniosku" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ application: result.data }, 200);
};

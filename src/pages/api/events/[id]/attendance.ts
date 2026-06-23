import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { setAttendanceBodySchema } from "@/lib/events/attendance-schema";
import { isUpcomingEvent } from "@/lib/events/format";
import { clearAttendance, getAttendanceSummary, setAttendanceStatus } from "@/lib/services/event-attendance";
import { getPublishedEventById } from "@/lib/services/events";
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

async function ensureMutablePublishedEvent(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  eventId: string,
): Promise<{ event: Awaited<ReturnType<typeof getPublishedEventById>> } | Response> {
  const event = await getPublishedEventById(supabase, eventId);
  if (!event) {
    return jsonResponse({ error: "Nie znaleziono wydarzenia" }, 404);
  }

  if (!isUpcomingEvent(event.startsAt)) {
    return jsonResponse({ error: "Nie można oznaczyć udziału w zakończonym wydarzeniu" }, 404);
  }

  return { event };
}

export const GET: APIRoute = async (context) => {
  const idResult = parseEventId(context.params);
  if ("error" in idResult) {
    return jsonResponse({ error: idResult.error }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const event = await getPublishedEventById(supabase, idResult.id);
  if (!event) {
    return jsonResponse({ error: "Nie znaleziono wydarzenia" }, 404);
  }

  const userId = context.locals.user?.id ?? null;
  const result = await getAttendanceSummary(supabase, idResult.id, userId);
  if ("error" in result) {
    return jsonResponse({ error: result.error }, 500);
  }

  return jsonResponse(result.data, 200);
};

export const PUT: APIRoute = async (context) => {
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

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const eligibility = await ensureMutablePublishedEvent(supabase, idResult.id);
  if (eligibility instanceof Response) {
    return eligibility;
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400);
  }

  const parsedBody = setAttendanceBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return jsonResponse({ error: "Nieprawidłowe dane" }, 400);
  }

  const result = await setAttendanceStatus(supabase, user.id, idResult.id, parsedBody.data.status);
  if ("error" in result) {
    const status = result.error === "Nie można oznaczyć udziału w tym wydarzeniu" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  const summary = await getAttendanceSummary(supabase, idResult.id, user.id);
  if ("error" in summary) {
    return jsonResponse({ error: summary.error }, 500);
  }

  return jsonResponse(summary.data, 200);
};

export const DELETE: APIRoute = async (context) => {
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

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const eligibility = await ensureMutablePublishedEvent(supabase, idResult.id);
  if (eligibility instanceof Response) {
    return eligibility;
  }

  const result = await clearAttendance(supabase, user.id, idResult.id);
  if ("error" in result) {
    const status = result.error === "Nie można oznaczyć udziału w tym wydarzeniu" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  const summary = await getAttendanceSummary(supabase, idResult.id, user.id);
  if ("error" in summary) {
    return jsonResponse({ error: summary.error }, 500);
  }

  return jsonResponse(summary.data, 200);
};

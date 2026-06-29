import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAdmin } from "@/lib/auth/guards";
import { approveOrganizerApplication } from "@/lib/services/organizer-applications";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator wniosku");

export const POST: APIRoute = async (context) => {
  const adminError = requireAdmin(context.locals);
  if (adminError) {
    return adminError;
  }

  const idResult = idSchema.safeParse(context.params.id);
  if (!idResult.success) {
    return jsonResponse({ error: "Nieprawidłowy identyfikator wniosku" }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await approveOrganizerApplication(supabase, idResult.data);
  if ("error" in result) {
    const status = result.error === "Nie znaleziono wniosku" ? 404 : 400;
    return jsonResponse({ error: result.error }, status);
  }

  return jsonResponse({ application: result.data }, 200);
};

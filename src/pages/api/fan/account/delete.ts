import type { APIRoute } from "astro";
import { deleteAccountBodySchema } from "@/lib/account-deletion/schema";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { deleteUserAccount } from "@/lib/services/account-deletion";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  if (context.locals.isAdmin) {
    return jsonResponse({ error: "Administrator usuwa konto na wniosek e-mail – zobacz regulamin §3.6" }, 403);
  }

  const user = context.locals.user;
  if (!user?.email) {
    return jsonResponse({ error: "Brak adresu e-mail na koncie – skontaktuj się z administratorem" }, 400);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Nieprawidłowe dane żądania" }, 400);
  }

  const parsed = deleteAccountBodySchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Nieprawidłowe dane żądania";
    return jsonResponse({ error: firstIssue }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const passwordCheck = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });

  if (passwordCheck.error) {
    return jsonResponse({ error: "Nieprawidłowe hasło" }, 401);
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return jsonResponse({ error: "Brak konfiguracji serwisowej – skontaktuj się z administratorem" }, 500);
  }

  const deleteResult = await deleteUserAccount(serviceClient, user.id);
  if ("error" in deleteResult) {
    return jsonResponse({ error: deleteResult.error }, 500);
  }

  await supabase.auth.signOut();

  return new Response(null, { status: 204 });
};

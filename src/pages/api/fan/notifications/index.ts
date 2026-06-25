import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { countUnreadNotifications, listNotifications } from "@/lib/services/notifications";
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

  const notifications = await listNotifications(supabase, user.id);
  if ("error" in notifications) {
    return jsonResponse({ error: notifications.error }, 500);
  }

  const unreadCount = await countUnreadNotifications(supabase, user.id);
  if ("error" in unreadCount) {
    return jsonResponse({ error: unreadCount.error }, 500);
  }

  return jsonResponse({ notifications: notifications.data, unreadCount: unreadCount.data }, 200);
};

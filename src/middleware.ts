import { defineMiddleware } from "astro:middleware";
import { resolveIsAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase";

const PROTECTED_ROUTES = ["/dashboard"];

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    context.locals.user = user ?? null;
    context.locals.isAdmin = await resolveIsAdmin(supabase, user ?? null);
  } else {
    context.locals.user = null;
    context.locals.isAdmin = false;
  }

  const { pathname } = context.url;

  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  if (isAdminRoute(pathname)) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }

    if (!context.locals.isAdmin) {
      return context.redirect("/403");
    }
  }

  return next();
});

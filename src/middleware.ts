import { defineMiddleware } from "astro:middleware";
import { resolveIsAdmin } from "@/lib/auth/admin";
import { resolveIsOrganizer } from "@/lib/auth/organizer";
import { LEGACY_LEGAL_REDIRECTS } from "@/lib/legal/paths";
import { DISCOVERY_PATH, FORUM_PATH, HOME_PATH, MY_EVENTS_PATH, PROFILE_PATH, TEAM_PATH } from "@/lib/routes";
import { createClient } from "@/lib/supabase";

const PROTECTED_ROUTES = [PROFILE_PATH, MY_EVENTS_PATH, TEAM_PATH, FORUM_PATH];

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
    context.locals.isAdmin = user ? await resolveIsAdmin(supabase, user) : false;
    context.locals.isOrganizer = user ? await resolveIsOrganizer(supabase, user) : false;
  } else {
    context.locals.user = null;
    context.locals.isAdmin = false;
    context.locals.isOrganizer = false;
  }

  const { pathname } = context.url;

  const legacyLegalTarget = LEGACY_LEGAL_REDIRECTS[pathname];
  if (legacyLegalTarget) {
    return context.redirect(legacyLegalTarget, 301);
  }

  if (pathname === HOME_PATH && context.url.search.length > 1) {
    return context.redirect(`${DISCOVERY_PATH}${context.url.search}`, 302);
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return context.redirect(PROFILE_PATH, 301);
  }

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

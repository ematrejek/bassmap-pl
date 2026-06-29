import type { APIContext } from "astro";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function requireAuth(locals: APIContext["locals"]): Response | null {
  if (!locals.user) {
    return jsonError("Wymagane logowanie", 401);
  }

  return null;
}

export function requireAdmin(locals: APIContext["locals"]): Response | null {
  const authError = requireAuth(locals);
  if (authError) {
    return authError;
  }

  if (!locals.isAdmin) {
    return jsonError("Brak uprawnień administratora", 403);
  }

  return null;
}

export function requireOrganizer(locals: APIContext["locals"]): Response | null {
  const authError = requireAuth(locals);
  if (authError) {
    return authError;
  }

  if (!locals.isOrganizer) {
    return jsonError("Brak uprawnień organizatora", 403);
  }

  return null;
}

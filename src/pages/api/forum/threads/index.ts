import type { APIRoute } from "astro";
import { z } from "zod";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/auth/guards";
import { forumThreadCategorySchema, parseCreateForumThreadInput } from "@/lib/forum/thread-schema";
import { createForumThread, listForumThreads } from "@/lib/services/forum-threads";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const PAGE_SIZE = 20;

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const url = new URL(context.request.url);

  const categoryParam = url.searchParams.get("category");
  let category: z.infer<typeof forumThreadCategorySchema> | undefined;
  if (categoryParam) {
    const parsedCategory = forumThreadCategorySchema.safeParse(categoryParam);
    if (!parsedCategory.success) {
      return jsonResponse({ error: "Nieprawidłowy dział forum" }, 400);
    }
    category = parsedCategory.data;
  }

  const pageParam = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const result = await listForumThreads(supabase, {
    category,
    limit: PAGE_SIZE + 1,
    offset,
  });

  if ("error" in result) {
    return jsonResponse({ error: result.error }, 500);
  }

  const hasNextPage = result.data.length > PAGE_SIZE;
  const threads = hasNextPage ? result.data.slice(0, PAGE_SIZE) : result.data;

  return jsonResponse({ threads, page, hasNextPage }, 200);
};

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context.locals);
  if (authError) {
    return authError;
  }

  const user = context.locals.user;
  if (!user) {
    return jsonResponse({ error: "Wymagane logowanie" }, 401);
  }

  if (!user.email) {
    return jsonResponse({ error: "Brak adresu e-mail na koncie" }, 400);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Nieprawidłowe dane JSON" }, 400);
  }

  const parsed = parseCreateForumThreadInput(body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase nie jest skonfigurowany" }, 500);
  }

  const result = await createForumThread(supabase, {
    authorId: user.id,
    authorEmail: user.email,
    category: parsed.data.category,
    title: parsed.data.title,
    body: parsed.data.body,
    city: parsed.data.city ?? null,
    tags: parsed.data.tags,
  });

  if ("error" in result) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ thread: result.data }, 201);
};

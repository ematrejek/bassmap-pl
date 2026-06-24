import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { listPublishedEventIdsForSitemap } from "@/lib/services/events";
import { absoluteUrl } from "@/lib/site";
import { buildUrlSetXml } from "@/lib/sitemap/xml";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return new Response("Service unavailable", { status: 503 });
  }

  const result = await listPublishedEventIdsForSitemap(supabase);
  if ("error" in result) {
    return new Response("Failed to build sitemap", { status: 500 });
  }

  const xml = buildUrlSetXml(
    result.data.map((event) => ({
      loc: absoluteUrl(`/events/${event.id}`),
      lastmod: event.updatedAt,
    })),
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};

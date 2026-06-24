import type { APIRoute } from "astro";
import { SITE_ORIGIN } from "@/lib/site";

export const prerender = false;

export const GET: APIRoute = () => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_ORIGIN}/sitemap-index.xml`,
    `Sitemap: ${SITE_ORIGIN}/sitemap-events.xml`,
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
};

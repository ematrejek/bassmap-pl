export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildUrlSetXml(urls: SitemapUrl[]): string {
  const entries = urls.map((url) => {
    const parts = [`    <loc>${escapeXml(url.loc)}</loc>`];
    if (url.lastmod) {
      parts.push(`    <lastmod>${escapeXml(url.lastmod)}</lastmod>`);
    }
    if (url.changefreq) {
      parts.push(`    <changefreq>${escapeXml(url.changefreq)}</changefreq>`);
    }
    if (url.priority) {
      parts.push(`    <priority>${escapeXml(url.priority)}</priority>`);
    }
    return `  <url>\n${parts.join("\n")}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

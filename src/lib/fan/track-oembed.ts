import type { FavouriteTrackPlatform } from "@/lib/fan/favourite-track";

const OEMBED_TIMEOUT_MS = 8_000;

function oembedUrl(platform: FavouriteTrackPlatform, trackUrl: string): string {
  const encoded = encodeURIComponent(trackUrl);
  if (platform === "spotify") {
    return `https://open.spotify.com/oembed?url=${encoded}`;
  }
  return `https://soundcloud.com/oembed?format=json&url=${encoded}`;
}

export async function fetchTrackTitle(platform: FavouriteTrackPlatform, trackUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, OEMBED_TIMEOUT_MS);

  try {
    const response = await fetch(oembedUrl(platform, trackUrl), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null || !("title" in data)) {
      return null;
    }

    const title = data.title;
    if (typeof title !== "string" || !title.trim()) {
      return null;
    }

    return title.trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

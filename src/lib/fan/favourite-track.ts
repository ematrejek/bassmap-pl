export type FavouriteTrackPlatform = "spotify" | "soundcloud";

const SPOTIFY_TRACK_PATH = /^\/track\/([A-Za-z0-9]{22})(?:\/|$)/;
const SOUNDCLOUD_BLOCKED_SEGMENTS = new Set([
  "sets",
  "albums",
  "playlists",
  "discover",
  "stream",
  "you",
  "pages",
  "stations",
]);

function allowedHost(hostname: string, allowed: readonly string[]): boolean {
  const host = hostname.replace(/^www\./, "");
  return allowed.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }
}

export function parseSpotifyTrackUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const url = parseUrl(trimmed);
  if (!url || !allowedHost(url.hostname, ["open.spotify.com"])) {
    return null;
  }

  const path = url.pathname.replace(/^\/embed/, "");
  const match = SPOTIFY_TRACK_PATH.exec(path);
  if (!match?.[1]) {
    return null;
  }

  return `https://open.spotify.com/track/${match[1]}`;
}

export function parseSoundCloudTrackUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const url = parseUrl(trimmed);
  if (!url || !allowedHost(url.hostname, ["soundcloud.com", "m.soundcloud.com"])) {
    return null;
  }

  const parts = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts.length !== 2) {
    return null;
  }

  const [artist, track] = parts;
  if (!artist || !track || SOUNDCLOUD_BLOCKED_SEGMENTS.has(artist) || track === "sets") {
    return null;
  }

  return `https://soundcloud.com/${artist}/${track}`;
}

export function validateFavouriteTrackUrl(platform: FavouriteTrackPlatform, value: string): boolean {
  return normalizeFavouriteTrackUrl(platform, value) !== null;
}

export function normalizeFavouriteTrackUrl(platform: FavouriteTrackPlatform, value: string): string | null {
  if (platform === "spotify") {
    return parseSpotifyTrackUrl(value);
  }
  return parseSoundCloudTrackUrl(value);
}

export function favouriteTrackErrorLabel(platform: FavouriteTrackPlatform): string {
  if (platform === "spotify") {
    return "Podaj link do utworu Spotify (open.spotify.com/track/...)";
  }
  return "Podaj link do utworu SoundCloud (soundcloud.com/artysta/utwor)";
}

export function favouriteTrackEmbedSrc(platform: FavouriteTrackPlatform, canonicalUrl: string): string | null {
  if (platform === "spotify") {
    const parsed = parseSpotifyTrackUrl(canonicalUrl);
    if (!parsed) {
      return null;
    }
    const id = parsed.split("/").pop();
    return id ? `https://open.spotify.com/embed/track/${id}` : null;
  }

  const parsed = parseSoundCloudTrackUrl(canonicalUrl);
  if (!parsed) {
    return null;
  }

  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(parsed)}&color=%23a855f7&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`;
}

export function hasFavouriteTrack(profile: {
  favouriteTrackPlatform: FavouriteTrackPlatform | null;
  favouriteTrackUrl: string | null;
}): boolean {
  return Boolean(profile.favouriteTrackPlatform && profile.favouriteTrackUrl?.trim());
}

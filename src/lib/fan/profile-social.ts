export type SocialPlatform = "instagram" | "facebook" | "spotify" | "soundcloud" | "twitch";

const INSTAGRAM_HANDLE_REGEX = /^@?[a-zA-Z0-9._]{1,30}$/;
const TWITCH_HANDLE_REGEX = /^@?[a-zA-Z0-9_]{4,25}$/;

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

function firstPathSegment(pathname: string): string {
  return pathname.replace(/^\/+/, "").split("/")[0] ?? "";
}

export function validateSocialField(platform: SocialPlatform, value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.includes("://")) {
    const url = parseUrl(trimmed);
    if (!url) {
      return false;
    }

    switch (platform) {
      case "instagram":
        return allowedHost(url.hostname, ["instagram.com"]) && firstPathSegment(url.pathname).length > 0;
      case "facebook":
        return allowedHost(url.hostname, ["facebook.com", "fb.com"]) && firstPathSegment(url.pathname).length > 0;
      case "spotify":
        return allowedHost(url.hostname, ["open.spotify.com"]) && url.pathname.length > 1;
      case "soundcloud":
        return allowedHost(url.hostname, ["soundcloud.com"]) && firstPathSegment(url.pathname).length > 0;
      case "twitch":
        return allowedHost(url.hostname, ["twitch.tv"]) && firstPathSegment(url.pathname).length > 0;
      default:
        return false;
    }
  }

  switch (platform) {
    case "instagram":
      return INSTAGRAM_HANDLE_REGEX.test(trimmed);
    case "twitch":
      return TWITCH_HANDLE_REGEX.test(trimmed);
    case "facebook":
      return /^@?[a-zA-Z0-9]{2,50}$/.test(trimmed) || /^(facebook\.com|fb\.com)\/.+/i.test(trimmed);
    case "soundcloud":
      return /^@?[a-zA-Z0-9_-]{2,50}$/.test(trimmed) || /^soundcloud\.com\/.+/i.test(trimmed);
    case "spotify":
      return /^open\.spotify\.com\/.+/i.test(trimmed);
    default:
      return false;
  }
}

export function normalizeSocialField(platform: SocialPlatform, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.includes("://")) {
    const url = parseUrl(trimmed);
    if (!url) {
      return trimmed;
    }

    switch (platform) {
      case "instagram": {
        const handle = firstPathSegment(url.pathname);
        return handle ? `@${handle.replace(/^@/, "")}` : trimmed;
      }
      case "twitch": {
        const handle = firstPathSegment(url.pathname);
        return handle ? `@${handle.replace(/^@/, "")}` : trimmed;
      }
      case "facebook":
        return `${url.hostname.replace(/^www\./, "")}${url.pathname}`.replace(/^facebook\.com/, "facebook.com");
      case "spotify":
        return `open.spotify.com${url.pathname}`;
      case "soundcloud":
        return `soundcloud.com/${firstPathSegment(url.pathname)}`;
      default:
        return trimmed;
    }
  }

  switch (platform) {
    case "instagram":
    case "twitch": {
      const handle = trimmed.replace(/^@/, "");
      return `@${handle}`;
    }
    case "facebook":
      return trimmed.includes("facebook.com") ? trimmed.replace(/^https?:\/\//, "") : trimmed;
    case "spotify":
      return trimmed.replace(/^https?:\/\//, "");
    case "soundcloud":
      return trimmed.includes("soundcloud.com")
        ? trimmed.replace(/^https?:\/\//, "")
        : `soundcloud.com/${trimmed.replace(/^@/, "")}`;
    default:
      return trimmed;
  }
}

export function formatSocialDisplay(platform: SocialPlatform, raw: string): string {
  const value = raw.trim();
  if (!value) {
    return value;
  }

  if (platform === "instagram" || platform === "twitch") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = parseUrl(value);
      const handle = url ? firstPathSegment(url.pathname) : "";
      return handle ? `@${handle.replace(/^@/, "")}` : value;
    }
    return value.startsWith("@") ? value : `@${value}`;
  }

  return value.replace(/^https?:\/\//, "");
}

export function formatSocialHref(platform: SocialPlatform, raw: string): string {
  const value = raw.trim();
  if (!value) {
    return "#";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  switch (platform) {
    case "instagram":
      return `https://instagram.com/${value.replace(/^@/, "")}`;
    case "facebook": {
      const stripped = value.replace(/^https?:\/\//, "");
      if (/^(facebook\.com|fb\.com)\//i.test(stripped)) {
        return `https://${stripped}`;
      }
      return `https://facebook.com/${value.replace(/^@/, "")}`;
    }
    case "spotify":
      return `https://${value.replace(/^https?:\/\//, "")}`;
    case "soundcloud":
      return `https://${value.replace(/^https?:\/\//, "")}`;
    case "twitch":
      return `https://twitch.tv/${value.replace(/^@/, "")}`;
    default:
      return value;
  }
}

export function socialFieldErrorLabel(platform: SocialPlatform): string {
  switch (platform) {
    case "instagram":
      return "Podaj nick Instagram (np. @twoj_nick) lub pełny link";
    case "twitch":
      return "Podaj nick Twitch (np. @twoj_nick) lub pełny link";
    case "facebook":
      return "Podaj nick Facebook lub link do profilu";
    case "spotify":
      return "Podaj link do profilu Spotify (open.spotify.com/...)";
    case "soundcloud":
      return "Podaj nick SoundCloud lub link do profilu";
    default:
      return "Nieprawidłowa wartość";
  }
}

import { buildFanFilterSearchParams, type FanEventFilters } from "@/lib/events/fan-schema";

export const HOME_PATH = "/";
export const DISCOVERY_PATH = "/events";
export const ARCHIVE_PATH = "/archive";
export const REPORT_ISSUE_PATH = "/report-issue";
export const SIGN_IN_PATH = "/auth/signin";
export const SIGN_UP_PATH = "/auth/signup";
export const PROFILE_PATH = "/profile";
export const FAN_PUBLIC_PROFILE_PREFIX = "/u";

/** Public fan profile URL – login without leading @ (e.g. `/u/siemema`). */
export function fanPublicProfilePath(login: string): string {
  const normalized = login.startsWith("@") ? login.slice(1) : login;
  return `${FAN_PUBLIC_PROFILE_PREFIX}/${normalized.toLowerCase()}`;
}

export const MY_EVENTS_PATH = "/my-events";
export const MY_EVENTS_NEW_PATH = "/my-events/new";
export const TEAM_PATH = "/team";
export const FORUM_PATH = "/forum";
export const ADMIN_PATH = "/admin";

export const CONTACT_EMAIL = "kontakt@bassmap.pl";

/** Full discovery URL with filter query string. */
export function buildDiscoverySearchUrl(filters: FanEventFilters): string {
  const qs = buildFanFilterSearchParams(filters).toString();
  return qs ? `${DISCOVERY_PATH}?${qs}` : DISCOVERY_PATH;
}

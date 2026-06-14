import { buildFanFilterSearchParams, type FanEventFilters } from "@/lib/events/fan-schema";

export const HOME_PATH = "/";
export const DISCOVERY_PATH = "/events";
export const ARCHIVE_PATH = "/archive";
export const REPORT_ISSUE_PATH = "/report-issue";
export const SIGN_IN_PATH = "/auth/signin";
export const SIGN_UP_PATH = "/auth/signup";
export const DASHBOARD_PATH = "/dashboard";
export const ADMIN_PATH = "/admin";

export const CONTACT_EMAIL = "kontakt@bassmap.pl";

/** Full discovery URL with filter query string. */
export function buildDiscoverySearchUrl(filters: FanEventFilters): string {
  const qs = buildFanFilterSearchParams(filters).toString();
  return qs ? `${DISCOVERY_PATH}?${qs}` : DISCOVERY_PATH;
}

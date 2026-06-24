import { fanPublicProfilePath } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";

/** Canonical absolute URL for a fan's public profile (e.g. `https://bassmap.pl/u/siemema`). */
export function fanPublicProfileAbsoluteUrl(login: string): string {
  return absoluteUrl(fanPublicProfilePath(login));
}

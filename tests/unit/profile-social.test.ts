import {
  formatSocialDisplay,
  formatSocialHref,
  normalizeSocialField,
  validateSocialField,
} from "@/lib/fan/profile-social";
import { describe, expect, it } from "vitest";

describe("profile-social", () => {
  it("accepts instagram handle with @ and builds href", () => {
    expect(validateSocialField("instagram", "@_siemema_")).toBe(true);
    expect(normalizeSocialField("instagram", "@_siemema_")).toBe("@_siemema_");
    expect(formatSocialHref("instagram", "@_siemema_")).toBe("https://instagram.com/_siemema_");
    expect(formatSocialDisplay("instagram", "@_siemema_")).toBe("@_siemema_");
  });

  it("normalizes instagram URL to @handle for display", () => {
    const normalized = normalizeSocialField("instagram", "https://instagram.com/_siemema_");
    expect(normalized).toBe("@_siemema_");
    expect(formatSocialDisplay("instagram", normalized)).toBe("@_siemema_");
  });

  it("accepts twitch handle", () => {
    expect(validateSocialField("twitch", "@bass_fan")).toBe(true);
    expect(formatSocialHref("twitch", "@bass_fan")).toBe("https://twitch.tv/bass_fan");
  });

  it("accepts facebook handle and path without arbitrary domains", () => {
    expect(validateSocialField("facebook", "bassmappl")).toBe(true);
    expect(validateSocialField("facebook", "facebook.com/bassmappl")).toBe(true);
    expect(formatSocialHref("facebook", "bassmappl")).toBe("https://facebook.com/bassmappl");
    expect(formatSocialHref("facebook", "facebook.com/bassmappl")).toBe("https://facebook.com/bassmappl");
    expect(validateSocialField("facebook", "evil.com")).toBe(false);
    expect(validateSocialField("facebook", "facebook.com.evil.com")).toBe(false);
  });
});

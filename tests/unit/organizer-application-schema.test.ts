import { describe, expect, it } from "vitest";
import {
  normalizeSocialProfileUrl,
  organizerApplicationSchema,
  organizerVerificationCodeSchema,
} from "@/lib/organizer/application-schema";

describe("normalizeSocialProfileUrl", () => {
  it("prepends https:// to short instagram form", () => {
    expect(normalizeSocialProfileUrl("instagram", "instagram.com/bassmap.pl")).toBe("https://instagram.com/bassmap.pl");
  });

  it("keeps full https instagram url and strips www + trailing slash", () => {
    expect(normalizeSocialProfileUrl("instagram", "https://www.instagram.com/bassmap.pl/")).toBe(
      "https://instagram.com/bassmap.pl",
    );
  });

  it("accepts facebook short form and fb.com alias", () => {
    expect(normalizeSocialProfileUrl("facebook", "facebook.com/bassmap")).toBe("https://facebook.com/bassmap");
    expect(normalizeSocialProfileUrl("facebook", "fb.com/bassmap")).toBe("https://fb.com/bassmap");
  });

  it("rejects host mismatch", () => {
    expect(normalizeSocialProfileUrl("instagram", "facebook.com/bassmap")).toBeNull();
    expect(normalizeSocialProfileUrl("facebook", "instagram.com/bassmap")).toBeNull();
  });

  it("rejects url without a profile path", () => {
    expect(normalizeSocialProfileUrl("instagram", "instagram.com")).toBeNull();
    expect(normalizeSocialProfileUrl("instagram", "instagram.com/")).toBeNull();
  });
});

describe("organizerApplicationSchema", () => {
  it("accepts a valid application and normalizes the url", () => {
    const result = organizerApplicationSchema.safeParse({
      businessName: "BassMap Crew",
      socialPlatform: "instagram",
      socialProfileUrl: "instagram.com/bassmap.pl",
      description: "Organizujemy imprezy DnB",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.socialProfileUrl).toBe("https://instagram.com/bassmap.pl");
      expect(result.data.description).toBe("Organizujemy imprezy DnB");
    }
  });

  it("turns empty description into null", () => {
    const result = organizerApplicationSchema.safeParse({
      businessName: "BassMap Crew",
      socialPlatform: "facebook",
      socialProfileUrl: "facebook.com/bassmap",
      description: "   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("rejects too short business name", () => {
    const result = organizerApplicationSchema.safeParse({
      businessName: "B",
      socialPlatform: "instagram",
      socialProfileUrl: "instagram.com/bassmap",
    });

    expect(result.success).toBe(false);
  });

  it("rejects url that does not match the platform", () => {
    const result = organizerApplicationSchema.safeParse({
      businessName: "BassMap Crew",
      socialPlatform: "instagram",
      socialProfileUrl: "facebook.com/bassmap",
    });

    expect(result.success).toBe(false);
  });
});

describe("organizerVerificationCodeSchema", () => {
  it("uppercases and accepts a valid code", () => {
    const result = organizerVerificationCodeSchema.safeParse({ code: "a3k7m2" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("A3K7M2");
    }
  });

  it("rejects too short code", () => {
    expect(organizerVerificationCodeSchema.safeParse({ code: "abc" }).success).toBe(false);
  });
});

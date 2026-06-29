import { z } from "zod";
import type { OrganizerSocialPlatform } from "@/types";

const PLATFORM_HOSTS: Record<OrganizerSocialPlatform, readonly string[]> = {
  facebook: ["facebook.com", "fb.com"],
  instagram: ["instagram.com"],
};

function parseUrl(value: string): URL | null {
  try {
    return new URL(value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`);
  } catch {
    return null;
  }
}

function hostMatchesPlatform(hostname: string, platform: OrganizerSocialPlatform): boolean {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  return PLATFORM_HOSTS[platform].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/**
 * Normalizes a social profile URL into a canonical `https://...` form.
 * Accepts short forms like `instagram.com/bassmap.pl` and prepends the scheme.
 * Returns null when the value does not point at the expected platform host.
 */
export function normalizeSocialProfileUrl(platform: OrganizerSocialPlatform, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const url = parseUrl(trimmed);
  if (!url) {
    return null;
  }

  if (!hostMatchesPlatform(url.hostname, platform)) {
    return null;
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (path.length <= 1) {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  return `https://${host}${path}${url.search}`;
}

export const organizerApplicationSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(2, "Nazwa organizatora musi mieć co najmniej 2 znaki")
      .max(120, "Nazwa organizatora może mieć maksymalnie 120 znaków"),
    socialPlatform: z.enum(["facebook", "instagram"], {
      message: "Wybierz Facebook lub Instagram",
    }),
    socialProfileUrl: z.string().trim().min(1, "Podaj link do profilu").max(500, "Link do profilu jest za długi"),
    description: z
      .string()
      .trim()
      .max(1000, "Opis może mieć maksymalnie 1000 znaków")
      .optional()
      .nullable()
      .transform((value) => (value && value.length > 0 ? value : null)),
  })
  .superRefine((data, ctx) => {
    const normalized = normalizeSocialProfileUrl(data.socialPlatform, data.socialProfileUrl);
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        path: ["socialProfileUrl"],
        message:
          data.socialPlatform === "facebook"
            ? "Podaj link do profilu Facebook (np. facebook.com/twoj-profil)"
            : "Podaj link do profilu Instagram (np. instagram.com/twoj_profil)",
      });
    }
  })
  .transform((data) => ({
    businessName: data.businessName,
    socialPlatform: data.socialPlatform,
    socialProfileUrl: normalizeSocialProfileUrl(data.socialPlatform, data.socialProfileUrl) ?? data.socialProfileUrl,
    description: data.description,
  }));

export type OrganizerApplicationInput = z.infer<typeof organizerApplicationSchema>;

export const organizerVerificationCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, "Kod musi mieć od 6 do 8 znaków")
    .max(8, "Kod musi mieć od 6 do 8 znaków")
    .transform((value) => value.toUpperCase()),
});

export type OrganizerVerificationCodeInput = z.infer<typeof organizerVerificationCodeSchema>;

export const organizerRejectReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(1000, "Powód może mieć maksymalnie 1000 znaków")
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type OrganizerRejectReasonInput = z.infer<typeof organizerRejectReasonSchema>;

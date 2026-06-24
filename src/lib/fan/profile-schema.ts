import { z } from "zod";
import {
  favouriteTrackErrorLabel,
  validateFavouriteTrackUrl,
  type FavouriteTrackPlatform,
} from "@/lib/fan/favourite-track";
import {
  normalizeSocialField,
  socialFieldErrorLabel,
  validateSocialField,
  type SocialPlatform,
} from "@/lib/fan/profile-social";
import { SUBGENRES, type Subgenre } from "@/types";

export const FAN_LOGIN_REGEX = /^[a-z0-9_]{3,30}$/;

export const fanLoginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(FAN_LOGIN_REGEX, "Login musi mieć 3–30 znaków: małe litery, cyfry i podkreślenia");

const subgenreSchema = z.enum(SUBGENRES as [Subgenre, ...Subgenre[]]);

export const favoriteSubgenresSchema = z.array(subgenreSchema).max(5, "Możesz wybrać maksymalnie 5 podgatunków");

const emptyToNull = (value: unknown) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return value;
};

function socialFieldSchema(platform: SocialPlatform) {
  return z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .refine((value) => validateSocialField(platform, value), socialFieldErrorLabel(platform))
      .transform((value) => normalizeSocialField(platform, value))
      .nullable()
      .optional(),
  );
}

export const fanProfileUpdateSchema = z
  .object({
    login: fanLoginSchema.optional(),
    bio: z.preprocess(emptyToNull, z.string().max(200, "Opis może mieć maksymalnie 200 znaków").nullable().optional()),
    city: z.preprocess(
      emptyToNull,
      z.string().max(100, "Miasto może mieć maksymalnie 100 znaków").nullable().optional(),
    ),
    favoriteSubgenres: favoriteSubgenresSchema.optional(),
    instagramUrl: socialFieldSchema("instagram"),
    soundcloudUrl: socialFieldSchema("soundcloud"),
    facebookUrl: socialFieldSchema("facebook"),
    spotifyUrl: socialFieldSchema("spotify"),
    twitchUrl: socialFieldSchema("twitch"),
    favouriteTrackPlatform: z.preprocess(
      emptyToNull,
      z
        .enum(["spotify", "soundcloud"] satisfies [FavouriteTrackPlatform, FavouriteTrackPlatform])
        .nullable()
        .optional(),
    ),
    favouriteTrackUrl: z.preprocess(emptyToNull, z.string().trim().nullable().optional()),
  })
  .superRefine((data, ctx) => {
    if (data.favouriteTrackUrl && !data.favouriteTrackPlatform) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wybierz platformę: Spotify lub SoundCloud",
        path: ["favouriteTrackPlatform"],
      });
      return;
    }

    if (data.favouriteTrackPlatform && data.favouriteTrackUrl) {
      if (!validateFavouriteTrackUrl(data.favouriteTrackPlatform, data.favouriteTrackUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: favouriteTrackErrorLabel(data.favouriteTrackPlatform),
          path: ["favouriteTrackUrl"],
        });
      }
    }
  });

export type ParsedFanProfileUpdate = z.infer<typeof fanProfileUpdateSchema>;

export function parseFanProfileUpdate(
  input: unknown,
): { success: true; data: ParsedFanProfileUpdate } | { success: false; error: string } {
  const result = fanProfileUpdateSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Nieprawidłowe dane profilu" };
  }

  return { success: true, data: result.data };
}

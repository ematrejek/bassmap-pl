import { z } from "zod";
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

function socialUrlSchema(allowedHosts: readonly string[], label: string) {
  return z.preprocess(
    emptyToNull,
    z
      .string()
      .url(`Podaj prawidłowy adres URL dla ${label}`)
      .refine((url) => {
        try {
          const host = new URL(url).hostname.replace(/^www\./, "");
          return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
        } catch {
          return false;
        }
      }, `Adres musi prowadzić do ${label}`)
      .nullable()
      .optional(),
  );
}

export const fanProfileUpdateSchema = z.object({
  login: fanLoginSchema.optional(),
  bio: z.preprocess(emptyToNull, z.string().max(200, "Opis może mieć maksymalnie 200 znaków").nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().max(100, "Miasto może mieć maksymalnie 100 znaków").nullable().optional()),
  favoriteSubgenres: favoriteSubgenresSchema.optional(),
  instagramUrl: socialUrlSchema(["instagram.com"], "Instagram"),
  soundcloudUrl: socialUrlSchema(["soundcloud.com"], "SoundCloud"),
  facebookUrl: socialUrlSchema(["facebook.com", "fb.com"], "Facebook"),
  spotifyUrl: socialUrlSchema(["open.spotify.com"], "Spotify"),
  twitchUrl: socialUrlSchema(["twitch.tv"], "Twitch"),
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

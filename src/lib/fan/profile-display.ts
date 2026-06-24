import { Camera, Cloud, Gamepad2, Music, ThumbsUp, type LucideIcon } from "lucide-react";
import type { SocialPlatform } from "@/lib/fan/profile-social";
import type { FanProfile, PublicFanProfile } from "@/types";

export type { SocialPlatform } from "@/lib/fan/profile-social";
export { formatSocialDisplay, formatSocialHref } from "@/lib/fan/profile-social";

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  "instagram",
  "facebook",
  "spotify",
  "soundcloud",
  "twitch",
] as const;

const SOCIAL_META: Record<
  SocialPlatform,
  {
    label: string;
    placeholder: string;
    icon: LucideIcon;
    profileKey: keyof Pick<FanProfile, "instagramUrl" | "facebookUrl" | "spotifyUrl" | "soundcloudUrl" | "twitchUrl">;
  }
> = {
  instagram: {
    label: "Instagram",
    placeholder: "@twoj_nick",
    icon: Camera,
    profileKey: "instagramUrl",
  },
  facebook: {
    label: "Facebook",
    placeholder: "facebook.com/profil",
    icon: ThumbsUp,
    profileKey: "facebookUrl",
  },
  spotify: {
    label: "Spotify",
    placeholder: "open.spotify.com/user/...",
    icon: Music,
    profileKey: "spotifyUrl",
  },
  soundcloud: {
    label: "SoundCloud",
    placeholder: "soundcloud.com/profil",
    icon: Cloud,
    profileKey: "soundcloudUrl",
  },
  twitch: {
    label: "Twitch",
    placeholder: "@twoj_nick",
    icon: Gamepad2,
    profileKey: "twitchUrl",
  },
};

export function getSocialMeta(platform: SocialPlatform) {
  return SOCIAL_META[platform];
}

export function getProfileSocialValue(profile: PublicFanProfile, platform: SocialPlatform): string | null {
  return profile[SOCIAL_META[platform].profileKey];
}

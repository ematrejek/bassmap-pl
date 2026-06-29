import GenreBadge, { type NeonColor } from "@/components/fan/GenreBadge";
import MyVibesEmbed from "@/components/fan/MyVibesEmbed";
import ProfileShareButton from "@/components/fan/ProfileShareButton";
import { Button } from "@/components/ui/button";
import { hasFavouriteTrack } from "@/lib/fan/favourite-track";
import {
  formatSocialDisplay,
  formatSocialHref,
  getProfileSocialValue,
  getSocialMeta,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/lib/fan/profile-display";
import { filterActiveSubgenres } from "@/lib/subgenres";
import type { PublicFanProfile } from "@/types";
import { SUBGENRE_LABELS } from "@/types";
import { AtSign, Mail, MapPin, Music, Music2, UserRound } from "lucide-react";
import type { ReactNode } from "react";

const NEON_CYCLE: NeonColor[] = ["violet", "green", "cyan", "orange"];

interface Props {
  profile: PublicFanProfile;
  showEmail?: boolean;
  email?: string;
  isOrganizer?: boolean;
  onEdit?: () => void;
  actionSlot?: ReactNode;
}

export default function ProfileView({ profile, showEmail = false, email, isOrganizer = false, onEdit, actionSlot }: Props) {
  const activeFavoriteSubgenres = filterActiveSubgenres(profile.favoriteSubgenres);
  const filledSocials = SOCIAL_PLATFORMS.filter((platform) => {
    const value = getProfileSocialValue(profile, platform);
    return Boolean(value?.trim());
  });

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-3">
      <article className="border-border bg-card/50 relative flex flex-col overflow-hidden rounded-2xl border p-6 backdrop-blur-md lg:col-span-1">
        <div className="bg-primary/10 pointer-events-none absolute inset-x-0 top-0 h-24 blur-2xl" />
        <div className="relative flex flex-col items-center text-center">
          <div className="border-primary/60 shadow-glow-violet relative h-28 w-28 overflow-hidden rounded-full border-2">
            <img
              src="/profile-avatar.png"
              alt={`@${profile.login} – zdjęcie profilowe`}
              className="size-full object-cover"
            />
          </div>
          <h3 className="font-heading text-foreground mt-4 text-2xl font-bold tracking-tight uppercase">
            @{profile.login}
          </h3>
          {isOrganizer ? (
            <GenreBadge color="green" className="mt-3">
              Organizator
            </GenreBadge>
          ) : null}
          {profile.city ? (
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <MapPin className="text-accent h-4 w-4" />
              {profile.city}
            </p>
          ) : null}
          {showEmail && email ? (
            <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm">
              <Mail className="text-primary h-4 w-4" />
              {email}
            </p>
          ) : null}
        </div>

        {profile.bio ? (
          <p className="text-muted-foreground mt-5 text-center text-sm leading-relaxed text-pretty">{profile.bio}</p>
        ) : (
          <p className="text-muted-foreground mt-5 text-center text-sm italic">Brak opisu profilu.</p>
        )}

        <div className="mt-6 flex w-full flex-col gap-2">
          <ProfileShareButton login={profile.login} />
          {actionSlot}
          {onEdit ? (
            <Button type="button" onClick={onEdit} className="w-full font-semibold tracking-wider uppercase">
              <UserRound className="h-4 w-4" />
              Edytuj profil
            </Button>
          ) : null}
        </div>
      </article>

      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="border-border bg-card/50 rounded-2xl border p-6 backdrop-blur-md">
          <h4 className="font-heading text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
            <Music2 className="text-accent h-4 w-4" />
            Ulubione podgatunki
          </h4>
          <div className="mt-4 flex flex-wrap gap-2">
            {activeFavoriteSubgenres.length > 0 ? (
              activeFavoriteSubgenres.map((subgenre, index: number) => (
                <GenreBadge key={subgenre} color={NEON_CYCLE[index % NEON_CYCLE.length]}>
                  {SUBGENRE_LABELS[subgenre]}
                </GenreBadge>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">Nie wybrano</p>
            )}
          </div>
        </div>

        <div className="border-border bg-card/50 rounded-2xl border p-6 backdrop-blur-md">
          <h4 className="font-heading text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
            <AtSign className="text-accent h-4 w-4" />
            Social media
          </h4>
          {filledSocials.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {filledSocials.map((platform: SocialPlatform) => {
                const value = getProfileSocialValue(profile, platform);
                if (!value?.trim()) {
                  return null;
                }
                const meta = getSocialMeta(platform);
                const Icon = meta.icon;
                return (
                  <a
                    key={platform}
                    href={formatSocialHref(platform, value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group border-border bg-background/40 hover:border-primary/50 hover:shadow-glow-violet flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:-translate-y-0.5"
                  >
                    <Icon className="text-primary h-5 w-5" />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="text-foreground text-sm font-semibold">{meta.label}</span>
                      <span className="text-muted-foreground truncate font-mono text-xs">
                        {formatSocialDisplay(platform, value)}
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm">Brak linków do social mediów.</p>
          )}
        </div>

        {hasFavouriteTrack(profile) && profile.favouriteTrackPlatform && profile.favouriteTrackUrl ? (
          <div className="border-border bg-card/50 rounded-2xl border p-6 backdrop-blur-md">
            <h4 className="font-heading text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
              <Music className="text-accent h-4 w-4" />
              My vibes
            </h4>
            {profile.favouriteTrackTitle ? (
              <p className="text-foreground mt-3 text-sm font-semibold">{profile.favouriteTrackTitle}</p>
            ) : null}
            <MyVibesEmbed
              platform={profile.favouriteTrackPlatform}
              url={profile.favouriteTrackUrl}
              title={profile.favouriteTrackTitle}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

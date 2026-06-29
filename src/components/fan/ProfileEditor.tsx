import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import {
  favouriteTrackErrorLabel,
  validateFavouriteTrackUrl,
  type FavouriteTrackPlatform,
} from "@/lib/fan/favourite-track";
import { FAN_LOGIN_REGEX } from "@/lib/fan/profile-schema";
import { getSocialMeta, SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/fan/profile-display";
import { filterActiveSubgenres } from "@/lib/subgenres";
import { cn } from "@/lib/utils";
import type { FanProfile, Subgenre } from "@/types";
import { SUBGENRE_LABELS, SUBGENRES } from "@/types";
import { AtSign, Check, MapPin, Music, Music2, Save, UserRound, X } from "lucide-react";
import { useState } from "react";

const BIO_MAX = 200;
const MAX_SUBGENRES = 5;

const FAVOURITE_TRACK_PLATFORMS: { id: FavouriteTrackPlatform; label: string }[] = [
  { id: "spotify", label: "Spotify" },
  { id: "soundcloud", label: "SoundCloud" },
];

const FAVOURITE_TRACK_PLACEHOLDERS: Record<FavouriteTrackPlatform, string> = {
  spotify: "open.spotify.com/track/...",
  soundcloud: "soundcloud.com/artysta/utwor",
};

const inputClass =
  "w-full rounded-xl border border-border bg-input/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/70 focus:ring-1 focus:ring-primary/40";

const labelClass = "mb-1.5 block font-mono text-xs font-semibold tracking-widest text-muted-foreground uppercase";

function Fieldset({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card/50 rounded-2xl border p-6 backdrop-blur-md">
      <h4 className="font-heading text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
        <Icon className="text-accent h-4 w-4" />
        {title}
      </h4>
      <div className="mt-4">{children}</div>
    </div>
  );
}

type ProfileDraft = FanProfile;

interface Props {
  initialProfile: ProfileDraft;
  onSave: (profile: ProfileDraft) => void | Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  error?: string;
}

function validateDraft(draft: ProfileDraft): string | null {
  if (!FAN_LOGIN_REGEX.test(draft.login.trim().toLowerCase())) {
    return "Login musi mieć 3–30 znaków: małe litery, cyfry i podkreślenia";
  }
  if ((draft.bio?.length ?? 0) > BIO_MAX) {
    return `Opis może mieć maksymalnie ${BIO_MAX} znaków`;
  }
  if (draft.favoriteSubgenres.length > MAX_SUBGENRES) {
    return `Możesz wybrać maksymalnie ${MAX_SUBGENRES} podgatunków`;
  }
  const trackUrl = draft.favouriteTrackUrl?.trim() ?? "";
  if (trackUrl) {
    const platform = draft.favouriteTrackPlatform;
    if (!platform) {
      return "Wybierz platformę: Spotify lub SoundCloud";
    }
    if (!validateFavouriteTrackUrl(platform, trackUrl)) {
      return favouriteTrackErrorLabel(platform);
    }
  }
  return null;
}

export default function ProfileEditor({ initialProfile, onSave, onCancel, isSaving = false, error }: Props) {
  const [draft, setDraft] = useState<ProfileDraft>(() => ({
    ...initialProfile,
    favoriteSubgenres: filterActiveSubgenres(initialProfile.favoriteSubgenres),
    favouriteTrackPlatform: initialProfile.favouriteTrackPlatform ?? "spotify",
  }));
  const [localError, setLocalError] = useState<string | null>(null);

  const setField = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const setSocial = (platform: SocialPlatform, value: string) => {
    const key = getSocialMeta(platform).profileKey;
    setField(key, value || null);
  };

  const isSubgenreSelected = (subgenre: Subgenre) => draft.favoriteSubgenres.includes(subgenre);

  const toggleSubgenre = (subgenre: Subgenre) => {
    setDraft((prev) => {
      if (prev.favoriteSubgenres.includes(subgenre)) {
        return {
          ...prev,
          favoriteSubgenres: prev.favoriteSubgenres.filter((item) => item !== subgenre),
        };
      }
      if (prev.favoriteSubgenres.length >= MAX_SUBGENRES) {
        setLocalError(`Możesz wybrać maksymalnie ${MAX_SUBGENRES} podgatunków`);
        return prev;
      }
      setLocalError(null);
      return {
        ...prev,
        favoriteSubgenres: [...prev.favoriteSubgenres, subgenre],
      };
    });
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateDraft(draft);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    void onSave({
      ...draft,
      login: draft.login.trim().toLowerCase(),
      bio: draft.bio?.trim() ? draft.bio.trim() : null,
      city: draft.city?.trim() ? draft.city.trim() : null,
      favouriteTrackUrl: draft.favouriteTrackUrl?.trim() ? draft.favouriteTrackUrl.trim() : null,
      favouriteTrackPlatform: draft.favouriteTrackUrl?.trim() ? draft.favouriteTrackPlatform : null,
      favouriteTrackTitle: draft.favouriteTrackUrl?.trim() ? draft.favouriteTrackTitle : null,
    });
  };

  const displayError = error ?? localError;
  const bioLength = draft.bio?.length ?? 0;
  const activeTrackPlatform = draft.favouriteTrackPlatform ?? "spotify";

  return (
    <form onSubmit={handleSubmit} className="mt-10">
      <div className="flex flex-col gap-6">
        <Fieldset icon={UserRound} title="Dane podstawowe">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="profile-login" className={labelClass}>
                Login
              </label>
              <div className="relative">
                <AtSign className="text-primary pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                <input
                  id="profile-login"
                  value={draft.login}
                  onChange={(event) => {
                    setField("login", event.target.value);
                  }}
                  className={cn(inputClass, "pl-10")}
                  placeholder="twoj_login"
                  autoComplete="username"
                  disabled={isSaving}
                />
              </div>
              <p className="text-muted-foreground mt-1.5 font-mono text-xs">Dozwolone: [a-z0-9_], 3–30 znaków</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="profile-city" className={labelClass}>
                Miasto
              </label>
              <div className="relative">
                <MapPin className="text-accent pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                <input
                  id="profile-city"
                  value={draft.city ?? ""}
                  onChange={(event) => {
                    setField("city", event.target.value || null);
                  }}
                  className={cn(inputClass, "pl-10")}
                  placeholder="Miasto, kraj"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        </Fieldset>

        <Fieldset icon={UserRound} title="Krótki opis">
          <textarea
            value={draft.bio ?? ""}
            onChange={(event) => {
              setField("bio", event.target.value || null);
            }}
            rows={4}
            maxLength={BIO_MAX}
            className={cn(inputClass, "resize-none leading-relaxed")}
            placeholder="Opowiedz coś o sobie i swoim brzmieniu..."
            disabled={isSaving}
          />
          <p className="text-muted-foreground mt-1.5 text-right font-mono text-xs">
            {bioLength}/{BIO_MAX}
          </p>
        </Fieldset>

        <Fieldset icon={Music2} title="Ulubione podgatunki">
          <div className="flex flex-wrap gap-2">
            {SUBGENRES.map((subgenre) => {
              const active = isSubgenreSelected(subgenre);
              return (
                <button
                  key={subgenre}
                  type="button"
                  onClick={() => {
                    toggleSubgenre(subgenre);
                  }}
                  aria-pressed={active}
                  disabled={isSaving}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.7rem] font-bold tracking-widest uppercase transition-all",
                    active
                      ? "border-primary/60 bg-primary/15 text-primary shadow-glow-violet"
                      : "border-border bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {active ? <Check className="h-3 w-3" /> : null}
                  {SUBGENRE_LABELS[subgenre]}
                </button>
              );
            })}
          </div>
        </Fieldset>

        <Fieldset icon={AtSign} title="Social media">
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIAL_PLATFORMS.map((platform) => {
              const meta = getSocialMeta(platform);
              const Icon = meta.icon;
              return (
                <div key={platform}>
                  <label htmlFor={`profile-social-${platform}`} className={labelClass}>
                    {meta.label}
                  </label>
                  <div className="relative">
                    <Icon className="text-primary pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                    <input
                      id={`profile-social-${platform}`}
                      value={draft[meta.profileKey] ?? ""}
                      onChange={(event) => {
                        setSocial(platform, event.target.value);
                      }}
                      className={cn(inputClass, "pl-10")}
                      placeholder={meta.placeholder}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Fieldset>

        <Fieldset icon={Music} title="My vibes">
          <p className="text-muted-foreground mb-4 text-sm">
            Wklej link do jednego utworu z Spotify lub SoundCloud. Tytuł pobierzemy automatycznie po zapisie.
          </p>
          <div className="flex flex-wrap gap-2">
            {FAVOURITE_TRACK_PLATFORMS.map((platform) => {
              const active = activeTrackPlatform === platform.id;
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => {
                    setDraft((prev) => ({ ...prev, favouriteTrackPlatform: platform.id }));
                  }}
                  aria-pressed={active}
                  disabled={isSaving}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.7rem] font-bold tracking-widest uppercase transition-all",
                    active
                      ? "border-primary/60 bg-primary/15 text-primary shadow-glow-violet"
                      : "border-border bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {active ? <Check className="h-3 w-3" /> : null}
                  {platform.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <label htmlFor="profile-favourite-track-url" className={labelClass}>
              Link do utworu
            </label>
            <input
              id="profile-favourite-track-url"
              value={draft.favouriteTrackUrl ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((prev) => ({
                  ...prev,
                  favouriteTrackUrl: value || null,
                  favouriteTrackTitle: value ? prev.favouriteTrackTitle : null,
                }));
              }}
              className={inputClass}
              placeholder={FAVOURITE_TRACK_PLACEHOLDERS[activeTrackPlatform]}
              disabled={isSaving}
            />
          </div>
        </Fieldset>

        {displayError ? (
          <div>
            <ServerError message={displayError} />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSaving}
            className="font-semibold tracking-wider uppercase"
          >
            <X className="h-4 w-4" />
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="shadow-glow-violet font-semibold tracking-wider uppercase"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Zapisywanie…" : "Zapisz zmiany"}
          </Button>
        </div>
      </div>
    </form>
  );
}

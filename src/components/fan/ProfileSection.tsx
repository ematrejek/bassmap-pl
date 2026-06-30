import EventDiscoveryGrid from "@/components/discovery/EventDiscoveryGrid";
import ProfileEditor from "@/components/fan/ProfileEditor";
import ProfileView from "@/components/fan/ProfileView";
import { Equalizer } from "@/components/shell/Equalizer";
import { Button } from "@/components/ui/button";
import { readApiError } from "@/lib/api/json";
import { loginFromEmailLocalPart } from "@/lib/auth/display-name";
import { normalizeSuggestedLogin } from "@/lib/services/fan-profile";
import { activeSubgenresChanged } from "@/lib/subgenres";
import { DISCOVERY_PATH, MY_EVENTS_PATH, PROFILE_PATH } from "@/lib/routes";
import { shellBtnPrimary, shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { Event, FanProfile } from "@/types";
import { useState } from "react";

function pluralGoing(count: number): string {
  if (count === 1) {
    return "wydarzenie";
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "wydarzenia";
  }
  return "wydarzeń";
}

function createDraftProfile(userId: string, email: string, profile: FanProfile | null): FanProfile {
  if (profile) {
    return profile;
  }

  const suggestedLogin = normalizeSuggestedLogin(loginFromEmailLocalPart(email)) ?? "";
  const now = new Date().toISOString();

  return {
    userId,
    login: suggestedLogin,
    bio: null,
    city: null,
    favoriteSubgenres: [],
    instagramUrl: null,
    soundcloudUrl: null,
    facebookUrl: null,
    spotifyUrl: null,
    twitchUrl: null,
    favouriteTrackPlatform: null,
    favouriteTrackUrl: null,
    favouriteTrackTitle: null,
    createdAt: now,
    updatedAt: now,
  };
}

function profileToPatchBody(nextProfile: FanProfile, previousProfile: FanProfile | null) {
  const body: Record<string, unknown> = {
    login: nextProfile.login,
    bio: nextProfile.bio,
    city: nextProfile.city,
    instagramUrl: nextProfile.instagramUrl,
    soundcloudUrl: nextProfile.soundcloudUrl,
    facebookUrl: nextProfile.facebookUrl,
    spotifyUrl: nextProfile.spotifyUrl,
    twitchUrl: nextProfile.twitchUrl,
  };

  const subgenresChanged =
    !previousProfile || activeSubgenresChanged(previousProfile.favoriteSubgenres, nextProfile.favoriteSubgenres);

  if (subgenresChanged) {
    body.favoriteSubgenres = nextProfile.favoriteSubgenres;
  }

  const previousUrl = previousProfile?.favouriteTrackUrl ?? null;
  const previousPlatform = previousProfile?.favouriteTrackPlatform ?? null;
  const trackChanged =
    nextProfile.favouriteTrackUrl !== previousUrl || nextProfile.favouriteTrackPlatform !== previousPlatform;

  if (trackChanged) {
    return {
      ...body,
      favouriteTrackUrl: nextProfile.favouriteTrackUrl,
      favouriteTrackPlatform: nextProfile.favouriteTrackUrl ? nextProfile.favouriteTrackPlatform : null,
    };
  }

  return body;
}

interface Props {
  email: string;
  userId: string;
  initialProfile: FanProfile | null;
  initialIsOrganizer?: boolean;
  goingEvents?: Event[];
}

export default function ProfileSection({
  email,
  userId,
  initialProfile,
  initialIsOrganizer = false,
  goingEvents = [],
}: Props) {
  const [profile] = useState<FanProfile | null>(initialProfile);
  const [editing, setEditing] = useState(!initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave(nextProfile: FanProfile) {
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/fan/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileToPatchBody(nextProfile, profile)),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setSaveError(readApiError(data) ?? "Nie udało się zapisać profilu");
        return;
      }

      window.location.assign(`${PROFILE_PATH}#profile`);
      return;
    } catch {
      setSaveError("Nie udało się zapisać profilu. Spróbuj ponownie.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setSaveError(null);
    if (profile !== null) {
      setEditing(false);
    }
  }

  const editorProfile = createDraftProfile(userId, email, profile);

  return (
    <section id="profile" className="border-border relative border-t py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-3">
          <Equalizer bars={5} className="text-primary h-5" />
          <h2 className="font-heading text-foreground text-3xl font-extrabold tracking-tight uppercase md:text-4xl">
            {editing ? (
              <>
                Edytuj <span className="text-primary text-glow-violet">profil</span>
              </>
            ) : (
              <>
                Mój <span className="text-primary text-glow-violet">profil</span>
              </>
            )}
          </h2>
        </div>
        {editing ? (
          <p className="text-muted-foreground mt-3 max-w-xl text-pretty">
            Zaktualizuj login, miasto, opis, ulubione podgatunki, linki do social mediów i sekcję My vibes.
          </p>
        ) : null}

        {editing ? (
          <ProfileEditor
            initialProfile={editorProfile}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
            error={saveError ?? undefined}
          />
        ) : profile ? (
          <ProfileView
            profile={profile}
            showEmail
            email={email}
            isOrganizer={initialIsOrganizer}
            onEdit={() => {
              setEditing(true);
            }}
          />
        ) : null}

        {!editing ? (
          <div className="mt-12">
            <div className="flex flex-wrap items-center gap-3">
              <Equalizer bars={4} className="text-accent h-4" />
              <h3 className="font-heading text-foreground text-2xl font-bold tracking-tight uppercase">
                Moje wydarzenia
              </h3>
              <span className="border-border bg-card/60 text-muted-foreground rounded-full border px-2.5 py-0.5 font-mono text-xs">
                {goingEvents.length} {pluralGoing(goingEvents.length)}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">Wydarzenia, na które zaznaczyłeś «Idę».</p>

            {goingEvents.length === 0 ? (
              <div className={cn("mt-6 p-8 text-center", shellPanelFlat, shellTextMuted)}>
                <p className="text-sm">Nie idziesz jeszcze na żadne wydarzenie. Znajdź imprezę i zaznacz «Idę».</p>
                <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button asChild className={shellBtnPrimary}>
                    <a href={DISCOVERY_PATH}>Wydarzenia</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={`${MY_EVENTS_PATH}#ide`}>Moje wydarzenia</a>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <EventDiscoveryGrid events={goingEvents.slice(0, 6)} />
                </div>
                {goingEvents.length > 6 ? (
                  <div className="mt-6 text-center">
                    <Button asChild variant="outline">
                      <a href={`${MY_EVENTS_PATH}#ide`}>Zobacz wszystkie ({goingEvents.length})</a>
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

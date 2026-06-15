import GenreBadge from "@/components/fan/GenreBadge";
import ProfileEventCard from "@/components/fan/ProfileEventCard";
import { Equalizer } from "@/components/shell/Equalizer";
import { Button } from "@/components/ui/button";
import { DISCOVERY_PATH, MY_EVENTS_PATH } from "@/lib/routes";
import { shellBtnPrimary, shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";
import { AtSign, Camera, Gamepad2, MapPin, Music2, Play, UserRound } from "lucide-react";

const PLACEHOLDER_SOCIALS = [
  { label: "Instagram", handle: "Wkrótce", icon: Camera },
  { label: "YouTube", handle: "Wkrótce", icon: Play },
  { label: "Twitch", handle: "Wkrótce", icon: Gamepad2 },
] as const;

function profileFromEmail(email: string): { displayName: string; login: string } {
  const local = email.split("@")[0] ?? email;
  const login = local.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  const displayName =
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ") || "Fan";

  return { displayName, login };
}

function pluralGoing(count: number): string {
  if (count === 1) {
    return "event";
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "eventy";
  }
  return "eventów";
}

interface Props {
  email: string;
  /** Wydarzenia z «Idę» – placeholder do slice RSVP. */
  goingEvents?: Event[];
}

export default function ProfileSection({ email, goingEvents = [] }: Props) {
  const { displayName, login } = profileFromEmail(email);

  return (
    <section id="profile" className="border-border relative border-t py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-3">
          <Equalizer bars={5} className="text-primary h-5" />
          <h2 className="font-heading text-foreground text-3xl font-extrabold tracking-tight uppercase md:text-4xl">
            Mój <span className="text-primary text-glow-violet">profil</span>
          </h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <article className="border-border bg-card/50 relative flex flex-col overflow-hidden rounded-2xl border p-6 backdrop-blur-md lg:col-span-1">
            <div className="bg-primary/10 pointer-events-none absolute inset-x-0 top-0 h-24 blur-2xl" />
            <div className="relative flex flex-col items-center text-center">
              <div className="border-primary/60 shadow-glow-violet relative h-28 w-28 overflow-hidden rounded-full border-2">
                <img
                  src="/profile-avatar.png"
                  alt={`${displayName} – zdjęcie profilowe`}
                  className="size-full object-cover"
                />
              </div>
              <h3 className="font-heading text-foreground mt-4 text-2xl font-bold tracking-tight uppercase">
                {displayName}
              </h3>
              <p className="text-primary mt-1 flex items-center gap-1.5 font-mono text-sm">
                <AtSign className="h-3.5 w-3.5" />
                {login}
              </p>
              <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                <MapPin className="text-accent h-4 w-4" />
                Miasto – wkrótce
              </p>
            </div>

            <p className="text-muted-foreground mt-5 text-center text-sm leading-relaxed text-pretty">
              Opis profilu – wkrótce. Tu pojawi się Twoja raver-bio.
            </p>

            <Button
              type="button"
              disabled
              title="Edycja profilu będzie dostępna wkrótce"
              className="mt-6 w-full font-semibold tracking-wider uppercase opacity-60"
            >
              <UserRound className="h-4 w-4" />
              Edytuj profil
            </Button>
          </article>

          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="border-border bg-card/50 rounded-2xl border p-6 backdrop-blur-md">
              <h4 className="font-heading text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
                <Music2 className="text-accent h-4 w-4" />
                Ulubione podgatunki
              </h4>
              <div className="mt-4 flex flex-wrap gap-2 opacity-50">
                <GenreBadge color="violet">Wkrótce</GenreBadge>
                <GenreBadge color="green">Wkrótce</GenreBadge>
                <GenreBadge color="cyan">Wkrótce</GenreBadge>
              </div>
              <p className="text-muted-foreground mt-3 text-xs">Wkrótce wybierzesz ulubione podgatunki.</p>
            </div>

            <div className="border-border bg-card/50 rounded-2xl border p-6 backdrop-blur-md">
              <h4 className="font-heading text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
                <AtSign className="text-accent h-4 w-4" />
                Moje social media
              </h4>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {PLACEHOLDER_SOCIALS.map((social) => (
                  <div
                    key={social.label}
                    className="border-border bg-background/40 flex items-center gap-3 rounded-xl border px-4 py-3 opacity-60"
                    aria-disabled="true"
                  >
                    <social.icon className="text-primary h-5 w-5" />
                    <span className="flex flex-col leading-tight">
                      <span className="text-foreground text-sm font-semibold">{social.label}</span>
                      <span className="text-muted-foreground font-mono text-xs">{social.handle}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-xs">Wkrótce dodasz linki do social mediów.</p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex flex-wrap items-center gap-3">
            <Equalizer bars={4} className="text-accent h-4" />
            <h3 className="font-heading text-foreground text-2xl font-bold tracking-tight uppercase">Moje eventy</h3>
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
                  <a href={DISCOVERY_PATH}>Lista eventów</a>
                </Button>
                <Button asChild variant="outline">
                  <a href={`${MY_EVENTS_PATH}#ide`}>Moje eventy</a>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {goingEvents.slice(0, 6).map((event) => (
                  <ProfileEventCard key={event.id} event={event} />
                ))}
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
      </div>
    </section>
  );
}

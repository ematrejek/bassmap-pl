import type { CrewContact } from "@/types";
import { fanPublicProfilePath } from "@/lib/routes";
import { ExternalLink, Loader2 } from "lucide-react";

const SOCIAL_FIELDS: { key: keyof CrewContact; label: string }[] = [
  { key: "instagramUrl", label: "Instagram" },
  { key: "soundcloudUrl", label: "SoundCloud" },
  { key: "facebookUrl", label: "Facebook" },
  { key: "spotifyUrl", label: "Spotify" },
  { key: "twitchUrl", label: "Twitch" },
];

interface Props {
  contact: CrewContact | null;
  isLoading: boolean;
  error: string | null;
}

export default function CrewContactCard({ contact, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Ładowanie kontaktu...
      </p>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (!contact) {
    return null;
  }

  const socialLinks = SOCIAL_FIELDS.filter((field) => contact[field.key]);

  return (
    <div className="border-border bg-background/40 mt-3 space-y-2 rounded-lg border p-3 text-sm">
      {contact.login ? (
        <p>
          Login:{" "}
          <a href={fanPublicProfilePath(contact.login)} className="text-primary font-semibold hover:underline">
            @{contact.login}
          </a>
        </p>
      ) : (
        <p className="text-muted-foreground">Fan bez publicznego loginu</p>
      )}

      {socialLinks.length > 0 ? (
        <ul className="space-y-1">
          {socialLinks.map((field) => {
            const url = contact[field.key];
            if (!url) {
              return null;
            }
            return (
              <li key={field.key}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  {field.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">Brak uzupełnionych linków social w profilu.</p>
      )}
    </div>
  );
}

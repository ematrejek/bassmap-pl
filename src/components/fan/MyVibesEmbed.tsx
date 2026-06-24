import { favouriteTrackEmbedSrc, type FavouriteTrackPlatform } from "@/lib/fan/favourite-track";
import { cn } from "@/lib/utils";

interface Props {
  platform: FavouriteTrackPlatform;
  url: string;
  title: string | null;
  className?: string;
}

export default function MyVibesEmbed({ platform, url, title, className }: Props) {
  const embedSrc = favouriteTrackEmbedSrc(platform, url);
  if (!embedSrc) {
    return null;
  }

  const iframeTitle = title?.trim() ? title : "My vibes";

  return (
    <div className={cn("border-border mt-4 overflow-hidden rounded-xl border", className)}>
      <iframe
        title={iframeTitle}
        src={embedSrc}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        className="w-full"
        height={platform === "spotify" ? 152 : 166}
      />
    </div>
  );
}

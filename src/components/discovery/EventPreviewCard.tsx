import EventCoverImage from "@/components/discovery/EventCoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEventDate, formatEventPrice, formatEventVenueLine } from "@/lib/events/format";
import { shellBtnPrimary, shellLink, shellPanel, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { EventWithCoverUrl } from "@/types";
import { SUBGENRE_LABELS } from "@/types";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";

interface Props {
  event: EventWithCoverUrl | null;
  onClose: () => void;
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export default function EventPreviewCard({ event, onClose }: Props) {
  const isClient = useIsClient();

  if (!event || !isClient) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-x-4 bottom-4 z-[1100] mx-auto max-w-md overflow-hidden shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6",
        shellPanel,
      )}
      role="dialog"
      aria-label={`Podgląd: ${event.name}`}
    >
      <div className="relative">
        <EventCoverImage
          coverUrl={event.coverUrl}
          alt={`Okładka: ${event.name}`}
          variant="preview"
          coverAspect={event.coverAspect}
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
          aria-label="Zamknij podgląd"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="text-foreground text-lg font-semibold">{event.name}</h3>
        <p className={cn("text-sm", shellTextMuted)}>{formatEventDate(event.startsAt)}</p>
        <p className={cn("text-sm", shellTextMuted)}>{formatEventVenueLine(event)}</p>
        <p className="text-accent text-sm font-medium">{formatEventPrice(event)}</p>

        <div className="flex flex-wrap gap-1">
          {event.subgenres.map((subgenre) => (
            <Badge key={subgenre} variant="outline" className="border-primary/30 bg-primary/10 text-foreground">
              {SUBGENRE_LABELS[subgenre]}
            </Badge>
          ))}
        </div>

        {event.ticketUrl && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("inline-block text-sm underline-offset-2 hover:underline", shellLink)}
          >
            Kup bilet
          </a>
        )}

        <Button asChild className={cn("mt-2 w-full", shellBtnPrimary)}>
          <a href={`/events/${event.id}`}>Przejdź do wydarzenia</a>
        </Button>
      </div>
    </div>,
    document.body,
  );
}

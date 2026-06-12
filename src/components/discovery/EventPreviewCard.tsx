import EventCoverImage from "@/components/discovery/EventCoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEventDate, formatEventPrice, formatEventVenueLine } from "@/lib/events/format";
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
      className="fixed inset-x-4 bottom-4 z-[1100] mx-auto max-w-md overflow-hidden rounded-2xl border border-white/20 bg-slate-900/95 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-6 sm:bottom-6"
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
        <h3 className="text-lg font-semibold text-white">{event.name}</h3>
        <p className="text-sm text-blue-100/70">{formatEventDate(event.startsAt)}</p>
        <p className="text-sm text-blue-100/60">{formatEventVenueLine(event)}</p>
        <p className="text-sm font-medium text-purple-200">{formatEventPrice(event)}</p>

        <div className="flex flex-wrap gap-1">
          {event.subgenres.map((subgenre) => (
            <Badge key={subgenre} variant="outline" className="border-purple-400/30 bg-purple-500/10 text-purple-100">
              {SUBGENRE_LABELS[subgenre]}
            </Badge>
          ))}
        </div>

        {event.ticketUrl && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-purple-300 underline-offset-2 hover:text-purple-100 hover:underline"
          >
            Kup bilet
          </a>
        )}

        <Button asChild className="mt-2 w-full border-white/20 bg-purple-600/80 text-white hover:bg-purple-500/90">
          <a href={`/events/${event.id}`}>Przejdź do wydarzenia</a>
        </Button>
      </div>
    </div>,
    document.body,
  );
}

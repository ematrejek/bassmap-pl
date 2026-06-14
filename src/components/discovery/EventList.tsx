import EventCoverImage from "@/components/discovery/EventCoverImage";
import { Badge } from "@/components/ui/badge";
import { formatEventDate, formatEventPrice, formatEventVenueLine } from "@/lib/events/format";
import { shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { EventWithCoverUrl } from "@/types";
import { SUBGENRE_LABELS } from "@/types";

interface Props {
  events: EventWithCoverUrl[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  hasActiveFilters: boolean;
}

export default function EventList({ events, selectedEventId, onSelectEvent, hasActiveFilters }: Props) {
  if (events.length === 0) {
    return (
      <div className={cn("p-8 text-center", shellPanelFlat, shellTextMuted)}>
        {hasActiveFilters
          ? "Brak wydarzeń spełniających kryteria. Spróbuj zmienić filtry."
          : "Brak nadchodzących wydarzeń. Wróć wkrótce!"}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li key={event.id}>
          <button
            type="button"
            onClick={() => {
              onSelectEvent(event.id);
            }}
            className={cn(
              "w-full rounded-xl border p-4 text-left backdrop-blur-md transition-colors",
              "border-border/70 bg-card/50 hover:border-primary/40 hover:bg-card/70",
              selectedEventId === event.id && "border-primary/60 bg-primary/10 ring-primary/30 ring-1",
            )}
          >
            <div className="flex gap-3">
              <EventCoverImage
                coverUrl={event.coverUrl}
                alt={`Okładka: ${event.name}`}
                variant="thumb"
                coverAspect={event.coverAspect}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-foreground truncate font-semibold">{event.name}</h3>
                    <p className={cn("text-sm", shellTextMuted)}>{formatEventDate(event.startsAt)}</p>
                    <p className={cn("text-sm", shellTextMuted)}>{formatEventVenueLine(event)}</p>
                  </div>
                  <p className="text-accent shrink-0 text-sm font-medium">{formatEventPrice(event)}</p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {event.subgenres.slice(0, 4).map((subgenre) => (
                <Badge key={subgenre} variant="outline" className="border-primary/30 bg-primary/10 text-foreground">
                  {SUBGENRE_LABELS[subgenre]}
                </Badge>
              ))}
              {event.subgenres.length > 4 && (
                <Badge variant="outline" className={cn("border-border", shellTextMuted)}>
                  +{String(event.subgenres.length - 4)}
                </Badge>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

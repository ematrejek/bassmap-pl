import EventCoverImage from "@/components/discovery/EventCoverImage";
import { Badge } from "@/components/ui/badge";
import { formatEventDate, formatEventPrice, formatEventVenueLine } from "@/lib/events/format";
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
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-blue-100/70 backdrop-blur-xl">
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
              "w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-xl transition-colors",
              "hover:border-purple-400/40 hover:bg-white/10",
              selectedEventId === event.id && "border-purple-400/60 bg-purple-500/10 ring-1 ring-purple-400/30",
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
                    <h3 className="truncate font-semibold text-white">{event.name}</h3>
                    <p className="text-sm text-blue-100/70">{formatEventDate(event.startsAt)}</p>
                    <p className="text-sm text-blue-100/60">{formatEventVenueLine(event)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-purple-200">{formatEventPrice(event)}</p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {event.subgenres.slice(0, 4).map((subgenre) => (
                <Badge
                  key={subgenre}
                  variant="outline"
                  className="border-purple-400/30 bg-purple-500/10 text-purple-100"
                >
                  {SUBGENRE_LABELS[subgenre]}
                </Badge>
              ))}
              {event.subgenres.length > 4 && (
                <Badge variant="outline" className="border-white/20 text-blue-100/60">
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

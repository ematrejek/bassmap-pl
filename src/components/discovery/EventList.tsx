import EventDiscoveryCard from "@/components/discovery/EventDiscoveryCard";
import { shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { EventWithCoverUrl } from "@/types";

interface Props {
  events: EventWithCoverUrl[];
  hasActiveFilters: boolean;
  isLoggedIn?: boolean;
  hoveredEventId?: string | null;
  onHoverEvent?: (id: string | null) => void;
}

export default function EventList({
  events,
  hasActiveFilters,
  isLoggedIn = false,
  hoveredEventId,
  onHoverEvent,
}: Props) {
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
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventDiscoveryCard
          key={event.id}
          event={event}
          isLoggedIn={isLoggedIn}
          isHighlighted={hoveredEventId === event.id}
          onMouseEnter={() => {
            onHoverEvent?.(event.id);
          }}
          onMouseLeave={() => {
            onHoverEvent?.(null);
          }}
        />
      ))}
    </div>
  );
}

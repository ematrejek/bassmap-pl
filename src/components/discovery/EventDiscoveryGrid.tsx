import EventDiscoveryCard from "@/components/discovery/EventDiscoveryCard";
import type { Event, EventWithCoverUrl } from "@/types";

function toDiscoveryEvent(event: Event | EventWithCoverUrl): EventWithCoverUrl {
  return "coverUrl" in event ? event : { ...event, coverUrl: null };
}

interface Props {
  events: (Event | EventWithCoverUrl)[];
}

export default function EventDiscoveryGrid({ events }: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventDiscoveryCard key={event.id} event={toDiscoveryEvent(event)} />
      ))}
    </div>
  );
}

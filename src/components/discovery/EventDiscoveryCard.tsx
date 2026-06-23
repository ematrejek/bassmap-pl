import EventCardSubgenreBadges from "@/components/discovery/EventCardSubgenreBadges";
import EventRsvpButtons from "@/components/events/EventRsvpButtons";
import { useEventAttendance } from "@/components/hooks/useEventAttendance";
import { Button } from "@/components/ui/button";
import { formatEventDate, formatEventPrice, formatEventVenueLine } from "@/lib/events/format";
import { cn } from "@/lib/utils";
import type { EventWithCoverUrl } from "@/types";
import { Calendar, Clock, MapPin, Users } from "lucide-react";

interface Props {
  event: EventWithCoverUrl;
  isLoggedIn?: boolean;
  className?: string;
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function EventDiscoveryCard({
  event,
  isLoggedIn = false,
  className,
  isHighlighted = false,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const detailHref = `/events/${event.id}`;
  const initialGoingCount = event.goingCount ?? 0;
  const initialUserStatus = event.userAttendanceStatus ?? null;

  const { goingCount, userStatus, pendingStatus, handleStatusClick } = useEventAttendance({
    eventId: event.id,
    initialGoingCount,
    initialInterestedCount: 0,
    initialUserStatus,
  });

  return (
    <article
      className={cn(
        "group border-border bg-card/50 relative flex flex-col overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-300",
        "hover:border-primary/50 hover:shadow-glow-violet hover:-translate-y-1",
        isHighlighted && "border-primary/50 shadow-glow-violet -translate-y-1",
        className,
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex flex-1 flex-col p-5">
        <EventCardSubgenreBadges subgenres={event.subgenres} />

        <h3 className="font-heading text-foreground group-hover:text-glow-violet mt-4 text-xl leading-tight font-bold tracking-tight uppercase transition-colors">
          <a href={detailHref} className="hover:underline">
            {event.name}
          </a>
        </h3>

        <dl className="text-muted-foreground mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="text-accent h-4 w-4 shrink-0" aria-hidden />
            <span className="text-foreground">{formatEventVenueLine(event)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="text-accent h-4 w-4 shrink-0" aria-hidden />
            <span>{formatEventDate(event.startsAt)}</span>
            <Clock className="text-accent ml-2 h-4 w-4 shrink-0" aria-hidden />
          </div>
        </dl>

        {isLoggedIn ? (
          <div
            className="mt-5"
            onClick={(mouseEvent) => {
              mouseEvent.stopPropagation();
            }}
            onKeyDown={(keyboardEvent) => {
              keyboardEvent.stopPropagation();
            }}
            role="presentation"
          >
            <EventRsvpButtons
              userStatus={userStatus}
              pendingStatus={pendingStatus}
              onGoingClick={() => {
                void handleStatusClick("going");
              }}
              onInterestedClick={() => {
                void handleStatusClick("interested");
              }}
            />
          </div>
        ) : null}

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2",
            isLoggedIn ? "mt-3" : "border-border/70 mt-5 border-t pt-4",
          )}
        >
          <span className="text-accent text-sm font-semibold">{formatEventPrice(event)}</span>

          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4" aria-hidden />
            <span className="text-foreground font-semibold">{goingCount}</span>
            Idzie
          </span>

          {event.ticketUrl ? (
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="hover:bg-primary hover:text-primary-foreground font-semibold tracking-wider uppercase"
            >
              <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                Kup bilet
              </a>
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="hover:bg-primary hover:text-primary-foreground font-semibold tracking-wider uppercase"
            >
              <a href={detailHref}>Zobacz</a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

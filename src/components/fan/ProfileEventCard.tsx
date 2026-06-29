import GenreBadge, { type NeonColor } from "@/components/fan/GenreBadge";
import { Equalizer } from "@/components/shell/Equalizer";
import { Button } from "@/components/ui/button";
import { formatEventDate, formatEventVenueLine } from "@/lib/events/format";
import { STATUS_LABELS } from "@/lib/events/status-labels";
import { MY_EVENTS_PATH } from "@/lib/routes";
import { filterActiveSubgenres } from "@/lib/subgenres";
import { cn } from "@/lib/utils";
import type { Event, EventStatus } from "@/types";
import { SUBGENRE_LABELS } from "@/types";
import { Calendar, Clock, MapPin } from "lucide-react";

const NEON_CYCLE: NeonColor[] = ["violet", "green", "cyan", "orange"];

const STATUS_STYLE: Record<EventStatus, { className: string }> = {
  published: { className: "text-neon-green" },
  pending: { className: "text-neon-orange" },
  rejected: { className: "text-destructive" },
  draft: { className: "text-muted-foreground" },
};

interface Props {
  event: Event;
}

export default function ProfileEventCard({ event }: Props) {
  const statusStyle = STATUS_STYLE[event.status];
  const detailHref = event.status === "published" ? `/events/${event.id}` : MY_EVENTS_PATH;
  const activeSubgenres = filterActiveSubgenres(event.subgenres);

  return (
    <article className="group border-border bg-card/50 hover:border-primary/50 hover:shadow-glow-violet relative flex flex-col overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1">
      <div className="border-border/70 flex items-center justify-between border-b px-5 py-3">
        <span
          className={cn("flex items-center gap-2 text-xs font-bold tracking-widest uppercase", statusStyle.className)}
        >
          <Equalizer bars={4} className="h-3" />
          {STATUS_LABELS[event.status]}
        </span>
        <span className="text-muted-foreground font-mono text-xs">#{event.id.slice(0, 8)}</span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          {activeSubgenres.map((subgenre, index) => (
            <GenreBadge key={subgenre} color={NEON_CYCLE[index % NEON_CYCLE.length]}>
              {SUBGENRE_LABELS[subgenre]}
            </GenreBadge>
          ))}
        </div>

        <h3 className="font-heading text-foreground group-hover:text-glow-violet mt-4 text-xl leading-tight font-bold tracking-tight uppercase transition-colors">
          {event.name}
        </h3>

        <dl className="text-muted-foreground mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="text-accent h-4 w-4" />
            <span className="text-foreground">{formatEventVenueLine(event)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="text-accent h-4 w-4" />
            {formatEventDate(event.startsAt)}
            <Clock className="text-accent ml-2 h-4 w-4" aria-hidden />
          </div>
        </dl>

        <div className="border-border/70 mt-5 flex items-center justify-end border-t pt-4">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="hover:bg-primary hover:text-primary-foreground font-semibold tracking-wider uppercase"
          >
            <a href={detailHref}>{event.status === "published" ? "Zobacz" : "Moje eventy"}</a>
          </Button>
        </div>
      </div>
    </article>
  );
}

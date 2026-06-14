import EventCoverImage from "@/components/discovery/EventCoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEventDate } from "@/lib/events/format";
import { ADMIN_PATH } from "@/lib/routes";
import { shellBtnOutline, shellPanel, shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { EventStatus, EventWithCoverUrl } from "@/types";

const STATUS_LABELS: Record<EventStatus, string> = {
  published: "Opublikowane",
  draft: "Szkic",
  pending: "Oczekuje",
  rejected: "Odrzucone",
};

function statusBadgeClass(status: EventStatus): string {
  switch (status) {
    case "published":
      return "border-neon-green/40 bg-neon-green/15 text-foreground";
    case "draft":
      return "border-border bg-secondary text-muted-foreground";
    case "pending":
      return "border-neon-orange/40 bg-neon-orange/15 text-foreground";
    case "rejected":
      return "border-destructive/40 bg-destructive/15 text-foreground";
  }
}

interface Props {
  events: EventWithCoverUrl[];
  listError?: string | null;
}

export default function AdminEventsTable({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className={cn("p-8 text-center", shellPanelFlat, shellTextMuted)}>
        Nie ma jeszcze żadnych wydarzeń. Kliknij „Dodaj wydarzenie”, aby utworzyć pierwsze.
      </div>
    );
  }

  return (
    <div className={cn("p-4 sm:p-6", shellPanel)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border/70 hover:bg-transparent">
            <TableHead className="text-muted-foreground w-14">Okładka</TableHead>
            <TableHead className="text-muted-foreground">Nazwa</TableHead>
            <TableHead className="text-muted-foreground">Data</TableHead>
            <TableHead className="text-muted-foreground">Miasto</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id} className="border-border/70 hover:bg-secondary/40">
              <TableCell>
                <EventCoverImage
                  coverUrl={event.coverUrl}
                  alt={`Okładka: ${event.name}`}
                  variant="thumb"
                  coverAspect={event.coverAspect}
                  className="size-10"
                />
              </TableCell>
              <TableCell className="text-foreground max-w-[200px] truncate font-medium sm:max-w-xs">
                {event.name}
              </TableCell>
              <TableCell className={shellTextMuted}>{formatEventDate(event.startsAt)}</TableCell>
              <TableCell className={shellTextMuted}>{event.city}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("border", statusBadgeClass(event.status))}>
                  {STATUS_LABELS[event.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button asChild variant="outline" size="sm" className={shellBtnOutline}>
                    <a href={`${ADMIN_PATH}/events/${event.id}/edit`}>Edytuj</a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-red-100"
                  >
                    <a href={`${ADMIN_PATH}/events/${event.id}/delete`}>Usuń</a>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

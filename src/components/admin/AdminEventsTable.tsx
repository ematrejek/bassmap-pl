import EventCoverImage from "@/components/discovery/EventCoverImage";
import EventModerationActions from "@/components/admin/EventModerationActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEventDate } from "@/lib/events/format";
import { STATUS_LABELS, statusBadgeClass } from "@/lib/events/status-labels";
import { ADMIN_PATH } from "@/lib/routes";
import { shellBtnOutline, shellPanel, shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { AdminEventRow } from "@/types";

interface Props {
  events: AdminEventRow[];
  showSubmitter?: boolean;
  showModerationActions?: boolean;
  emptyMessage?: string;
}

export default function AdminEventsTable({
  events,
  showSubmitter = false,
  showModerationActions = false,
  emptyMessage = "Brak wydarzeń w tej sekcji.",
}: Props) {
  if (events.length === 0) {
    return <div className={cn("p-8 text-center", shellPanelFlat, shellTextMuted)}>{emptyMessage}</div>;
  }

  return (
    <div className={cn("p-4 sm:p-6", shellPanel)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border/70 hover:bg-transparent">
            <TableHead className="text-muted-foreground w-14">Okładka</TableHead>
            <TableHead className="text-muted-foreground">Nazwa</TableHead>
            {showSubmitter ? <TableHead className="text-muted-foreground">Zgłaszający</TableHead> : null}
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
              {showSubmitter ? (
                <TableCell className="max-w-[180px]">
                  {event.submitterLogin || event.submitterEmail ? (
                    <div className="flex flex-col gap-0.5">
                      {event.submitterLogin ? (
                        <span className="text-primary font-mono text-sm">@{event.submitterLogin}</span>
                      ) : null}
                      {event.submitterEmail ? (
                        <span className={cn("truncate text-xs", shellTextMuted)}>{event.submitterEmail}</span>
                      ) : null}
                    </div>
                  ) : (
                    <span className={cn("text-xs", shellTextMuted)}>Nieznany użytkownik</span>
                  )}
                </TableCell>
              ) : null}
              <TableCell className={shellTextMuted}>{formatEventDate(event.startsAt)}</TableCell>
              <TableCell className={shellTextMuted}>{event.city}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("border", statusBadgeClass(event.status))}>
                  {STATUS_LABELS[event.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-2">
                  {showModerationActions && event.status === "pending" ? (
                    <EventModerationActions eventId={event.id} />
                  ) : null}
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import { ServerError } from "@/components/auth/ServerError";
import DeleteEventButton from "@/components/admin/DeleteEventButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEventDate } from "@/lib/events/format";
import { cn } from "@/lib/utils";
import type { Event, EventStatus } from "@/types";

const STATUS_LABELS: Record<EventStatus, string> = {
  published: "Opublikowane",
  draft: "Szkic",
  pending: "Oczekuje",
  rejected: "Odrzucone",
};

function statusBadgeClass(status: EventStatus): string {
  switch (status) {
    case "published":
      return "border-emerald-500/30 bg-emerald-500/20 text-emerald-100";
    case "draft":
      return "border-slate-400/30 bg-slate-400/20 text-slate-100";
    case "pending":
      return "border-amber-500/30 bg-amber-500/20 text-amber-100";
    case "rejected":
      return "border-red-500/30 bg-red-500/20 text-red-100";
  }
}

interface Props {
  events: Event[];
  listError?: string | null;
}

export default function AdminEventsTable({ events, listError }: Props) {
  return (
    <div className="space-y-6">
      <ServerError message={listError} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-3xl font-bold text-transparent">
            Wydarzenia
          </h1>
          <p className="mt-1 text-sm text-blue-100/60">
            {events.length === 0
              ? "Brak wydarzeń w bazie."
              : `Łącznie ${String(events.length)} wydarzeń (sortowanie: od najbliższej daty).`}
          </p>
        </div>
        <Button asChild className="border-white/20 bg-purple-600/80 text-white shadow-lg hover:bg-purple-500/90">
          <a href="/admin/events/new">Dodaj wydarzenie</a>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-blue-100/70 backdrop-blur-xl">
          Nie ma jeszcze żadnych wydarzeń. Kliknij „Dodaj wydarzenie”, aby utworzyć pierwsze.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white backdrop-blur-xl sm:p-6">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-blue-100/80">Nazwa</TableHead>
                <TableHead className="text-blue-100/80">Data</TableHead>
                <TableHead className="text-blue-100/80">Miasto</TableHead>
                <TableHead className="text-blue-100/80">Status</TableHead>
                <TableHead className="text-right text-blue-100/80">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="max-w-[200px] truncate font-medium text-white sm:max-w-xs">
                    {event.name}
                  </TableCell>
                  <TableCell className="text-blue-100/80">{formatEventDate(event.startsAt)}</TableCell>
                  <TableCell className="text-blue-100/80">{event.city}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("border", statusBadgeClass(event.status))}>
                      {STATUS_LABELS[event.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="border-white/20 bg-white/5 text-purple-200 hover:bg-white/10 hover:text-white"
                      >
                        <a href={`/admin/events/${event.id}/edit`}>Edytuj</a>
                      </Button>
                      <DeleteEventButton eventId={event.id} eventName={event.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

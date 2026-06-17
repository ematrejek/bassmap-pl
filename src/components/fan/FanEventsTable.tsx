import FanChangeSuggestionsTable, { type FanChangeSuggestionRow } from "@/components/fan/FanChangeSuggestionsTable";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEventDate } from "@/lib/events/format";
import { STATUS_LABELS, statusBadgeClass } from "@/lib/events/status-labels";
import { shellPanel, shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";

interface Props {
  events: Event[];
  suggestions: FanChangeSuggestionRow[];
  submitted?: boolean;
  suggestionSubmitted?: boolean;
}

export default function FanEventsTable({ events, suggestions, submitted = false, suggestionSubmitted = false }: Props) {
  const hasSuggestions = suggestions.length > 0;
  const hasEvents = events.length > 0;
  const isEmpty = !hasSuggestions && !hasEvents;

  return (
    <div className="space-y-4">
      {suggestionSubmitted ? (
        <p className="border-neon-green/30 bg-neon-green/10 text-foreground rounded-lg border px-4 py-3 text-sm">
          Sugestia wysłana do moderacji.
        </p>
      ) : null}
      {submitted ? (
        <p className="border-neon-green/30 bg-neon-green/10 text-foreground rounded-lg border px-4 py-3 text-sm">
          {hasEvents
            ? "Wysłano do moderacji. Status zgłoszenia zobaczysz w tabeli poniżej."
            : "Wysłano do moderacji. Twoje zgłoszenie pojawi się na liście poniżej ze statusem „Oczekuje”."}
        </p>
      ) : null}

      {hasSuggestions ? <FanChangeSuggestionsTable suggestions={suggestions} /> : null}

      {hasEvents ? (
        <div className={cn("p-4 sm:p-6", shellPanel)}>
          {hasSuggestions ? (
            <p className={cn("mb-4 text-sm font-medium", shellTextMuted)}>Zgłoszone przez Ciebie wydarzenia</p>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow className="border-border/70 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nazwa</TableHead>
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground">Miasto</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} className="border-border/70 hover:bg-secondary/40">
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {isEmpty ? (
        <div className={cn("p-8 text-center", shellPanelFlat, shellTextMuted)}>
          Nie masz jeszcze żadnych zgłoszeń. Dodaj pierwsze wydarzenie – admin je sprawdzi przed publikacją.
        </div>
      ) : null}
    </div>
  );
}

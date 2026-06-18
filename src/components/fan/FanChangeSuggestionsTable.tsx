import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEventDate } from "@/lib/events/format";
import { shellPanel, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { ChangeSuggestionStatus } from "@/types";

export interface FanChangeSuggestionRow {
  id: string;
  eventId: string;
  eventName: string;
  summary: string;
  status: ChangeSuggestionStatus;
  createdAt: string;
}

interface Props {
  suggestions: FanChangeSuggestionRow[];
}

const SUGGESTION_STATUS_LABELS: Record<ChangeSuggestionStatus, string> = {
  pending: "Oczekuje",
  accepted: "Zaakceptowana",
  rejected: "Odrzucona",
};

function suggestionBadgeClass(status: ChangeSuggestionStatus): string {
  switch (status) {
    case "pending":
      return "border-neon-orange/40 bg-neon-orange/15 text-foreground";
    case "accepted":
      return "border-neon-green/40 bg-neon-green/15 text-foreground";
    case "rejected":
      return "border-destructive/40 bg-destructive/15 text-foreground";
  }
}

function truncateBody(body: string, maxLength = 120): string {
  if (body.length <= maxLength) {
    return body;
  }
  return `${body.slice(0, maxLength).trimEnd()}…`;
}

export default function FanChangeSuggestionsTable({ suggestions }: Props) {
  return (
    <div className={cn("p-4 sm:p-6", shellPanel)}>
      <p className={cn("mb-4 text-sm font-medium", shellTextMuted)}>Twoje sugestie zmian do istniejących wydarzeń</p>
      <Table>
        <TableHeader>
          <TableRow className="border-border/70 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Data</TableHead>
            <TableHead className="text-muted-foreground">Wydarzenie</TableHead>
            <TableHead className="text-muted-foreground">Sugestia</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suggestions.map((suggestion) => (
            <TableRow key={suggestion.id} className="border-border/70 hover:bg-secondary/40">
              <TableCell className={shellTextMuted}>{formatEventDate(suggestion.createdAt)}</TableCell>
              <TableCell className="max-w-[180px]">
                <a
                  href={`/events/${suggestion.eventId}`}
                  className="text-primary hover:text-primary/80 truncate font-medium underline-offset-2 hover:underline"
                >
                  {suggestion.eventName || "Wydarzenie"}
                </a>
              </TableCell>
              <TableCell className={cn("max-w-xs text-sm", shellTextMuted)} title={suggestion.summary}>
                {truncateBody(suggestion.summary)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("border", suggestionBadgeClass(suggestion.status))}>
                  {SUGGESTION_STATUS_LABELS[suggestion.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

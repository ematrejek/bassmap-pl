import ChangeSuggestionActions from "@/components/admin/ChangeSuggestionActions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DELETED_USER_AUTHOR_LABEL } from "@/lib/auth/display-name";
import { CHANGE_SUGGESTION_SOURCE_LABELS, type SuggestionEventSnapshot } from "@/lib/events/suggestion-format";
import { formatEventDate } from "@/lib/events/format";
import { ADMIN_PATH } from "@/lib/routes";
import { shellPanel, shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { ChangeSuggestionPayload, ChangeSuggestionSource, ChangeSuggestionStatus } from "@/types";

export interface ChangeSuggestionTableRow {
  id: string;
  eventId: string;
  eventName: string;
  summary: string;
  source: ChangeSuggestionSource;
  body: string | null;
  payload: ChangeSuggestionPayload | null;
  eventSnapshot: SuggestionEventSnapshot;
  status: ChangeSuggestionStatus;
  createdAt: string;
  submitterEmail?: string | null;
  submitterLogin?: string | null;
}

interface Props {
  suggestions: ChangeSuggestionTableRow[];
  emptyMessage?: string;
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

function truncateSummary(summary: string, maxLength = 120): string {
  if (summary.length <= maxLength) {
    return summary;
  }
  return `${summary.slice(0, maxLength).trimEnd()}…`;
}

export default function ChangeSuggestionsTable({ suggestions, emptyMessage = "Brak sugestii zmian." }: Props) {
  if (suggestions.length === 0) {
    return <div className={cn("p-8 text-center", shellPanelFlat, shellTextMuted)}>{emptyMessage}</div>;
  }

  return (
    <div className={cn("p-4 sm:p-6", shellPanel)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border/70 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Data</TableHead>
            <TableHead className="text-muted-foreground">Wydarzenie</TableHead>
            <TableHead className="text-muted-foreground">Źródło</TableHead>
            <TableHead className="text-muted-foreground">Sugestia</TableHead>
            <TableHead className="text-muted-foreground">Autor</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suggestions.map((suggestion) => (
            <TableRow key={suggestion.id} className="border-border/70 hover:bg-secondary/40">
              <TableCell className={shellTextMuted}>{formatEventDate(suggestion.createdAt)}</TableCell>
              <TableCell className="max-w-[180px]">
                <a
                  href={`${ADMIN_PATH}/events/${suggestion.eventId}/edit`}
                  className="text-primary hover:text-primary/80 truncate font-medium underline-offset-2 hover:underline"
                >
                  {suggestion.eventName || "Wydarzenie"}
                </a>
              </TableCell>
              <TableCell className={shellTextMuted}>{CHANGE_SUGGESTION_SOURCE_LABELS[suggestion.source]}</TableCell>
              <TableCell className={cn("max-w-xs text-sm", shellTextMuted)} title={suggestion.summary}>
                {truncateSummary(suggestion.summary)}
              </TableCell>
              <TableCell className="max-w-[180px]">
                {suggestion.submitterLogin || suggestion.submitterEmail ? (
                  <div className="flex flex-col gap-0.5">
                    {suggestion.submitterLogin ? (
                      <span className="text-primary font-mono text-sm">@{suggestion.submitterLogin}</span>
                    ) : null}
                    {suggestion.submitterEmail ? (
                      <span className={cn("truncate text-xs", shellTextMuted)}>{suggestion.submitterEmail}</span>
                    ) : null}
                  </div>
                ) : (
                  <span className={shellTextMuted}>{DELETED_USER_AUTHOR_LABEL}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("border", suggestionBadgeClass(suggestion.status))}>
                  {SUGGESTION_STATUS_LABELS[suggestion.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <ChangeSuggestionActions
                  suggestionId={suggestion.id}
                  eventId={suggestion.eventId}
                  eventName={suggestion.eventName}
                  status={suggestion.status}
                  source={suggestion.source}
                  body={suggestion.body}
                  payload={suggestion.payload}
                  eventSnapshot={suggestion.eventSnapshot}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

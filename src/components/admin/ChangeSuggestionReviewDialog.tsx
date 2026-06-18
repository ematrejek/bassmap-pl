import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { readApiError } from "@/lib/api/json";
import { buildSuggestionReviewRows, type SuggestionEventSnapshot } from "@/lib/events/suggestion-format";
import { shellBtnPrimary, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { ChangeSuggestionPayload } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestionId: string;
  eventName: string;
  body: string | null;
  payload: ChangeSuggestionPayload | null;
  eventSnapshot: SuggestionEventSnapshot;
}

export default function ChangeSuggestionReviewDialog({
  open,
  onOpenChange,
  suggestionId,
  eventName,
  body,
  payload,
  eventSnapshot,
}: Props) {
  const [busy, setBusy] = useState<"apply" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reviewRows = payload ? buildSuggestionReviewRows(payload, eventSnapshot) : [];
  const comment = body?.trim() ?? "";

  async function postApply() {
    setBusy("apply");
    setError(null);

    try {
      const response = await fetch(`/api/admin/change-suggestions/${suggestionId}/apply`, {
        method: "POST",
        credentials: "include",
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się zastosować sugestii");
        setBusy(null);
        return;
      }

      window.location.reload();
    } catch {
      setError("Nie udało się zastosować sugestii. Spróbuj ponownie.");
      setBusy(null);
    }
  }

  async function postReject() {
    setBusy("reject");
    setError(null);

    try {
      const response = await fetch(`/api/admin/change-suggestions/${suggestionId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "rejected" }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się odrzucić sugestii");
        setBusy(null);
        return;
      }

      window.location.reload();
    } catch {
      setError("Nie udało się odrzucić sugestii. Spróbuj ponownie.");
      setBusy(null);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Podgląd sugestii zmian</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p className="text-sm text-blue-100/80">
                Wydarzenie: <strong className="text-foreground">{eventName}</strong>
              </p>

              {reviewRows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/70 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Pole</TableHead>
                      <TableHead className="text-muted-foreground">Obecnie</TableHead>
                      <TableHead className="text-muted-foreground">Proponowane</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewRows.map((row) => (
                      <TableRow key={row.label} className="border-border/70 hover:bg-secondary/40">
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <TableCell className={cn("max-w-[200px] text-sm", shellTextMuted)}>{row.current}</TableCell>
                        <TableCell className="max-w-[200px] text-sm">{row.proposed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className={cn("text-sm", shellTextMuted)}>Brak pól do porównania.</p>
              )}

              {comment ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Komentarz fana</p>
                  <p className={cn("text-sm whitespace-pre-wrap", shellTextMuted)}>{comment}</p>
                </div>
              ) : null}

              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={busy !== null}
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
          >
            Zamknij
          </AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null}
            className="border-destructive/40 bg-destructive/10 text-foreground hover:bg-destructive/20"
            onClick={() => {
              void postReject();
            }}
          >
            {busy === "reject" ? "Odrzucanie…" : "Odrzuć"}
          </Button>
          <Button
            type="button"
            disabled={busy !== null || reviewRows.length === 0}
            className={shellBtnPrimary}
            onClick={() => {
              void postApply();
            }}
          >
            {busy === "apply" ? "Przyjmowanie…" : "Przyjmij"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

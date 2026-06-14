import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { readApiError } from "@/lib/api/json";
import { ServerError } from "@/components/auth/ServerError";

interface Props {
  eventId: string;
  eventName: string;
}

export default function DeleteEventButton({ eventId, eventName }: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.status === 204) {
        window.location.reload();
        return;
      }

      const data: unknown = await response.json();
      setError(readApiError(data) ?? "Nie udało się usunąć wydarzenia");
    } catch {
      setError("Nie udało się usunąć wydarzenia. Spróbuj ponownie.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-red-100"
        >
          Usuń
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usunąć wydarzenie?</AlertDialogTitle>
          <AlertDialogDescription>
            Czy na pewno usunąć „{eventName}”? Tej operacji nie można cofnąć.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <div className="py-2">
            <ServerError message={error} />
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleting}
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
          >
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            className="bg-red-600 text-white hover:bg-red-500"
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            {deleting ? "Usuwanie…" : "Usuń"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { useState } from "react";
import { readApiError } from "@/lib/api/json";
import { Button } from "@/components/ui/button";
import { shellBtnOutline } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";

interface Props {
  suggestionId: string;
  status: "pending" | "accepted" | "rejected";
}

export default function ChangeSuggestionActions({ suggestionId, status }: Props) {
  const [busy, setBusy] = useState<"accepted" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "pending") {
    return <span className={cn("text-xs", "text-muted-foreground")}>–</span>;
  }

  async function patchStatus(nextStatus: "accepted" | "rejected") {
    setBusy(nextStatus);
    setError(null);

    try {
      const response = await fetch(`/api/admin/change-suggestions/${suggestionId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się zmienić statusu sugestii");
        setBusy(null);
        return;
      }

      window.location.reload();
    } catch {
      setError("Nie udało się zmienić statusu sugestii. Spróbuj ponownie.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null}
          className={cn(shellBtnOutline, "border-neon-green/40 bg-neon-green/10 hover:bg-neon-green/20")}
          onClick={() => {
            void patchStatus("accepted");
          }}
        >
          {busy === "accepted" ? "Przyjmowanie…" : "Przyjmij"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null}
          className="border-destructive/40 bg-destructive/10 text-foreground hover:bg-destructive/20"
          onClick={() => {
            void patchStatus("rejected");
          }}
        >
          {busy === "rejected" ? "Odrzucanie…" : "Odrzuć"}
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { readApiError } from "@/lib/api/json";
import { Button } from "@/components/ui/button";
import { shellBtnOutline } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";

interface Props {
  eventId: string;
}

export default function EventModerationActions({ eventId }: Props) {
  const [busy, setBusy] = useState<"published" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchStatus(status: "published" | "rejected") {
    setBusy(status);
    setError(null);

    try {
      const response = await fetch(`/api/admin/events/${eventId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się zmienić statusu");
        setBusy(null);
        return;
      }

      window.location.reload();
    } catch {
      setError("Nie udało się zmienić statusu. Spróbuj ponownie.");
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
            void patchStatus("published");
          }}
        >
          {busy === "published" ? "Publikowanie…" : "Opublikuj"}
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

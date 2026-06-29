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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readApiError } from "@/lib/api/json";
import { shellBtnOutline, shellBtnPrimary, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { OrganizerApplicationStatus } from "@/types";

interface Props {
  applicationId: string;
  status: OrganizerApplicationStatus;
}

export default function OrganizerApplicationActions({ applicationId, status }: Props) {
  const [busy, setBusy] = useState<"issue" | "approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function handleIssueCode() {
    setBusy("issue");
    setError(null);

    try {
      const response = await fetch(`/api/admin/organizer-applications/${applicationId}/issue-code`, {
        method: "POST",
        credentials: "include",
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się wygenerować kodu");
        setBusy(null);
        return;
      }

      const parsed = data as { code: string };
      setIssuedCode(parsed.code);
      setCodeDialogOpen(true);
      setBusy(null);
    } catch {
      setError("Nie udało się wygenerować kodu. Spróbuj ponownie.");
      setBusy(null);
    }
  }

  async function handleApprove() {
    setBusy("approve");
    setError(null);

    try {
      const response = await fetch(`/api/admin/organizer-applications/${applicationId}/approve`, {
        method: "POST",
        credentials: "include",
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się zatwierdzić wniosku");
        setBusy(null);
        return;
      }

      window.location.reload();
    } catch {
      setError("Nie udało się zatwierdzić wniosku. Spróbuj ponownie.");
      setBusy(null);
    }
  }

  async function handleReject() {
    setBusy("reject");
    setError(null);

    try {
      const response = await fetch(`/api/admin/organizer-applications/${applicationId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() ? rejectReason.trim() : null }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się odrzucić wniosku");
        setBusy(null);
        return;
      }

      window.location.reload();
    } catch {
      setError("Nie udało się odrzucić wniosku. Spróbuj ponownie.");
      setBusy(null);
    }
  }

  function handleCodeDialogChange(open: boolean) {
    setCodeDialogOpen(open);
    if (!open && issuedCode) {
      window.location.reload();
    }
  }

  if (status === "approved" || status === "rejected") {
    return <span className={cn("text-xs", shellTextMuted)}>–</span>;
  }

  const canIssueCode = status === "pending" || status === "code_issued";
  const canDecide = status === "code_verified";

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
        <div className="flex flex-wrap justify-end gap-2">
          {canIssueCode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              className={cn(shellBtnOutline, "border-primary/40 bg-primary/10 hover:bg-primary/20")}
              onClick={() => {
                void handleIssueCode();
              }}
            >
              {busy === "issue" ? "Generowanie…" : "Generuj kod"}
            </Button>
          ) : null}
          {canDecide ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                className={cn(shellBtnOutline, "border-neon-green/40 bg-neon-green/10 hover:bg-neon-green/20")}
                onClick={() => {
                  void handleApprove();
                }}
              >
                {busy === "approve" ? "Zatwierdzanie…" : "Zatwierdź"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                className="border-destructive/40 bg-destructive/10 text-foreground hover:bg-destructive/20"
                onClick={() => {
                  setRejectDialogOpen(true);
                }}
              >
                Odrzuć
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <AlertDialog open={codeDialogOpen} onOpenChange={handleCodeDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kod weryfikacyjny</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p className={cn("text-sm", shellTextMuted)}>
                  Wyślij ten kod ręcznie z oficjalnego konta BassMap PL na wskazany profil Facebook lub Instagram.
                  Użytkownik wpisze go w aplikacji. Kod wyświetla się tylko raz.
                </p>
                <p className="text-foreground bg-secondary/60 rounded-lg border px-4 py-3 text-center font-mono text-2xl tracking-[0.3em]">
                  {issuedCode}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zamknij</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odrzuć wniosek</AlertDialogTitle>
            <AlertDialogDescription>
              Opcjonalnie podaj powód odrzucenia – użytkownik zobaczy go na swoim profilu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor={`reject-reason-${applicationId}`} className="text-muted-foreground text-xs uppercase">
              Powód (opcjonalnie)
            </Label>
            <Textarea
              id={`reject-reason-${applicationId}`}
              className="mt-2 min-h-24"
              value={rejectReason}
              onChange={(event) => {
                setRejectReason(event.target.value);
              }}
              maxLength={1000}
              placeholder="np. Profil nie wygląda na oficjalny"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "reject"}>Anuluj</AlertDialogCancel>
            <Button
              type="button"
              className={shellBtnPrimary}
              disabled={busy === "reject"}
              onClick={() => {
                void handleReject();
              }}
            >
              {busy === "reject" ? "Odrzucanie…" : "Odrzuć wniosek"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

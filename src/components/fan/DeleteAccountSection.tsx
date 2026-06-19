import { useState } from "react";
import { ServerError } from "@/components/auth/ServerError";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readApiError } from "@/lib/api/json";
import { HOME_PATH } from "@/lib/routes";
import { shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPassword("");
      setError(null);
      setDeleting(false);
    }
  }

  async function handleDelete() {
    if (!password.trim()) {
      setError("Podaj hasło");
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/fan/account/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.status === 204) {
        window.location.href = `${HOME_PATH}?accountDeleted=1`;
        return;
      }

      const data: unknown = await response.json();
      setError(readApiError(data) ?? "Nie udało się usunąć konta");
    } catch {
      setError("Nie udało się usunąć konta. Spróbuj ponownie.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="border-border relative border-t py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className={cn("mx-auto max-w-2xl rounded-2xl border border-red-400/20 p-6", shellPanelFlat)}>
          <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">Strefa konta</h2>
          <p className={cn("mt-2 text-sm leading-relaxed", shellTextMuted)}>
            Możesz trwale usunąć konto i dane logowania. Publiczne komentarze mogą pozostać widoczne z oznaczeniem
            „Usunięty użytkownik”. Zgłoszenia wydarzeń i sugestie zmian stracą powiązanie z Twoim kontem – zgodnie z{" "}
            <a href="/privacy-policy" className="text-primary hover:underline">
              polityką prywatności
            </a>
            .
          </p>

          <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="mt-6 border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-red-100"
              >
                Usuń konto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Trwale usunąć konto?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-left text-sm">
                    <p>Ta operacja jest nieodwracalna. Po usunięciu:</p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li>nie będziesz mógł się zalogować tym adresem e-mail,</li>
                      <li>Twoje komentarze mogą pozostać z etykietą „Usunięty użytkownik”,</li>
                      <li>zgłoszenia i sugestie stracą powiązanie z kontem.</li>
                    </ul>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2 py-2">
                <Label htmlFor="delete-account-password">Potwierdź hasłem</Label>
                <Input
                  id="delete-account-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  disabled={deleting}
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                />
              </div>

              {error ? (
                <div className="py-1">
                  <ServerError message={error} />
                </div>
              ) : null}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  className="bg-red-600 text-white hover:bg-red-500"
                  onClick={(event) => {
                    event.preventDefault();
                    void handleDelete();
                  }}
                >
                  {deleting ? "Usuwanie…" : "Trwale usuń konto"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  );
}

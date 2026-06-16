import { useState } from "react";
import { Mail, MessageSquare, Send, User } from "lucide-react";

import { FormField } from "@/components/auth/FormField";
import { readApiError } from "@/lib/api/json";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import { PRIVACY_POLICY_PATH } from "@/lib/legal/paths";
import { shellBtnPrimary, shellTextMuted } from "@/lib/shell-styles";
import { CONTACT_EMAIL } from "@/lib/routes";
import { cn } from "@/lib/utils";

export default function ReportIssueForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!email.trim()) {
      next.email = "Podaj adres e-mail";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Podaj poprawny adres e-mail";
    }
    if (!message.trim()) {
      next.message = "Opisz problem";
    } else if (message.trim().length < 10) {
      next.message = "Wiadomość musi mieć co najmniej 10 znaków";
    }
    if (name.trim().length > 120) {
      next.name = "Imię lub nick może mieć maksymalnie 120 znaków";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact/report-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          message: message.trim(),
          name: name.trim() || undefined,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setServerError(readApiError(data) ?? "Nie udało się wysłać zgłoszenia");
        return;
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setServerError("Nie udało się wysłać zgłoszenia. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-foreground font-medium">Dziękujemy – wiadomość została wysłana.</p>
        <p className={cn("text-sm", shellTextMuted)}>Odpowiemy na podany adres e-mail, gdy to będzie możliwe.</p>
        <button
          type="button"
          className="text-primary hover:text-accent text-sm underline"
          onClick={() => {
            setSuccess(false);
          }}
        >
          Wyślij kolejne zgłoszenie
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <FormField
        id="name"
        label="Imię lub nick (opcjonalnie)"
        value={name}
        onChange={setName}
        placeholder="np. Ania"
        error={errors.name}
        icon={<User className="size-4" />}
      />

      <FormField
        id="email"
        type="email"
        label="Twój e-mail"
        value={email}
        onChange={setEmail}
        placeholder="ty@example.com"
        error={errors.email}
        icon={<Mail className="size-4" />}
      />

      <div className="space-y-2">
        <label htmlFor="message" className="text-foreground/90 text-sm font-medium">
          Treść zgłoszenia
        </label>
        <div className="relative">
          <MessageSquare className="text-muted-foreground pointer-events-none absolute top-3 left-3 size-4" />
          <textarea
            id="message"
            name="message"
            rows={6}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (errors.message) {
                setErrors((prev) => ({ ...prev, message: undefined }));
              }
            }}
            placeholder="Opisz problem lub sugestię…"
            className={cn(
              "border-border bg-card/60 text-foreground placeholder:text-muted-foreground w-full resize-y rounded-lg border py-2 pr-3 pl-10 text-sm",
              "focus-visible:border-primary/70 focus-visible:ring-ring/30 focus-visible:ring-2 focus-visible:outline-none",
              errors.message && "border-red-500/50",
            )}
          />
        </div>
        {errors.message ? <p className="text-sm text-red-300">{errors.message}</p> : null}
      </div>

      <ServerError message={serverError} />

      <p className={cn("text-xs leading-relaxed", shellTextMuted)}>
        Administratorem danych z tego formularza jest Emilia Matrejek. Przetwarzamy Twój e-mail, opcjonalnie imię lub
        nick oraz treść wiadomości wyłącznie po to, żeby odpowiedzieć na zgłoszenie (podstawa: prawnie uzasadniony
        interes – art. 6 ust. 1 lit. f RODO). E-mail i treść są <strong className="text-foreground/80">wymagane</strong>{" "}
        do wysłania formularza; imię lub nick jest dobrowolne. Wiadomość nie trafia do bazy Serwisu – jest wysyłana na
        skrzynkę Administratora. Więcej informacji:{" "}
        <a
          href={PRIVACY_POLICY_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-accent underline"
        >
          Polityka prywatności
        </a>
        .
      </p>

      <Button type="submit" disabled={submitting} className={cn("w-full rounded-lg px-4 py-2", shellBtnPrimary)}>
        {submitting ? (
          <span className="flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Wysyłanie…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Send className="size-4" />
            Wyślij zgłoszenie
          </span>
        )}
      </Button>

      <p className={cn("text-center text-xs", shellTextMuted)}>
        Możesz też napisać bezpośrednio:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:text-accent underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </form>
  );
}

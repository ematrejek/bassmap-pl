import { useState } from "react";
import { ServerError } from "@/components/auth/ServerError";
import { Equalizer } from "@/components/shell/Equalizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readApiError } from "@/lib/api/json";
import { PRIVACY_POLICY_PATH } from "@/lib/legal/paths";
import { shellBtnPrimary, shellLink, shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { OrganizerApplication, OrganizerApplicationStatus, OrganizerSocialPlatform } from "@/types";

const inputClass =
  "w-full rounded-xl border border-border bg-input/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/70 focus:ring-1 focus:ring-primary/40";

const labelClass = "mb-1.5 block font-mono text-xs font-semibold tracking-widest text-muted-foreground uppercase";

const STATUS_MESSAGES: Record<OrganizerApplicationStatus, string> = {
  pending: "Wniosek został złożony. Administrator wyśle kod weryfikacyjny na Twój profil w mediach społecznościowych.",
  code_issued:
    "Kod został wygenerowany. Sprawdź wiadomość od BassMap PL na wskazanym profilu Facebook lub Instagram i wpisz kod poniżej.",
  code_verified: "Kod jest poprawny. Wniosek oczekuje na finalną decyzję administratora.",
  approved: "Jesteś zweryfikowanym organizatorem. Możesz korzystać ze strefy fana jak dotychczas.",
  rejected: "Wniosek został odrzucony. Możesz złożyć nowy wniosek po zapoznaniu się z powodem.",
};

interface Props {
  initialApplication: OrganizerApplication | null;
  initialIsOrganizer: boolean;
}

export default function OrganizerApplicationSection({ initialApplication, initialIsOrganizer }: Props) {
  const [application, setApplication] = useState<OrganizerApplication | null>(initialApplication);
  const [isOrganizer] = useState(initialIsOrganizer);
  const [showForm, setShowForm] = useState(!initialApplication && !initialIsOrganizer);

  const [businessName, setBusinessName] = useState("");
  const [socialPlatform, setSocialPlatform] = useState<OrganizerSocialPlatform>("instagram");
  const [socialProfileUrl, setSocialProfileUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/fan/organizer-application", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          socialPlatform,
          socialProfileUrl,
          description: description.trim() ? description : null,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setSubmitError(readApiError(data) ?? "Nie udało się złożyć wniosku");
        return;
      }

      const parsed = data as { application: OrganizerApplication };
      setApplication(parsed.application);
      setShowForm(false);
      setVerificationCode("");
      setVerifyError(null);
    } catch {
      setSubmitError("Nie udało się złożyć wniosku. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    if (!application) {
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    try {
      const response = await fetch("/api/fan/organizer-application/verify-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          code: verificationCode,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        setVerifyError(readApiError(data) ?? "Nie udało się zweryfikować kodu");
        return;
      }

      const parsed = data as { application: OrganizerApplication };
      setApplication(parsed.application);
      setVerificationCode("");
    } catch {
      setVerifyError("Nie udało się zweryfikować kodu. Spróbuj ponownie.");
    } finally {
      setVerifying(false);
    }
  }

  function handleResubmit() {
    setShowForm(true);
    setSubmitError(null);
    setVerifyError(null);
    if (application) {
      setBusinessName(application.businessName);
      setSocialPlatform(application.socialPlatform);
      setSocialProfileUrl(application.socialProfileUrl);
      setDescription(application.description ?? "");
    }
  }

  const showStatusCard = !showForm && (application !== null || isOrganizer);
  const showCodeForm = application?.status === "code_issued";
  const canResubmit = application?.status === "rejected" && !isOrganizer;

  return (
    <section id="organizer" className="border-border relative border-t py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-3">
          <Equalizer bars={4} className="text-primary h-4" />
          <h2 className="font-heading text-foreground text-2xl font-bold tracking-tight uppercase md:text-3xl">
            Status <span className="text-primary text-glow-violet">organizatora</span>
          </h2>
        </div>
        <p className={cn("mt-3 max-w-2xl text-sm leading-relaxed", shellTextMuted)}>
          Złóż wniosek o weryfikację organizatora, aby w przyszłości publikować wydarzenia bez moderacji. Weryfikacja
          wymaga potwierdzenia profilu w mediach społecznościowych.
        </p>

        {showForm ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
            className={cn("mt-8 max-w-2xl space-y-5 rounded-2xl border p-6", shellPanelFlat)}
          >
            <div>
              <Label htmlFor="organizer-business-name" className={labelClass}>
                Nazwa organizatora
              </Label>
              <Input
                id="organizer-business-name"
                className={inputClass}
                value={businessName}
                onChange={(event) => {
                  setBusinessName(event.target.value);
                }}
                placeholder="np. BassMap Events"
                required
                maxLength={120}
              />
            </div>

            <div>
              <Label htmlFor="organizer-platform" className={labelClass}>
                Platforma
              </Label>
              <select
                id="organizer-platform"
                className={inputClass}
                value={socialPlatform}
                onChange={(event) => {
                  setSocialPlatform(event.target.value as OrganizerSocialPlatform);
                }}
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>

            <div>
              <Label htmlFor="organizer-profile-url" className={labelClass}>
                Link do profilu
              </Label>
              <Input
                id="organizer-profile-url"
                className={inputClass}
                value={socialProfileUrl}
                onChange={(event) => {
                  setSocialProfileUrl(event.target.value);
                }}
                placeholder={socialPlatform === "instagram" ? "instagram.com/twoj_profil" : "facebook.com/twoj-profil"}
                required
                maxLength={500}
              />
            </div>

            <div>
              <Label htmlFor="organizer-description" className={labelClass}>
                Opis (opcjonalnie)
              </Label>
              <Textarea
                id="organizer-description"
                className={cn(inputClass, "min-h-24 resize-y")}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
                placeholder="Krótko opisz swoją działalność jako organizator"
                maxLength={1000}
              />
            </div>

            <p className={cn("text-xs leading-relaxed", shellTextMuted)}>
              Wysyłając wniosek, potwierdzasz zapoznanie się z{" "}
              <a href={PRIVACY_POLICY_PATH} className={cn(shellLink, "hover:underline")}>
                polityką prywatności
              </a>{" "}
              w zakresie danych wniosku organizatora.
            </p>

            {submitError ? <ServerError message={submitError} /> : null}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className={shellBtnPrimary} disabled={submitting}>
                {submitting ? "Wysyłanie…" : "Wyślij wniosek"}
              </Button>
              {application ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setSubmitError(null);
                  }}
                >
                  Anuluj
                </Button>
              ) : null}
            </div>
          </form>
        ) : null}

        {showStatusCard ? (
          <div className={cn("mt-8 max-w-2xl space-y-4 rounded-2xl border p-6", shellPanelFlat)}>
            <p className="text-foreground text-sm leading-relaxed">
              {isOrganizer ? STATUS_MESSAGES.approved : STATUS_MESSAGES[application?.status ?? "pending"]}
            </p>

            {application ? (
              <dl className={cn("grid gap-2 text-sm", shellTextMuted)}>
                <div>
                  <dt className="text-muted-foreground font-mono text-xs uppercase">Nazwa</dt>
                  <dd className="text-foreground">{application.businessName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-mono text-xs uppercase">Profil</dt>
                  <dd>
                    <a
                      href={application.socialProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(shellLink, "hover:underline")}
                    >
                      {application.socialProfileUrl}
                    </a>
                  </dd>
                </div>
                {application.decisionReason ? (
                  <div>
                    <dt className="text-muted-foreground font-mono text-xs uppercase">Powód odrzucenia</dt>
                    <dd className="text-foreground">{application.decisionReason}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {showCodeForm ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleVerifyCode();
                }}
                className="border-border/60 space-y-3 border-t pt-4"
              >
                <div>
                  <Label htmlFor="organizer-verification-code" className={labelClass}>
                    Kod weryfikacyjny
                  </Label>
                  <Input
                    id="organizer-verification-code"
                    className={cn(inputClass, "max-w-xs font-mono tracking-widest uppercase")}
                    value={verificationCode}
                    onChange={(event) => {
                      setVerificationCode(event.target.value.toUpperCase());
                    }}
                    placeholder="np. A3K7M2NP"
                    minLength={6}
                    maxLength={8}
                    required
                    autoComplete="off"
                  />
                </div>
                {verifyError ? <ServerError message={verifyError} /> : null}
                <Button type="submit" className={shellBtnPrimary} disabled={verifying}>
                  {verifying ? "Sprawdzanie…" : "Potwierdź kod"}
                </Button>
              </form>
            ) : null}

            {canResubmit ? (
              <Button type="button" variant="outline" onClick={handleResubmit}>
                Złóż ponownie
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

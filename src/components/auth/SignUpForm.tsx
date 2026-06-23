import { CircleAlert, Lock, Mail, UserPlus } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";
import { PRIVACY_POLICY_PATH, TERMS_PATH } from "@/lib/legal/paths";
import { cn } from "@/lib/utils";
import { useState, type SubmitEvent } from "react";

const MIN_PASSWORD_LENGTH = 6;

interface Props {
  serverError?: string | null;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

export default function SignUpForm({ serverError }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  function validate() {
    const next: FormErrors = {};

    if (!email.trim()) {
      next.email = "Podaj adres e-mail";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Podaj poprawny adres e-mail";
    }

    if (!password) {
      next.password = "Podaj hasło";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków`;
    }

    if (!confirmPassword) {
      next.confirmPassword = "Powtórz hasło";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "Hasła nie są identyczne";
    }

    if (!acceptTerms) {
      next.acceptTerms = "Musisz zaakceptować Regulamin i Politykę Prywatności";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function clearError(field: keyof FormErrors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    if (!validate()) {
      e.preventDefault();
    }
  }

  const remainingChars = MIN_PASSWORD_LENGTH - password.length;
  const passwordHint =
    !errors.password && password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? (
      <p className="text-muted-foreground mt-1 text-xs">
        Jeszcze {remainingChars} {remainingChars === 1 ? "znak" : remainingChars < 5 ? "znaki" : "znaków"}
      </p>
    ) : undefined;

  return (
    <form method="POST" action="/api/auth/signup" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <FormField
        id="email"
        type="email"
        label="E-mail"
        value={email}
        onChange={(v) => {
          setEmail(v);
          clearError("email");
        }}
        placeholder="twoj@email.pl"
        error={errors.email}
        icon={<Mail className="size-4" />}
      />

      <FormField
        id="password"
        label="Hasło"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(v) => {
          setPassword(v);
          clearError("password");
        }}
        placeholder="Min. 6 znaków"
        error={errors.password}
        hint={passwordHint}
        icon={<Lock className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showPassword}
            onToggle={() => {
              setShowPassword(!showPassword);
            }}
          />
        }
      />

      <FormField
        id="confirmPassword"
        name="confirmPassword"
        label="Powtórz hasło"
        type={showConfirmPassword ? "text" : "password"}
        value={confirmPassword}
        onChange={(v) => {
          setConfirmPassword(v);
          clearError("confirmPassword");
        }}
        placeholder="Wpisz hasło ponownie"
        error={errors.confirmPassword}
        icon={<Lock className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showConfirmPassword}
            onToggle={() => {
              setShowConfirmPassword(!showConfirmPassword);
            }}
          />
        }
      />

      <div>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="acceptTerms"
            checked={acceptTerms}
            onChange={(e) => {
              setAcceptTerms(e.target.checked);
              clearError("acceptTerms");
            }}
            aria-invalid={Boolean(errors.acceptTerms)}
            className={cn(
              "border-border bg-card/60 text-primary mt-0.5 size-4 shrink-0 cursor-pointer rounded-[4px] border accent-[var(--primary)]",
              errors.acceptTerms && "border-red-400/60",
            )}
          />
          <input type="hidden" name="acceptTerms" value={acceptTerms ? "on" : ""} />
          <label htmlFor="acceptTerms" className="text-muted-foreground text-xs leading-relaxed">
            <span className="text-red-400" aria-hidden="true">
              *{" "}
            </span>
            Akceptuję{" "}
            <a
              href={TERMS_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-accent hover:underline"
            >
              Regulamin
            </a>{" "}
            i{" "}
            <a
              href={PRIVACY_POLICY_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-accent hover:underline"
            >
              Politykę Prywatności
            </a>
          </label>
        </div>
        {errors.acceptTerms ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-300">
            <CircleAlert className="size-3" />
            {errors.acceptTerms}
          </p>
        ) : null}
      </div>

      <ServerError message={serverError} />

      <SubmitButton pendingText="Tworzenie konta…" icon={<UserPlus className="size-4" />}>
        Utwórz konto
      </SubmitButton>
    </form>
  );
}

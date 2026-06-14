import React, { useState } from "react";
import { CircleAlert, Lock, Mail, UserPlus } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";
import { Checkbox } from "@/components/ui/checkbox";
import { PRIVACY_POLICY_PATH, TERMS_PATH } from "@/lib/legal/paths";
import { cn } from "@/lib/utils";

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
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Enter a valid email address";
    }

    if (!password) {
      next.password = "Password is required";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "Passwords do not match";
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

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    if (!validate()) {
      e.preventDefault();
    }
  }

  const passwordHint =
    !errors.password && password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? (
      <p className="text-muted-foreground mt-1 text-xs">
        {MIN_PASSWORD_LENGTH - password.length} more character
        {MIN_PASSWORD_LENGTH - password.length !== 1 ? "s" : ""} needed
      </p>
    ) : undefined;

  return (
    <form method="POST" action="/api/auth/signup" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <FormField
        id="email"
        type="email"
        label="Email"
        value={email}
        onChange={(v) => {
          setEmail(v);
          clearError("email");
        }}
        placeholder="you@example.com"
        error={errors.email}
        icon={<Mail className="size-4" />}
      />

      <FormField
        id="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(v) => {
          setPassword(v);
          clearError("password");
        }}
        placeholder="Min. 6 characters"
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
        label="Confirm password"
        type={showConfirmPassword ? "text" : "password"}
        value={confirmPassword}
        onChange={(v) => {
          setConfirmPassword(v);
          clearError("confirmPassword");
        }}
        placeholder="Re-enter your password"
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
          <Checkbox
            id="acceptTerms"
            checked={acceptTerms}
            onCheckedChange={(checked) => {
              setAcceptTerms(checked === true);
              clearError("acceptTerms");
            }}
            aria-invalid={Boolean(errors.acceptTerms)}
            className={cn(
              "border-border bg-card/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary mt-0.5",
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

      <SubmitButton pendingText="Creating account..." icon={<UserPlus className="size-4" />}>
        Create account
      </SubmitButton>
    </form>
  );
}

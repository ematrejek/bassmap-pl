/** Map Supabase Auth errors to Polish copy for the signup form. */
export function mapSignupErrorMessage(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("already registered") || lower.includes("user already exists")) {
    return "Ten adres e-mail jest już zarejestrowany. Zaloguj się lub użyj innego adresu.";
  }

  if (lower.includes("password")) {
    return "Hasło nie spełnia wymagań bezpieczeństwa (min. 6 znaków).";
  }

  if (lower.includes("invalid email")) {
    return "Podaj poprawny adres e-mail.";
  }

  return message;
}

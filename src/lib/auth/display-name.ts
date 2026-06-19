/** Public author label after account deletion (FR-022). */
export const DELETED_USER_AUTHOR_LABEL = "Usunięty użytkownik";

/** Public display label derived from account email (same heuristic as fan profile). */
export function authorLabelFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const displayName =
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ") || "Fan";

  return displayName;
}

export function loginFromEmailLocalPart(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

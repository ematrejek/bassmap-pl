export const PRIVACY_POLICY_PATH = "/privacy-policy";
export const TERMS_PATH = "/terms";

/** Legacy Polish slugs – 301 redirect in middleware. */
export const LEGACY_PRIVACY_POLICY_PATH = "/polityka-prywatnosci";
export const LEGACY_TERMS_PATH = "/regulamin";

export const LEGACY_LEGAL_REDIRECTS: Record<string, string> = {
  [LEGACY_PRIVACY_POLICY_PATH]: PRIVACY_POLICY_PATH,
  [LEGACY_TERMS_PATH]: TERMS_PATH,
};

export const LEGAL_UPDATED_AT = "17 czerwca 2026 r.";

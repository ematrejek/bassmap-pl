export const FAN_CONTENT_RIGHTS_FIELD = "acceptContentRights";

export function fanDescriptionConsentAccepted(body: unknown): boolean {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }

  const record = body as Record<string, unknown>;
  return record[FAN_CONTENT_RIGHTS_FIELD] === true;
}

export function stripFanSubmitConsent(body: unknown): { payload: unknown; accepted: boolean } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { payload: body, accepted: false };
  }

  const record = body as Record<string, unknown>;
  const accepted = fanDescriptionConsentAccepted(body);
  const { [FAN_CONTENT_RIGHTS_FIELD]: _consent, ...payload } = record;

  return { payload, accepted };
}

/** ISO timestamp for DB when fan accepted description rights at create time. */
export function descriptionRightsAcceptedTimestamp(accepted: boolean): string | null {
  return accepted ? new Date().toISOString() : null;
}

export const FAN_CONTENT_RIGHTS_FIELD = "acceptContentRights";

export function stripFanSubmitConsent(body: unknown): { payload: unknown; accepted: boolean } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { payload: body, accepted: false };
  }

  const record = { ...(body as Record<string, unknown>) };
  const accepted = record[FAN_CONTENT_RIGHTS_FIELD] === true;
  delete record[FAN_CONTENT_RIGHTS_FIELD];

  return { payload: record, accepted };
}

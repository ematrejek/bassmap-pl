export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readApiError(value: unknown): string | undefined {
  if (isRecord(value) && typeof value.error === "string") {
    return value.error;
  }
  return undefined;
}

export function readCreatedEventId(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const event = value.event;
  if (!isRecord(event) || typeof event.id !== "string") {
    return undefined;
  }
  return event.id;
}

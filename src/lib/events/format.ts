const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return EVENT_DATE_FORMATTER.format(date);
}

/** ISO → wartość dla `<input type="datetime-local">` w strefie Europe/Warsaw. */
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

const DATETIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function getTimezoneOffsetMs(utcTimestamp: number, timeZone: string): number {
  const date = new Date(utcTimestamp);
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const toUtcMs = (parts: Intl.DateTimeFormatPart[]) => {
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  };

  const utcParts = new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).formatToParts(date);
  const tzParts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);

  return toUtcMs(tzParts) - toUtcMs(utcParts);
}

/** Wartość z `<input type="datetime-local">` (czas warszawski) → ISO UTC. */
export function parseDatetimeLocalWarsaw(value: string): string | null {
  const match = DATETIME_LOCAL_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  let timestamp = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 3; attempt++) {
    const offsetMs = getTimezoneOffsetMs(timestamp, "Europe/Warsaw");
    const candidate = Date.UTC(year, month - 1, day, hour, minute) - offsetMs;
    if (candidate === timestamp) {
      break;
    }
    timestamp = candidate;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

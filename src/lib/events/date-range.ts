import type { FanEventFilters } from "@/lib/events/fan-schema";
import { getStartOfTodayWarsawUtcIso, parseDatetimeLocalWarsaw } from "@/lib/events/format";

export const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ISO_WEEKDAY: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export function isValidCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const parsed = new Date(utc);

  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return false;
  }

  return startOfWarsawCalendarDayUtcIso(value) !== null;
}

export function getWarsawCalendarDate(reference: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(reference);
}

export function startOfWarsawCalendarDayUtcIso(yyyyMmDd: string): string | null {
  return parseDatetimeLocalWarsaw(`${yyyyMmDd}T00:00`);
}

function addCalendarDays(yyyyMmDd: string, days: number): string {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return formatCalendarDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

function formatCalendarDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatWarsawCalendarDateFromParts(year: number, month: number, day: number): string {
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(anchor);
}

export function calendarDateToLocalDate(yyyyMmDd: string): Date {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  const warsawLabel = formatWarsawCalendarDateFromParts(year, month, day);
  const [normalizedYear, normalizedMonth, normalizedDay] = warsawLabel.split("-").map(Number);
  return new Date(normalizedYear, normalizedMonth - 1, normalizedDay);
}

export function localDateToCalendarDate(date: Date): string {
  return formatWarsawCalendarDateFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function getIsoWeekdayWarsaw(yyyyMmDd: string): number {
  const startIso = startOfWarsawCalendarDayUtcIso(yyyyMmDd);
  if (!startIso) {
    return 0;
  }

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    weekday: "short",
  }).format(new Date(startIso));

  return ISO_WEEKDAY[weekday] ?? 0;
}

function getWarsawMonthBounds(reference: Date): { from: string; to: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "numeric",
  }).formatToParts(reference);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);
  const from = formatCalendarDate(year, month, 1);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = formatCalendarDate(year, month, lastDay);

  return { from, to };
}

export function getWarsawDatePresetRange(
  preset: "today" | "week" | "month",
  reference: Date = new Date(),
): { from: string; to: string } {
  const today = getWarsawCalendarDate(reference);

  if (preset === "today") {
    return { from: today, to: today };
  }

  if (preset === "week") {
    const weekday = getIsoWeekdayWarsaw(today);
    const from = addCalendarDays(today, -weekday);
    const to = addCalendarDays(from, 6);
    return { from, to };
  }

  return getWarsawMonthBounds(reference);
}

export function resolvePublishedDateBounds(filters: Pick<FanEventFilters, "dateFrom" | "dateTo">): {
  gte: string;
  lt?: string;
} {
  const todayStart = getStartOfTodayWarsawUtcIso();

  if (!filters.dateFrom) {
    return { gte: todayStart };
  }

  const from = filters.dateFrom;
  const to = filters.dateTo ?? from;
  const rangeStart = startOfWarsawCalendarDayUtcIso(from);

  if (!rangeStart) {
    return { gte: todayStart };
  }

  const gte = rangeStart < todayStart ? todayStart : rangeStart;
  const nextDay = addCalendarDays(to, 1);
  const lt = startOfWarsawCalendarDayUtcIso(nextDay) ?? undefined;

  return lt ? { gte, lt } : { gte };
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWarsawDatePresetRange,
  isValidCalendarDate,
  resolvePublishedDateBounds,
  startOfWarsawCalendarDayUtcIso,
} from "@/lib/events/date-range";
import { getStartOfTodayWarsawUtcIso } from "@/lib/events/format";

describe("isValidCalendarDate", () => {
  it("accepts a real calendar date", () => {
    expect(isValidCalendarDate("2026-06-15")).toBe(true);
  });

  it("rejects impossible dates that JavaScript would roll over", () => {
    expect(isValidCalendarDate("2026-02-31")).toBe(false);
  });

  it("rejects malformed values", () => {
    expect(isValidCalendarDate("not-a-date")).toBe(false);
    expect(isValidCalendarDate("2026-6-15")).toBe(false);
  });
});

describe("getWarsawDatePresetRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the same Warsaw calendar day for the today preset", () => {
    expect(getWarsawDatePresetRange("today")).toEqual({
      from: "2026-06-13",
      to: "2026-06-13",
    });
  });

  it("returns Monday through Sunday for the week preset on a Friday", () => {
    expect(getWarsawDatePresetRange("week")).toEqual({
      from: "2026-06-08",
      to: "2026-06-14",
    });
  });

  it("returns the full calendar month for the month preset", () => {
    expect(getWarsawDatePresetRange("month")).toEqual({
      from: "2026-06-01",
      to: "2026-06-30",
    });
  });

  it("returns the last day of February in a non-leap year for the month preset", () => {
    vi.setSystemTime(new Date("2025-02-15T12:00:00Z"));

    expect(getWarsawDatePresetRange("month")).toEqual({
      from: "2025-02-01",
      to: "2025-02-28",
    });
  });
});

describe("resolvePublishedDateBounds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses start of today when no date filter is active", () => {
    const bounds = resolvePublishedDateBounds({ dateFrom: null, dateTo: null });

    expect(bounds.gte).toBe(getStartOfTodayWarsawUtcIso());
    expect(bounds.lt).toBeUndefined();
  });

  it("clamps a past range start to today and sets an exclusive upper bound", () => {
    const bounds = resolvePublishedDateBounds({
      dateFrom: "2026-06-01",
      dateTo: "2026-06-20",
    });

    expect(bounds.gte).toBe(getStartOfTodayWarsawUtcIso());
    expect(bounds.lt).toBe(startOfWarsawCalendarDayUtcIso("2026-06-21"));
  });

  it("uses the requested future day start when it is after today", () => {
    const bounds = resolvePublishedDateBounds({
      dateFrom: "2026-06-20",
      dateTo: "2026-06-20",
    });

    expect(bounds.gte).toBe(startOfWarsawCalendarDayUtcIso("2026-06-20"));
    expect(bounds.lt).toBe(startOfWarsawCalendarDayUtcIso("2026-06-21"));
  });
});

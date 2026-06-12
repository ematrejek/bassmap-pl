import { describe, expect, it } from "vitest";
import { parseDatetimeLocalWarsaw } from "@/lib/events/format";

describe("parseDatetimeLocalWarsaw", () => {
  it("rejects ISO datetime strings with Z suffix (3c)", () => {
    expect(parseDatetimeLocalWarsaw("2026-06-15T20:00:00.000Z")).toBeNull();
  });

  it("accepts canonical datetime-local values (3d)", () => {
    const result = parseDatetimeLocalWarsaw("2026-12-01T20:00");

    expect(result).not.toBeNull();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    expect(new Date(result ?? "").toISOString()).toBe(result);
  });
});

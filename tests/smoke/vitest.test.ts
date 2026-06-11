import { describe, expect, it } from "vitest";
import { listPublishedEvents } from "@/lib/services/events";

describe("vitest smoke", () => {
  it("runs and resolves @/ path alias", () => {
    expect(true).toBe(true);
    expect(typeof listPublishedEvents).toBe("function");
  });
});

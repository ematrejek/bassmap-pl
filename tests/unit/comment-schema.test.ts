import { describe, expect, it } from "vitest";
import { parseCommentBody } from "@/lib/events/comment-schema";

describe("parseCommentBody", () => {
  it("rejects empty string", () => {
    const result = parseCommentBody("");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Komentarz nie może być pusty");
    }
  });

  it("rejects whitespace-only string", () => {
    const result = parseCommentBody("   \n\t  ");

    expect(result.success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const result = parseCommentBody("  Świetny event!  ");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Świetny event!");
    }
  });

  it("rejects body longer than 2000 characters", () => {
    const result = parseCommentBody("a".repeat(2001));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Komentarz może mieć maksymalnie 2000 znaków");
    }
  });

  it("accepts body at max length", () => {
    const result = parseCommentBody("a".repeat(2000));

    expect(result.success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { parseForumCommentBody } from "@/lib/forum/comment-schema";
import {
  createForumThreadSchema,
  parseCreateForumThreadInput,
} from "@/lib/forum/thread-schema";

describe("parseForumCommentBody", () => {
  it("rejects empty string", () => {
    const result = parseForumCommentBody("");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Komentarz nie może być pusty");
    }
  });

  it("trims surrounding whitespace", () => {
    const result = parseForumCommentBody("  Hej ekipa!  ");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Hej ekipa!");
    }
  });

  it("rejects body longer than 2000 characters", () => {
    const result = parseForumCommentBody("a".repeat(2001));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Komentarz może mieć maksymalnie 2000 znaków");
    }
  });
});

describe("parseCreateForumThreadInput", () => {
  const validInput = {
    category: "szukam_ekipy",
    title: "Szukam crew w Warszawie",
    body: "Gram jungle od lat.",
  };

  it("accepts valid thread input", () => {
    const result = parseCreateForumThreadInput(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        ...validInput,
        tags: [],
      });
    }
  });

  it("rejects empty title", () => {
    const result = parseCreateForumThreadInput({
      ...validInput,
      title: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Tytuł nie może być pusty");
    }
  });

  it("rejects title longer than 120 characters", () => {
    const result = parseCreateForumThreadInput({
      ...validInput,
      title: "a".repeat(121),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Tytuł może mieć maksymalnie 120 znaków");
    }
  });

  it("rejects body longer than 2000 characters", () => {
    const result = parseCreateForumThreadInput({
      ...validInput,
      body: "a".repeat(2001),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Treść może mieć maksymalnie 2000 znaków");
    }
  });

  it("rejects unknown category", () => {
    const result = parseCreateForumThreadInput({
      ...validInput,
      category: "nieznany_dzial",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Wybierz dział forum");
    }
  });

  it("trims title and body whitespace", () => {
    const result = parseCreateForumThreadInput({
      category: "szukam_ekipy",
      title: "  Tytuł  ",
      body: "  Treść  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Tytuł");
      expect(result.data.body).toBe("Treść");
    }
  });

  it("normalizes optional city and tags", () => {
    const result = parseCreateForumThreadInput({
      ...validInput,
      city: "  Kraków  ",
      tags: ["dnb", "jungle"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe("Kraków");
      expect(result.data.tags).toEqual(["dnb", "jungle"]);
    }
  });

  it("rejects more than three tags", () => {
    const result = createForumThreadSchema.safeParse({
      ...validInput,
      tags: ["dnb", "jungle", "dubstep", "rave"],
    });

    expect(result.success).toBe(false);
  });
});

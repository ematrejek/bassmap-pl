import { describe, expect, it } from "vitest";
import { parseForumCommentBody } from "@/lib/forum/comment-schema";
import { parseCreateForumThreadInput } from "@/lib/forum/thread-schema";

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
      expect(result.data).toEqual(validInput);
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

  it("normalizes optional city", () => {
    const result = parseCreateForumThreadInput({
      ...validInput,
      city: "  Kraków  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe("Kraków");
    }
  });

  it("accepts optional crewId for crew forum categories", () => {
    const result = parseCreateForumThreadInput({
      ...validInput,
      crewId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.crewId).toBe("11111111-1111-1111-1111-111111111111");
    }
  });

  it("rejects crewId on non-crew categories", () => {
    const result = parseCreateForumThreadInput({
      category: "pozostale",
      title: "Ogłoszenie",
      body: "Treść wątku.",
      crewId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ekipę można powiązać tylko z działem ekipowym");
    }
  });
});

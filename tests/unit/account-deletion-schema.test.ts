import { describe, expect, it } from "vitest";
import { deleteAccountBodySchema } from "@/lib/account-deletion/schema";

describe("deleteAccountBodySchema", () => {
  it("rejects empty password", () => {
    const result = deleteAccountBodySchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
  });

  it("accepts non-empty password", () => {
    const result = deleteAccountBodySchema.safeParse({ password: "Secret!2026" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe("Secret!2026");
    }
  });
});

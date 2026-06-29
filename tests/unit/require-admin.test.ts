import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { requireAdmin, requireAuth } from "@/lib/auth/guards";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "user@example.com" } as User;

function mockLocals(overrides: Partial<App.Locals>): App.Locals {
  return {
    user: null,
    isAdmin: false,
    isOrganizer: false,
    ...overrides,
  } as App.Locals;
}

describe("requireAuth", () => {
  it("returns 401 when no user", async () => {
    const response = requireAuth(mockLocals({}));

    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Wymagane logowanie" });
  });

  it("returns null when user is present", () => {
    expect(requireAuth(mockLocals({ user: mockUser }))).toBeNull();
  });
});

describe("requireAdmin", () => {
  it("returns 401 when no user", async () => {
    const response = requireAdmin(mockLocals({}));

    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Wymagane logowanie" });
  });

  it("returns 403 when user is not admin", async () => {
    const response = requireAdmin(mockLocals({ user: mockUser, isAdmin: false }));

    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({ error: "Brak uprawnień administratora" });
  });

  it("returns null when user is admin", () => {
    expect(requireAdmin(mockLocals({ user: mockUser, isAdmin: true }))).toBeNull();
  });
});

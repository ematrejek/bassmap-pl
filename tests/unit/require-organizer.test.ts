import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { requireOrganizer } from "@/lib/auth/guards";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "user@example.com" } as User;

function mockLocals(overrides: Partial<App.Locals>): App.Locals {
  return {
    user: null,
    isAdmin: false,
    isOrganizer: false,
    ...overrides,
  } as App.Locals;
}

describe("requireOrganizer", () => {
  it("returns 401 when no user", async () => {
    const response = requireOrganizer(mockLocals({}));

    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Wymagane logowanie" });
  });

  it("returns 403 when user is not organizer", async () => {
    const response = requireOrganizer(mockLocals({ user: mockUser, isOrganizer: false }));

    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({ error: "Brak uprawnień organizatora" });
  });

  it("returns null when user is organizer", () => {
    expect(requireOrganizer(mockLocals({ user: mockUser, isOrganizer: true }))).toBeNull();
  });
});

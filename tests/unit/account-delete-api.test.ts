import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import { POST } from "@/pages/api/fan/account/delete";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;

const { mockSignInWithPassword, mockSignOut, mockDeleteUserAccount } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockDeleteUserAccount: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
}));

vi.mock("@/lib/supabase-service", () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/account-deletion", () => ({
  deleteUserAccount: mockDeleteUserAccount,
}));

function mockContext(
  locals: Partial<App.Locals>,
  options?: {
    body?: unknown;
  },
): APIContext {
  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    request: new Request("http://localhost/api/fan/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options?.body ?? { password: "correct-password" }),
    }),
    cookies: {
      set: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
    },
    url: new URL("http://localhost/api/fan/account/delete"),
    params: {},
    clientAddress: "127.0.0.1",
    redirect: vi.fn(),
  } as unknown as APIContext;
}

describe("POST /api/fan/account/delete", () => {
  it("returns 401 when not logged in", async () => {
    const response = await POST(mockContext({ user: null, isAdmin: false }));
    expect(response.status).toBe(401);
  });

  it("returns 403 for admin", async () => {
    const response = await POST(mockContext({ user: mockUser, isAdmin: true }));
    expect(response.status).toBe(403);
  });

  it("returns 400 when account has no email", async () => {
    const userWithoutEmail = { id: mockUser.id, email: undefined } as User;

    const response = await POST(mockContext({ user: userWithoutEmail, isAdmin: false }));

    expect(response.status).toBe(400);
    const body: unknown = await response.json();
    expect(body).toEqual({ error: "Brak adresu e-mail na koncie – skontaktuj się z administratorem" });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockDeleteUserAccount).not.toHaveBeenCalled();
  });

  it("returns 401 for wrong password", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: "Invalid" } });

    const response = await POST(mockContext({ user: mockUser, isAdmin: false }));
    expect(response.status).toBe(401);
    expect(mockDeleteUserAccount).not.toHaveBeenCalled();
  });

  it("returns 204 and signs out on success", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockDeleteUserAccount.mockResolvedValueOnce({ success: true });

    const response = await POST(mockContext({ user: mockUser, isAdmin: false }));

    expect(response.status).toBe(204);
    expect(mockDeleteUserAccount).toHaveBeenCalledWith({}, mockUser.id);
    expect(mockSignOut).toHaveBeenCalled();
  });
});

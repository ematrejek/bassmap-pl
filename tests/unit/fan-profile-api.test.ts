import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import {
  FAN_PROFILE_LOGIN_TAKEN_ERROR,
  ensureFanProfile,
  getFanProfileByUserId,
  updateFanProfile,
} from "@/lib/services/fan-profile";
import { GET, PATCH } from "@/pages/api/fan/profile";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;

const mockProfile = {
  userId: mockUser.id,
  login: "fan_example",
  bio: "Test bio",
  city: "Warszawa",
  favoriteSubgenres: ["neurofunk" as const],
  instagramUrl: null,
  soundcloudUrl: null,
  facebookUrl: null,
  spotifyUrl: null,
  twitchUrl: null,
  createdAt: "2026-06-24T10:00:00.000Z",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/fan-profile", () => ({
  ensureFanProfile: vi.fn(() => Promise.resolve({ data: mockProfile })),
  getFanProfileByUserId: vi.fn(() => Promise.resolve({ data: mockProfile })),
  updateFanProfile: vi.fn(() => Promise.resolve({ data: mockProfile })),
  FAN_PROFILE_LOGIN_TAKEN_ERROR: "Ten login jest już zajęty",
}));

const mockEnsureFanProfile = vi.mocked(ensureFanProfile);
const mockGetFanProfileByUserId = vi.mocked(getFanProfileByUserId);
const mockUpdateFanProfile = vi.mocked(updateFanProfile);

function mockContext(
  locals: Partial<App.Locals>,
  options?: {
    method?: string;
    body?: unknown;
  },
): APIContext {
  const method = options?.method ?? "GET";

  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    request: new Request("http://localhost/api/fan/profile", {
      method,
      headers: { "Content-Type": "application/json" },
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    }),
    cookies: {
      get: () => undefined,
      set: () => undefined,
      delete: () => undefined,
      has: () => false,
      merge: () => undefined,
      headers: () => new Headers(),
    },
  } as unknown as APIContext;
}

describe("GET /api/fan/profile", () => {
  it("returns profile for logged-in fan", async () => {
    const response = await GET(mockContext({ user: mockUser }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ profile: mockProfile });
    expect(mockEnsureFanProfile).toHaveBeenCalled();
    expect(mockGetFanProfileByUserId).toHaveBeenCalled();
  });

  it("returns 401 when not logged in", async () => {
    const response = await GET(mockContext({}));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Wymagane logowanie" });
  });
});

describe("PATCH /api/fan/profile", () => {
  it("updates profile for logged-in fan", async () => {
    const response = await PATCH(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          body: { login: "new_login", bio: "Nowe bio" },
        },
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ profile: mockProfile });
    expect(mockUpdateFanProfile).toHaveBeenCalledWith(expect.anything(), mockUser.id, {
      login: "new_login",
      bio: "Nowe bio",
    });
  });

  it("returns 409 when login is taken", async () => {
    mockUpdateFanProfile.mockResolvedValueOnce({ error: FAN_PROFILE_LOGIN_TAKEN_ERROR });

    const response = await PATCH(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          body: { login: "taken_login" },
        },
      ),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: FAN_PROFILE_LOGIN_TAKEN_ERROR });
  });

  it("returns 400 for invalid login", async () => {
    const response = await PATCH(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          body: { login: "ab" },
        },
      ),
    );

    expect(response.status).toBe(400);
    const json: unknown = await response.json();
    expect(json).toEqual({
      error: "Login musi mieć 3–30 znaków: małe litery, cyfry i podkreślenia",
    });
  });

  it("returns 403 when admin tries fan profile API", async () => {
    const getResponse = await GET(mockContext({ user: mockUser, isAdmin: true }));
    expect(getResponse.status).toBe(403);
    await expect(getResponse.json()).resolves.toEqual({ error: "Admin dodaje wydarzenia w panelu admina" });

    const patchResponse = await PATCH(
      mockContext(
        { user: mockUser, isAdmin: true },
        {
          method: "PATCH",
          body: { bio: "Admin bio" },
        },
      ),
    );

    expect(patchResponse.status).toBe(403);
    await expect(patchResponse.json()).resolves.toEqual({ error: "Admin dodaje wydarzenia w panelu admina" });
  });
});

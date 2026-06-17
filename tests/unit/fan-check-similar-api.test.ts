import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import { buildMutationCreatePayload } from "../helpers/mutation-fixtures";
import { findSimilarEvents } from "@/lib/events/similarity";
import { POST } from "@/pages/api/fan/events/check-similar";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;

const mockMatch = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Bass Night",
  startsAt: "2026-07-15T18:00:00.000Z",
  city: "Warszawa",
  status: "published" as const,
  similarityScore: 0.8,
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/events/similarity", () => ({
  findSimilarEvents: vi.fn(() => Promise.resolve({ data: [mockMatch] })),
}));

const mockFindSimilarEvents = vi.mocked(findSimilarEvents);

function mockContext(locals: Partial<App.Locals>, body?: unknown): APIContext {
  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    request: new Request("http://localhost/api/fan/events/check-similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

describe("POST /api/fan/events/check-similar", () => {
  it("returns 401 when not logged in", async () => {
    const response = await POST(mockContext({}));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Wymagane logowanie" });
  });

  it("returns 403 when admin tries fan check-similar", async () => {
    const response = await POST(
      mockContext({
        user: mockUser,
        isAdmin: true,
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Admin dodaje wydarzenia w panelu admina" });
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      mockContext(
        {
          user: mockUser,
          isAdmin: false,
        },
        { name: "" },
      ),
    );

    expect(response.status).toBe(400);
  });

  it("returns 200 with matches for valid fan payload", async () => {
    mockFindSimilarEvents.mockClear();

    const payload = buildMutationCreatePayload("fan-check-similar");
    const response = await POST(
      mockContext(
        {
          user: mockUser,
          isAdmin: false,
        },
        payload,
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ matches: [mockMatch] });
    expect(mockFindSimilarEvents).toHaveBeenCalledWith(expect.anything(), expect.any(Object), {
      excludeCreatedBy: mockUser.id,
      includePending: false,
    });
  });

  it("strips acceptContentRights before parsing", async () => {
    mockFindSimilarEvents.mockClear();

    const payload = {
      ...buildMutationCreatePayload("fan-check-similar-consent"),
      acceptContentRights: true,
    };
    const response = await POST(
      mockContext(
        {
          user: mockUser,
          isAdmin: false,
        },
        payload,
      ),
    );

    expect(response.status).toBe(200);
    expect(mockFindSimilarEvents).toHaveBeenCalledOnce();
  });
});

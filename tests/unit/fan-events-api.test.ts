import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import { buildMutationCreatePayload } from "../helpers/mutation-fixtures";
import { createFanSubmittedEvent } from "@/lib/services/events";
import { POST } from "@/pages/api/fan/events/index";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/events", () => ({
  createFanSubmittedEvent: vi.fn(() => Promise.resolve({ data: { id: "event-1", status: "pending" } })),
}));

const mockCreateFanSubmittedEvent = vi.mocked(createFanSubmittedEvent);

function mockContext(locals: Partial<App.Locals>, body?: unknown): APIContext {
  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    request: new Request("http://localhost/api/fan/events", {
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

describe("POST /api/fan/events", () => {
  it("returns 401 when not logged in", async () => {
    const response = await POST(mockContext({}));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Wymagane logowanie" });
  });

  it("returns 403 when admin tries fan submit", async () => {
    const response = await POST(
      mockContext({
        user: mockUser,
        isAdmin: true,
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Admin dodaje wydarzenia w panelu admina" });
  });

  it("returns 400 when content rights not accepted", async () => {
    const payload = buildMutationCreatePayload("fan-api-no-rights");
    const response = await POST(
      mockContext(
        {
          user: mockUser,
          isAdmin: false,
        },
        payload,
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Musisz potwierdzić oświadczenie dotyczące opisu wydarzenia",
    });
  });

  it("returns 201 for non-admin fan submit", async () => {
    const payload = {
      ...buildMutationCreatePayload("fan-api"),
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

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty("event");
  });

  it("passes descriptionRightsAcceptedAt when content rights accepted", async () => {
    mockCreateFanSubmittedEvent.mockClear();

    const payload = {
      ...buildMutationCreatePayload("fan-api-timestamp"),
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

    expect(response.status).toBe(201);
    expect(mockCreateFanSubmittedEvent).toHaveBeenCalledOnce();

    const options = mockCreateFanSubmittedEvent.mock.calls[0]?.[3];
    expect(options?.descriptionRightsAcceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

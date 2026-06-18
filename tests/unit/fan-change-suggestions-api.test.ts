import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import { createFanChangeSuggestion } from "@/lib/services/change-suggestions";
import { POST } from "@/pages/api/fan/change-suggestions/index";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;
const eventId = "22222222-2222-2222-2222-222222222222";

const mockSuggestion = {
  id: "33333333-3333-3333-3333-333333333333",
  eventId,
  submittedBy: mockUser.id,
  body: "Poprawcie godzinę startu na 22:00",
  payload: null,
  status: "pending" as const,
  source: "duplicate_flow" as const,
  createdAt: "2026-06-17T10:00:00.000Z",
  updatedAt: "2026-06-17T10:00:00.000Z",
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/change-suggestions", () => ({
  createFanChangeSuggestion: vi.fn(() => Promise.resolve({ data: mockSuggestion })),
}));

const mockEventPageSuggestion = {
  ...mockSuggestion,
  id: "44444444-4444-4444-4444-444444444444",
  body: null,
  payload: { description: "Nowy opis wydarzenia" },
  source: "event_page" as const,
};

const mockCreateFanChangeSuggestion = vi.mocked(createFanChangeSuggestion);

function mockContext(locals: Partial<App.Locals>, body?: unknown): APIContext {
  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    request: new Request("http://localhost/api/fan/change-suggestions", {
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

describe("POST /api/fan/change-suggestions", () => {
  it("returns 401 when not logged in", async () => {
    const response = await POST(mockContext({}));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Wymagane logowanie" });
  });

  it("returns 403 when admin tries fan suggestion", async () => {
    const response = await POST(
      mockContext({
        user: mockUser,
        isAdmin: true,
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Admin dodaje wydarzenia w panelu admina" });
  });

  it("returns 400 when body is too short", async () => {
    const response = await POST(
      mockContext(
        {
          user: mockUser,
          isAdmin: false,
        },
        { eventId, body: "za krótko" },
      ),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when eventId is invalid", async () => {
    const response = await POST(
      mockContext(
        {
          user: mockUser,
          isAdmin: false,
        },
        { eventId: "not-a-uuid", body: "Poprawcie godzinę startu na 22:00" },
      ),
    );

    expect(response.status).toBe(400);
  });

  it("returns 201 for valid suggestion", async () => {
    mockCreateFanChangeSuggestion.mockClear();

    const response = await POST(
      mockContext(
        {
          user: mockUser,
          isAdmin: false,
        },
        { eventId, body: "Poprawcie godzinę startu na 22:00" },
      ),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ suggestion: mockSuggestion });
    expect(mockCreateFanChangeSuggestion).toHaveBeenCalledWith(expect.anything(), mockUser.id, {
      eventId,
      source: "duplicate_flow",
      body: "Poprawcie godzinę startu na 22:00",
    });
  });

  it("returns 201 for valid event_page payload suggestion", async () => {
    mockCreateFanChangeSuggestion.mockResolvedValueOnce({ data: mockEventPageSuggestion });

    const response = await POST(
      mockContext(
        {
          user: mockUser,
          isAdmin: false,
        },
        {
          eventId,
          source: "event_page",
          payload: { description: "Nowy opis wydarzenia" },
        },
      ),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ suggestion: mockEventPageSuggestion });
    expect(mockCreateFanChangeSuggestion).toHaveBeenCalledWith(expect.anything(), mockUser.id, {
      eventId,
      source: "event_page",
      payload: { description: "Nowy opis wydarzenia" },
      body: undefined,
    });
  });

  it("returns 400 when event_page payload is empty", async () => {
    mockCreateFanChangeSuggestion.mockResolvedValueOnce({
      error: "Wybierz co najmniej jedno pole do zmiany",
    });

    const response = await POST(
      mockContext(
        {
          user: mockUser,
          isAdmin: false,
        },
        {
          eventId,
          source: "event_page",
          payload: {},
        },
      ),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when event_page comment is too long", async () => {
    const response = await POST(
      mockContext(
        {
          user: mockUser,
          isAdmin: false,
        },
        {
          eventId,
          source: "event_page",
          payload: { description: "Nowy opis" },
          body: "x".repeat(2001),
        },
      ),
    );

    expect(response.status).toBe(400);
  });
});

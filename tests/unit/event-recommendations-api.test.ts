import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEventRecommendation,
  listReceivedEventRecommendations,
  RECOMMENDATION_EVENT_ENDED_ERROR,
  RECOMMENDATION_EVENT_NOT_FOUND_ERROR,
  RECOMMENDATION_NOT_FRIEND_ERROR,
  RECOMMENDATION_SELF_ERROR,
} from "@/lib/services/event-recommendations";
import { POST } from "@/pages/api/events/[id]/recommendations";
import { GET } from "@/pages/api/fan/recommendations/events";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;
const eventId = "22222222-2222-2222-2222-222222222222";
const recipientUserId = "33333333-3333-3333-3333-333333333333";

const mockRecommendation = {
  id: "44444444-4444-4444-4444-444444444444",
  eventId,
  senderId: mockUser.id,
  recipientId: recipientUserId,
  senderLabel: "fan_example",
  message: "Chodź!",
  notificationId: "55555555-5555-5555-5555-555555555555",
  readAt: null,
  createdAt: "2026-06-25T10:00:00.000Z",
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/event-recommendations", () => ({
  createEventRecommendation: vi.fn(() => Promise.resolve({ data: mockRecommendation })),
  listReceivedEventRecommendations: vi.fn(() => Promise.resolve({ data: [mockRecommendation] })),
  RECOMMENDATION_EVENT_NOT_FOUND_ERROR: "Nie znaleziono wydarzenia",
  RECOMMENDATION_EVENT_ENDED_ERROR: "Nie można polecić zakończonego wydarzenia",
  RECOMMENDATION_SELF_ERROR: "Nie możesz polecić wydarzenia samemu sobie",
  RECOMMENDATION_NOT_FRIEND_ERROR: "Możesz polecać wydarzenia tylko zaakceptowanym znajomym",
}));

const mockCreateEventRecommendation = vi.mocked(createEventRecommendation);
const mockListReceivedEventRecommendations = vi.mocked(listReceivedEventRecommendations);

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateEventRecommendation.mockResolvedValue({ data: mockRecommendation });
  mockListReceivedEventRecommendations.mockResolvedValue({ data: [mockRecommendation] });
});

function mockContext(
  locals: Partial<App.Locals>,
  options?: {
    method?: string;
    body?: unknown;
    rawBody?: string;
    params?: Record<string, string | undefined>;
    url?: string;
  },
): APIContext {
  const method = options?.method ?? "POST";
  const url = options?.url ?? `http://localhost/api/events/${eventId}/recommendations`;
  const body = options?.rawBody ?? (options?.body !== undefined ? JSON.stringify(options.body) : undefined);

  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    params: options?.params ?? { id: eventId },
    request: new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
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

describe("POST /api/events/[id]/recommendations", () => {
  it("returns 401 when not logged in", async () => {
    const response = await POST(mockContext({}, { body: { recipientUserId } }));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid event id", async () => {
    const response = await POST(
      mockContext(
        { user: mockUser },
        {
          body: { recipientUserId },
          params: { id: "bad-id" },
          url: "http://localhost/api/events/bad-id/recommendations",
        },
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Nieprawidłowy identyfikator wydarzenia" });
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(mockContext({ user: mockUser }, { rawBody: "{" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Nieprawidłowe dane JSON" });
  });

  it("returns 400 for invalid message", async () => {
    const response = await POST(
      mockContext({ user: mockUser }, { body: { recipientUserId, message: "x".repeat(301) } }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Wiadomość może mieć maksymalnie 300 znaków" });
  });

  it("returns 404 for missing event", async () => {
    mockCreateEventRecommendation.mockResolvedValueOnce({ error: RECOMMENDATION_EVENT_NOT_FOUND_ERROR });

    const response = await POST(mockContext({ user: mockUser }, { body: { recipientUserId } }));

    expect(response.status).toBe(404);
  });

  it("returns 404 for ended event", async () => {
    mockCreateEventRecommendation.mockResolvedValueOnce({ error: RECOMMENDATION_EVENT_ENDED_ERROR });

    const response = await POST(mockContext({ user: mockUser }, { body: { recipientUserId } }));

    expect(response.status).toBe(404);
  });

  it("returns 403 for non-friend recipient", async () => {
    mockCreateEventRecommendation.mockResolvedValueOnce({ error: RECOMMENDATION_NOT_FRIEND_ERROR });

    const response = await POST(mockContext({ user: mockUser }, { body: { recipientUserId } }));

    expect(response.status).toBe(403);
  });

  it("returns 400 for self-recipient", async () => {
    mockCreateEventRecommendation.mockResolvedValueOnce({ error: RECOMMENDATION_SELF_ERROR });

    const response = await POST(mockContext({ user: mockUser }, { body: { recipientUserId: mockUser.id } }));

    expect(response.status).toBe(400);
  });

  it("creates event recommendation for accepted friend", async () => {
    const response = await POST(mockContext({ user: mockUser }, { body: { recipientUserId, message: "Chodź!" } }));

    expect(response.status).toBe(201);
    expect(mockCreateEventRecommendation).toHaveBeenCalledWith(expect.anything(), mockUser, eventId, {
      recipientUserId,
      message: "Chodź!",
    });
    await expect(response.json()).resolves.toEqual({ recommendation: mockRecommendation });
  });
});

describe("GET /api/fan/recommendations/events", () => {
  it("returns 401 when not logged in", async () => {
    const response = await GET(
      mockContext(
        {},
        {
          method: "GET",
          url: "http://localhost/api/fan/recommendations/events",
          params: {},
        },
      ),
    );

    expect(response.status).toBe(401);
  });

  it("returns received recommendations for logged-in user", async () => {
    const response = await GET(
      mockContext(
        { user: mockUser },
        {
          method: "GET",
          url: "http://localhost/api/fan/recommendations/events",
          params: {},
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockListReceivedEventRecommendations).toHaveBeenCalledWith(expect.anything(), mockUser.id);
    await expect(response.json()).resolves.toEqual({ recommendations: [mockRecommendation] });
  });
});

import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import { createEventComment, deleteEventComment, listEventComments } from "@/lib/services/event-comments";
import { getPublishedEventById } from "@/lib/services/events";
import { DELETE as DELETEAdminComment } from "@/pages/api/admin/event-comments/[id]";
import { DELETE as DELETEFanComment } from "@/pages/api/fan/event-comments/[id]";
import { GET, POST } from "@/pages/api/events/[id]/comments";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;
const eventId = "22222222-2222-2222-2222-222222222222";
const commentId = "33333333-3333-3333-3333-333333333333";

const mockEvent = {
  id: eventId,
  name: "Test Event",
  startsAt: "2026-07-01T20:00:00.000Z",
  city: "Warszawa",
  venueName: "Club",
  addressStreet: "Testowa",
  addressNumber: "1",
  latitude: 52.23,
  longitude: 21.01,
  subgenres: ["neurofunk" as const],
  lineup: null,
  description: null,
  ticketUrl: null,
  isFree: true,
  priceMode: null,
  priceMin: null,
  priceMax: null,
  currency: null,
  status: "published" as const,
  coverPath: null,
  coverAspect: null,
  descriptionRightsAcceptedAt: null,
  coverSource: null,
  coverDeclarationKind: null,
  coverCopyrightDeclaredAt: null,
  createdBy: null,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
};

const mockComment = {
  id: commentId,
  eventId,
  authorId: mockUser.id,
  authorLabel: "Fan",
  body: "Kto jedzie?",
  createdAt: "2026-06-19T10:00:00.000Z",
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/events", () => ({
  getPublishedEventById: vi.fn(() => Promise.resolve(mockEvent)),
}));

vi.mock("@/lib/services/event-comments", () => ({
  listEventComments: vi.fn(() => Promise.resolve({ data: [mockComment] })),
  createEventComment: vi.fn(() => Promise.resolve({ data: mockComment })),
  deleteEventComment: vi.fn(() => Promise.resolve({ data: { id: commentId } })),
}));

const mockGetPublishedEventById = vi.mocked(getPublishedEventById);
const mockListEventComments = vi.mocked(listEventComments);
const mockCreateEventComment = vi.mocked(createEventComment);
const mockDeleteEventComment = vi.mocked(deleteEventComment);

function mockContext(
  locals: Partial<App.Locals>,
  options?: { method?: string; body?: unknown; params?: Record<string, string | undefined> },
): APIContext {
  const method = options?.method ?? "GET";
  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    params: options?.params ?? { id: eventId },
    request: new Request(`http://localhost/api/events/${eventId}/comments`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    }),
  } as APIContext;
}

describe("GET /api/events/[id]/comments", () => {
  it("returns comments for published event", async () => {
    const response = await GET(mockContext({}));

    expect(response.status).toBe(200);
    const json: unknown = await response.json();
    expect(json).toEqual({ comments: [mockComment] });
    expect(mockGetPublishedEventById).toHaveBeenCalled();
    expect(mockListEventComments).toHaveBeenCalled();
  });

  it("returns 404 when event is missing", async () => {
    mockGetPublishedEventById.mockResolvedValueOnce(null);

    const response = await GET(mockContext({}));

    expect(response.status).toBe(404);
  });
});

describe("POST /api/events/[id]/comments", () => {
  it("returns 401 when not logged in", async () => {
    const response = await POST(mockContext({}, { method: "POST", body: { body: "Komentarz testowy" } }));

    expect(response.status).toBe(401);
  });

  it("returns 400 when user has no email", async () => {
    const response = await POST(
      mockContext({ user: { id: mockUser.id } as User }, { method: "POST", body: { body: "Komentarz testowy" } }),
    );

    expect(response.status).toBe(400);
    const json: unknown = await response.json();
    expect(json).toEqual({ error: "Brak adresu e-mail na koncie" });
  });

  it("creates comment for logged-in fan", async () => {
    const response = await POST(mockContext({ user: mockUser }, { method: "POST", body: { body: "Kto jedzie?" } }));

    expect(response.status).toBe(201);
    expect(mockCreateEventComment).toHaveBeenCalledWith(expect.anything(), mockUser.id, mockUser.email, {
      eventId,
      body: "Kto jedzie?",
    });
  });
});

describe("DELETE /api/admin/event-comments/[id]", () => {
  it("returns 403 for non-admin", async () => {
    const response = await DELETEAdminComment({
      locals: { user: mockUser, isAdmin: false } as App.Locals,
      params: { id: commentId },
      request: new Request(`http://localhost/api/admin/event-comments/${commentId}`, { method: "DELETE" }),
    } as APIContext);

    expect(response.status).toBe(403);
  });

  it("deletes comment for admin", async () => {
    const response = await DELETEAdminComment({
      locals: { user: mockUser, isAdmin: true } as App.Locals,
      params: { id: commentId },
      request: new Request(`http://localhost/api/admin/event-comments/${commentId}`, { method: "DELETE" }),
    } as APIContext);

    expect(response.status).toBe(200);
    expect(mockDeleteEventComment).toHaveBeenCalled();
  });
});

describe("DELETE /api/fan/event-comments/[id]", () => {
  it("returns 401 when not logged in", async () => {
    const response = await DELETEFanComment({
      locals: { user: null, isAdmin: false } as App.Locals,
      params: { id: commentId },
      request: new Request(`http://localhost/api/fan/event-comments/${commentId}`, { method: "DELETE" }),
    } as APIContext);

    expect(response.status).toBe(401);
  });

  it("returns 403 for admin", async () => {
    const response = await DELETEFanComment({
      locals: { user: mockUser, isAdmin: true } as App.Locals,
      params: { id: commentId },
      request: new Request(`http://localhost/api/fan/event-comments/${commentId}`, { method: "DELETE" }),
    } as APIContext);

    expect(response.status).toBe(403);
  });

  it("deletes own comment for logged-in fan", async () => {
    const response = await DELETEFanComment({
      locals: { user: mockUser, isAdmin: false } as App.Locals,
      params: { id: commentId },
      request: new Request(`http://localhost/api/fan/event-comments/${commentId}`, { method: "DELETE" }),
    } as APIContext);

    expect(response.status).toBe(200);
    expect(mockDeleteEventComment).toHaveBeenCalled();
  });
});

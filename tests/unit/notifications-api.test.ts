import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { countUnreadNotifications, listNotifications, markNotificationRead } from "@/lib/services/notifications";
import { GET } from "@/pages/api/fan/notifications";
import { PATCH } from "@/pages/api/fan/notifications/[id]/read";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;
const notificationId = "22222222-2222-2222-2222-222222222222";
const eventId = "33333333-3333-3333-3333-333333333333";

const mockNotification = {
  id: notificationId,
  recipientId: mockUser.id,
  actorId: "44444444-4444-4444-4444-444444444444",
  actorLabel: "amen_fan",
  type: "event_recommendation" as const,
  eventId,
  friendRequestId: null,
  body: "amen_fan poleca Ci event: Bass Night.",
  readAt: null,
  createdAt: "2026-06-25T10:00:00.000Z",
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/notifications", () => ({
  listNotifications: vi.fn(() => Promise.resolve({ data: [mockNotification] })),
  countUnreadNotifications: vi.fn(() => Promise.resolve({ data: 1 })),
  markNotificationRead: vi.fn(() =>
    Promise.resolve({
      data: {
        ...mockNotification,
        readAt: "2026-06-25T10:05:00.000Z",
      },
    }),
  ),
}));

const mockListNotifications = vi.mocked(listNotifications);
const mockCountUnreadNotifications = vi.mocked(countUnreadNotifications);
const mockMarkNotificationRead = vi.mocked(markNotificationRead);

beforeEach(() => {
  vi.clearAllMocks();
  mockListNotifications.mockResolvedValue({ data: [mockNotification] });
  mockCountUnreadNotifications.mockResolvedValue({ data: 1 });
  mockMarkNotificationRead.mockResolvedValue({
    data: {
      ...mockNotification,
      readAt: "2026-06-25T10:05:00.000Z",
    },
  });
});

function mockContext(
  locals: Partial<App.Locals>,
  options?: {
    method?: string;
    params?: Record<string, string | undefined>;
    url?: string;
  },
): APIContext {
  const method = options?.method ?? "GET";
  const url = options?.url ?? "http://localhost/api/fan/notifications";

  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    params: options?.params ?? {},
    request: new Request(url, {
      method,
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

describe("GET /api/fan/notifications", () => {
  it("returns 401 when not logged in", async () => {
    const response = await GET(mockContext({}));

    expect(response.status).toBe(401);
  });

  it("returns notifications and unread count for logged-in user", async () => {
    const response = await GET(mockContext({ user: mockUser }));

    expect(response.status).toBe(200);
    expect(mockListNotifications).toHaveBeenCalledWith(expect.anything(), mockUser.id);
    expect(mockCountUnreadNotifications).toHaveBeenCalledWith(expect.anything(), mockUser.id);
    await expect(response.json()).resolves.toEqual({ notifications: [mockNotification], unreadCount: 1 });
  });
});

describe("PATCH /api/fan/notifications/[id]/read", () => {
  it("returns 401 when not logged in", async () => {
    const response = await PATCH(
      mockContext(
        {},
        {
          method: "PATCH",
          params: { id: notificationId },
          url: `http://localhost/api/fan/notifications/${notificationId}/read`,
        },
      ),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid notification id", async () => {
    const response = await PATCH(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          params: { id: "bad-id" },
          url: "http://localhost/api/fan/notifications/bad-id/read",
        },
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Nieprawidłowy identyfikator powiadomienia" });
  });

  it("marks a notification as read for the current user", async () => {
    const response = await PATCH(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          params: { id: notificationId },
          url: `http://localhost/api/fan/notifications/${notificationId}/read`,
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockMarkNotificationRead).toHaveBeenCalledWith(expect.anything(), mockUser.id, notificationId);
    await expect(response.json()).resolves.toEqual({
      notification: {
        ...mockNotification,
        readAt: "2026-06-25T10:05:00.000Z",
      },
    });
  });
});

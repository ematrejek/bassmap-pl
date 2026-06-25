import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFriendRequestByLogin,
  FRIEND_REQUEST_SELF_ERROR,
  FRIEND_TARGET_NOT_FOUND_ERROR,
  listFriendsOverview,
  removeFriendship,
  updateFriendRequestStatus,
} from "@/lib/services/friends";
import { DELETE as deleteFriend } from "@/pages/api/fan/friends/[id]";
import { GET as getFriends } from "@/pages/api/fan/friends/index";
import { PATCH as patchFriendRequest } from "@/pages/api/fan/friends/requests/[id]";
import { POST as postFriendRequest } from "@/pages/api/fan/friends/requests/index";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;
const requestId = "22222222-2222-2222-2222-222222222222";
const friendshipId = "33333333-3333-3333-3333-333333333333";

const mockRequest = {
  id: requestId,
  requester: {
    userId: mockUser.id,
    login: "fan_a",
    profileUrl: "/u/fan_a",
  },
  addressee: {
    userId: "44444444-4444-4444-4444-444444444444",
    login: "fan_b",
    profileUrl: "/u/fan_b",
  },
  status: "pending" as const,
  createdAt: "2026-06-25T10:00:00.000Z",
  updatedAt: "2026-06-25T10:00:00.000Z",
};

const mockOverview = {
  friends: [],
  incomingRequests: [mockRequest],
  outgoingRequests: [],
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/friends", () => ({
  listFriendsOverview: vi.fn(() => Promise.resolve({ data: mockOverview })),
  createFriendRequestByLogin: vi.fn(() =>
    Promise.resolve({
      data: {
        request: mockRequest,
        state: "created" as const,
      },
    }),
  ),
  updateFriendRequestStatus: vi.fn(() => Promise.resolve({ data: { ...mockRequest, status: "accepted" as const } })),
  removeFriendship: vi.fn(() => Promise.resolve({ data: { deleted: true } })),
  FRIEND_REQUEST_NOT_FOUND_ERROR: "Nie znaleziono zaproszenia",
  FRIEND_REQUEST_FORBIDDEN_ERROR: "Nie możesz zmienić tego zaproszenia",
  FRIEND_REQUEST_NOT_PENDING_ERROR: "To zaproszenie zostało już obsłużone",
  FRIENDSHIP_NOT_FOUND_ERROR: "Nie znaleziono relacji znajomych",
  FRIENDSHIP_ALREADY_EXISTS_ERROR: "Jesteście już znajomymi",
  FRIEND_REQUEST_ALREADY_PENDING_ERROR: "Zaproszenie jest już wysłane",
  FRIEND_REQUEST_SELF_ERROR: "Nie możesz zaprosić samego siebie",
  FRIEND_TARGET_NOT_FOUND_ERROR: "Nie znaleziono fana o takim loginie",
}));

const mockListFriendsOverview = vi.mocked(listFriendsOverview);
const mockCreateFriendRequestByLogin = vi.mocked(createFriendRequestByLogin);
const mockUpdateFriendRequestStatus = vi.mocked(updateFriendRequestStatus);
const mockRemoveFriendship = vi.mocked(removeFriendship);

beforeEach(() => {
  vi.clearAllMocks();
  mockListFriendsOverview.mockResolvedValue({ data: mockOverview });
  mockCreateFriendRequestByLogin.mockResolvedValue({
    data: {
      request: mockRequest,
      state: "created",
    },
  });
  mockUpdateFriendRequestStatus.mockResolvedValue({ data: { ...mockRequest, status: "accepted" } });
  mockRemoveFriendship.mockResolvedValue({ data: { deleted: true } });
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
  const method = options?.method ?? "GET";
  const url = options?.url ?? "http://localhost/api/fan/friends";
  const body = options?.rawBody ?? (options?.body !== undefined ? JSON.stringify(options.body) : undefined);

  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    params: options?.params ?? {},
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

describe("GET /api/fan/friends", () => {
  it("returns 401 when not logged in", async () => {
    const response = await getFriends(mockContext({}));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Wymagane logowanie" });
  });

  it("returns friends overview for logged-in user", async () => {
    const response = await getFriends(mockContext({ user: mockUser }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(mockOverview);
    expect(mockListFriendsOverview).toHaveBeenCalledWith(expect.anything(), mockUser.id);
  });
});

describe("POST /api/fan/friends/requests", () => {
  it("returns 401 when not logged in", async () => {
    const response = await postFriendRequest(
      mockContext(
        {},
        { method: "POST", body: { targetLogin: "fan_b" }, url: "http://localhost/api/fan/friends/requests" },
      ),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await postFriendRequest(
      mockContext(
        { user: mockUser },
        { method: "POST", rawBody: "{", url: "http://localhost/api/fan/friends/requests" },
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Nieprawidłowe dane JSON" });
  });

  it("returns 400 for invalid login", async () => {
    const response = await postFriendRequest(
      mockContext(
        { user: mockUser },
        { method: "POST", body: { targetLogin: "ab" }, url: "http://localhost/api/fan/friends/requests" },
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Login musi mieć 3–30 znaków: małe litery, cyfry i podkreślenia",
    });
  });

  it("returns 404 for unknown login", async () => {
    mockCreateFriendRequestByLogin.mockResolvedValueOnce({ error: FRIEND_TARGET_NOT_FOUND_ERROR });

    const response = await postFriendRequest(
      mockContext(
        { user: mockUser },
        { method: "POST", body: { targetLogin: "missing_fan" }, url: "http://localhost/api/fan/friends/requests" },
      ),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: FRIEND_TARGET_NOT_FOUND_ERROR });
  });

  it("returns 400 for self-invite", async () => {
    mockCreateFriendRequestByLogin.mockResolvedValueOnce({ error: FRIEND_REQUEST_SELF_ERROR });

    const response = await postFriendRequest(
      mockContext(
        { user: mockUser },
        { method: "POST", body: { targetLogin: "fan_a" }, url: "http://localhost/api/fan/friends/requests" },
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: FRIEND_REQUEST_SELF_ERROR });
  });

  it("creates a friend request", async () => {
    const response = await postFriendRequest(
      mockContext(
        { user: mockUser },
        { method: "POST", body: { targetLogin: "Fan_B" }, url: "http://localhost/api/fan/friends/requests" },
      ),
    );

    expect(response.status).toBe(201);
    expect(mockCreateFriendRequestByLogin).toHaveBeenCalledWith(expect.anything(), mockUser.id, "fan_b");
    await expect(response.json()).resolves.toEqual({
      request: mockRequest,
      state: "created",
    });
  });

  it("returns existing reverse pending request instead of creating a duplicate", async () => {
    mockCreateFriendRequestByLogin.mockResolvedValueOnce({
      data: {
        request: mockRequest,
        state: "incoming_pending",
      },
    });

    const response = await postFriendRequest(
      mockContext(
        { user: mockUser },
        { method: "POST", body: { targetLogin: "fan_b" }, url: "http://localhost/api/fan/friends/requests" },
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      request: mockRequest,
      state: "incoming_pending",
    });
  });
});

describe("PATCH /api/fan/friends/requests/[id]", () => {
  it("returns 400 for invalid request id", async () => {
    const response = await patchFriendRequest(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          body: { status: "accepted" },
          params: { id: "bad-id" },
          url: "http://localhost/api/fan/friends/requests/bad-id",
        },
      ),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await patchFriendRequest(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          rawBody: "{",
          params: { id: requestId },
          url: `http://localhost/api/fan/friends/requests/${requestId}`,
        },
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Nieprawidłowe dane JSON" });
  });

  it("accepts a friend request", async () => {
    const response = await patchFriendRequest(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          body: { status: "accepted" },
          params: { id: requestId },
          url: `http://localhost/api/fan/friends/requests/${requestId}`,
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockUpdateFriendRequestStatus).toHaveBeenCalledWith(expect.anything(), mockUser.id, requestId, "accepted");
  });

  it("declines a friend request", async () => {
    mockUpdateFriendRequestStatus.mockResolvedValueOnce({ data: { ...mockRequest, status: "declined" } });

    const response = await patchFriendRequest(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          body: { status: "declined" },
          params: { id: requestId },
          url: `http://localhost/api/fan/friends/requests/${requestId}`,
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockUpdateFriendRequestStatus).toHaveBeenCalledWith(expect.anything(), mockUser.id, requestId, "declined");
  });
});

describe("DELETE /api/fan/friends/[id]", () => {
  it("returns 401 when not logged in", async () => {
    const response = await deleteFriend(
      mockContext(
        {},
        {
          method: "DELETE",
          params: { id: friendshipId },
          url: `http://localhost/api/fan/friends/${friendshipId}`,
        },
      ),
    );

    expect(response.status).toBe(401);
  });

  it("deletes an accepted friendship", async () => {
    const response = await deleteFriend(
      mockContext(
        { user: mockUser },
        {
          method: "DELETE",
          params: { id: friendshipId },
          url: `http://localhost/api/fan/friends/${friendshipId}`,
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockRemoveFriendship).toHaveBeenCalledWith(expect.anything(), mockUser.id, friendshipId);
    await expect(response.json()).resolves.toEqual({ deleted: true });
  });
});

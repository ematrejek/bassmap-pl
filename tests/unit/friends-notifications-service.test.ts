import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFriendRequestByLogin, updateFriendRequestStatus } from "@/lib/services/friends";
import { getFanProfileByLogin } from "@/lib/services/fan-profile";
import { createNotification } from "@/lib/services/notifications";

const requesterId = "11111111-1111-1111-1111-111111111111";
const addresseeId = "22222222-2222-2222-2222-222222222222";
const requestId = "33333333-3333-3333-3333-333333333333";

const pendingRequestRow = {
  id: requestId,
  requester_id: requesterId,
  addressee_id: addresseeId,
  status: "pending",
  pair_user_low: requesterId,
  pair_user_high: addresseeId,
  created_at: "2026-06-25T10:00:00.000Z",
  updated_at: "2026-06-25T10:00:00.000Z",
};

const acceptedRequestRow = {
  ...pendingRequestRow,
  status: "accepted",
  updated_at: "2026-06-25T10:05:00.000Z",
};

vi.mock("@/lib/services/fan-profile", () => ({
  getFanProfileByLogin: vi.fn(() =>
    Promise.resolve({
      data: {
        userId: addresseeId,
        login: "fan_b",
      },
    }),
  ),
}));

vi.mock("@/lib/services/notifications", () => ({
  createNotification: vi.fn(() => Promise.resolve({ data: { id: "44444444-4444-4444-4444-444444444444" } })),
}));

const mockGetFanProfileByLogin = vi.mocked(getFanProfileByLogin);
const mockCreateNotification = vi.mocked(createNotification);

function createFriendsSupabaseMock() {
  return {
    from(table: string) {
      if (table === "fan_profiles") {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  { user_id: requesterId, login: "fan_a" },
                  { user_id: addresseeId, login: "fan_b" },
                ],
                error: null,
              }),
          }),
        };
      }

      if (table !== "friend_requests") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          or: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: pendingRequestRow, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: pendingRequestRow, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: acceptedRequestRow, error: null }),
            }),
          }),
        }),
      };
    },
  };
}

describe("friends notification service behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFanProfileByLogin.mockResolvedValue({
      data: {
        userId: addresseeId,
        login: "fan_b",
        bio: null,
        city: null,
        favoriteSubgenres: [],
        instagramUrl: null,
        soundcloudUrl: null,
        facebookUrl: null,
        spotifyUrl: null,
        twitchUrl: null,
        favouriteTrackPlatform: null,
        favouriteTrackUrl: null,
        favouriteTrackTitle: null,
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T10:00:00.000Z",
      },
    });
    mockCreateNotification.mockResolvedValue({ data: { id: "44444444-4444-4444-4444-444444444444" } });
  });

  it("creates a notification for the addressee when a new friend request is sent", async () => {
    const supabase = createFriendsSupabaseMock();

    const result = await createFriendRequestByLogin(supabase as never, requesterId, "fan_b");

    expect(result).toEqual({
      data: {
        request: {
          id: requestId,
          requester: { userId: requesterId, login: "fan_a", profileUrl: "/u/fan_a" },
          addressee: { userId: addresseeId, login: "fan_b", profileUrl: "/u/fan_b" },
          status: "pending",
          createdAt: "2026-06-25T10:00:00.000Z",
          updatedAt: "2026-06-25T10:00:00.000Z",
        },
        state: "created",
      },
    });
    expect(mockCreateNotification).toHaveBeenCalledWith(supabase, {
      recipientId: addresseeId,
      actorId: requesterId,
      actorLabel: "@fan_a",
      type: "friend_request",
      friendRequestId: requestId,
      body: "@fan_a chce dodać Cię do znajomych.",
    });
  });

  it("creates a notification for the requester when a friend request is accepted", async () => {
    const supabase = createFriendsSupabaseMock();

    const result = await updateFriendRequestStatus(supabase as never, addresseeId, requestId, "accepted");

    expect(result).toEqual({
      data: {
        id: requestId,
        requester: { userId: requesterId, login: "fan_a", profileUrl: "/u/fan_a" },
        addressee: { userId: addresseeId, login: "fan_b", profileUrl: "/u/fan_b" },
        status: "accepted",
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T10:05:00.000Z",
      },
    });
    expect(mockCreateNotification).toHaveBeenCalledWith(supabase, {
      recipientId: requesterId,
      actorId: addresseeId,
      actorLabel: "@fan_b",
      type: "friend_request_accepted",
      friendRequestId: requestId,
      body: "@fan_b zaakceptował(a) Twoje zaproszenie do znajomych.",
    });
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";
import { getFanProfileByLogin } from "@/lib/services/fan-profile";
import { createNotification } from "@/lib/services/notifications";
import type { FriendRequestRow, FriendRequestStatus, FanProfileRow } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

const FRIEND_REQUEST_SELECT =
  "id, requester_id, addressee_id, status, pair_user_low, pair_user_high, created_at, updated_at";
const FAN_PROFILE_PUBLIC_SELECT = "user_id, login";

export const FRIEND_REQUEST_NOT_FOUND_ERROR = "Nie znaleziono zaproszenia";
export const FRIEND_REQUEST_FORBIDDEN_ERROR = "Nie możesz zmienić tego zaproszenia";
export const FRIEND_REQUEST_NOT_PENDING_ERROR = "To zaproszenie zostało już obsłużone";
export const FRIENDSHIP_NOT_FOUND_ERROR = "Nie znaleziono relacji znajomych";
export const FRIENDSHIP_ALREADY_EXISTS_ERROR = "Jesteście już znajomymi";
export const FRIEND_REQUEST_ALREADY_PENDING_ERROR = "Zaproszenie jest już wysłane";
export const FRIEND_REQUEST_SELF_ERROR = "Nie możesz zaprosić samego siebie";
export const FRIEND_TARGET_NOT_FOUND_ERROR = "Nie znaleziono fana o takim loginie";

export interface FriendProfileSummary {
  userId: string;
  login: string | null;
  profileUrl: string | null;
}

export interface FriendRequestSummary {
  id: string;
  requester: FriendProfileSummary;
  addressee: FriendProfileSummary;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FriendSummary {
  id: string;
  user: FriendProfileSummary;
  acceptedAt: string;
}

export interface FriendsOverview {
  friends: FriendSummary[];
  incomingRequests: FriendRequestSummary[];
  outgoingRequests: FriendRequestSummary[];
}

export interface FriendRequestActionResult {
  request: FriendRequestSummary;
  state: "created" | "incoming_pending" | "outgoing_pending";
}

function mapProfile(row: Pick<FanProfileRow, "user_id" | "login"> | undefined, userId: string): FriendProfileSummary {
  const login = row?.login ?? null;
  return {
    userId,
    login,
    profileUrl: login ? `/u/${login}` : null,
  };
}

function profileLabel(profile: FriendProfileSummary): string {
  return profile.login ? `@${profile.login}` : "Fan BassMap";
}

function mapRequestRow(
  row: FriendRequestRow,
  profilesByUserId: Map<string, Pick<FanProfileRow, "user_id" | "login">>,
): FriendRequestSummary {
  return {
    id: row.id,
    requester: mapProfile(profilesByUserId.get(row.requester_id), row.requester_id),
    addressee: mapProfile(profilesByUserId.get(row.addressee_id), row.addressee_id),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getProfilesByUserIds(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<ServiceResult<Map<string, Pick<FanProfileRow, "user_id" | "login">>>> {
  const uniqueUserIds = Array.from(new Set(userIds));
  if (uniqueUserIds.length === 0) {
    return { data: new Map() };
  }

  const response = await supabase.from("fan_profiles").select(FAN_PROFILE_PUBLIC_SELECT).in("user_id", uniqueUserIds);
  if (response.error) {
    return { error: response.error.message };
  }

  const rows = response.data as unknown as Pick<FanProfileRow, "user_id" | "login">[];
  return { data: new Map(rows.map((row) => [row.user_id, row])) };
}

async function getFriendRequestById(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ServiceResult<FriendRequestRow | null>> {
  const response = await supabase
    .from("friend_requests")
    .select(FRIEND_REQUEST_SELECT)
    .eq("id", requestId)
    .maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: response.data };
}

async function getFriendRequestBetweenUsers(
  supabase: SupabaseClient,
  userId: string,
  targetUserId: string,
): Promise<ServiceResult<FriendRequestRow | null>> {
  const response = await supabase
    .from("friend_requests")
    .select(FRIEND_REQUEST_SELECT)
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${userId})`,
    )
    .maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: response.data };
}

async function mapSingleRequest(
  supabase: SupabaseClient,
  row: FriendRequestRow,
): Promise<ServiceResult<FriendRequestSummary>> {
  const profiles = await getProfilesByUserIds(supabase, [row.requester_id, row.addressee_id]);
  if ("error" in profiles) {
    return profiles;
  }

  return { data: mapRequestRow(row, profiles.data) };
}

export async function listFriendsOverview(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServiceResult<FriendsOverview>> {
  const [acceptedResponse, pendingResponse] = await Promise.all([
    supabase
      .from("friend_requests")
      .select(FRIEND_REQUEST_SELECT)
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("updated_at", { ascending: false }),
    supabase
      .from("friend_requests")
      .select(FRIEND_REQUEST_SELECT)
      .eq("status", "pending")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
  ]);

  if (acceptedResponse.error) {
    return { error: acceptedResponse.error.message };
  }
  if (pendingResponse.error) {
    return { error: pendingResponse.error.message };
  }

  const acceptedRows = acceptedResponse.data as unknown as FriendRequestRow[];
  const pendingRows = pendingResponse.data as unknown as FriendRequestRow[];
  const profileUserIds = [...acceptedRows, ...pendingRows].flatMap((row) => [row.requester_id, row.addressee_id]);
  const profiles = await getProfilesByUserIds(supabase, profileUserIds);
  if ("error" in profiles) {
    return profiles;
  }

  const friends = acceptedRows.map((row) => {
    const friendUserId = row.requester_id === userId ? row.addressee_id : row.requester_id;
    return {
      id: row.id,
      user: mapProfile(profiles.data.get(friendUserId), friendUserId),
      acceptedAt: row.updated_at,
    };
  });

  const mappedPending = pendingRows.map((row) => mapRequestRow(row, profiles.data));

  return {
    data: {
      friends,
      incomingRequests: mappedPending.filter((request) => request.addressee.userId === userId),
      outgoingRequests: mappedPending.filter((request) => request.requester.userId === userId),
    },
  };
}

export async function createFriendRequestByLogin(
  supabase: SupabaseClient,
  requesterId: string,
  targetLogin: string,
): Promise<ServiceResult<FriendRequestActionResult>> {
  const targetProfile = await getFanProfileByLogin(supabase, targetLogin);
  if ("error" in targetProfile) {
    return targetProfile;
  }
  if (!targetProfile.data) {
    return { error: FRIEND_TARGET_NOT_FOUND_ERROR };
  }

  const addresseeId = targetProfile.data.userId;
  if (addresseeId === requesterId) {
    return { error: FRIEND_REQUEST_SELF_ERROR };
  }

  const existing = await getFriendRequestBetweenUsers(supabase, requesterId, addresseeId);
  if ("error" in existing) {
    return existing;
  }

  if (existing.data) {
    if (existing.data.status === "accepted") {
      return { error: FRIENDSHIP_ALREADY_EXISTS_ERROR };
    }
    if (existing.data.status !== "pending") {
      return { error: FRIEND_REQUEST_NOT_PENDING_ERROR };
    }

    const mapped = await mapSingleRequest(supabase, existing.data);
    if ("error" in mapped) {
      return mapped;
    }

    return {
      data: {
        request: mapped.data,
        state: existing.data.addressee_id === requesterId ? "incoming_pending" : "outgoing_pending",
      },
    };
  }

  const response = await supabase
    .from("friend_requests")
    .insert({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: "pending",
    })
    .select(FRIEND_REQUEST_SELECT)
    .single();

  if (response.error) {
    if (response.error.code === "23505") {
      return { error: FRIEND_REQUEST_ALREADY_PENDING_ERROR };
    }
    if (response.error.code === "42501") {
      return { error: "Nie możesz wysłać tego zaproszenia" };
    }
    return { error: response.error.message };
  }

  const createdRequest = response.data;
  const mapped = await mapSingleRequest(supabase, createdRequest);
  if ("error" in mapped) {
    return mapped;
  }

  const requesterLabel = profileLabel(mapped.data.requester);
  const notification = await createNotification(supabase, {
    recipientId: addresseeId,
    actorId: requesterId,
    actorLabel: requesterLabel,
    type: "friend_request",
    friendRequestId: String(createdRequest.id),
    body: `${requesterLabel} chce dodać Cię do znajomych.`,
  });
  if ("error" in notification) {
    return notification;
  }

  return { data: { request: mapped.data, state: "created" } };
}

export async function updateFriendRequestStatus(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  status: Extract<FriendRequestStatus, "accepted" | "declined">,
): Promise<ServiceResult<FriendRequestSummary>> {
  const existing = await getFriendRequestById(supabase, requestId);
  if ("error" in existing) {
    return existing;
  }
  if (!existing.data) {
    return { error: FRIEND_REQUEST_NOT_FOUND_ERROR };
  }
  if (existing.data.addressee_id !== userId) {
    return { error: FRIEND_REQUEST_FORBIDDEN_ERROR };
  }
  if (existing.data.status !== "pending") {
    return { error: FRIEND_REQUEST_NOT_PENDING_ERROR };
  }

  const response = await supabase
    .from("friend_requests")
    .update({ status })
    .eq("id", requestId)
    .select(FRIEND_REQUEST_SELECT)
    .single();

  if (response.error) {
    if (response.error.code === "42501") {
      return { error: FRIEND_REQUEST_FORBIDDEN_ERROR };
    }
    return { error: response.error.message };
  }

  const mapped = await mapSingleRequest(supabase, response.data);
  if ("error" in mapped) {
    return mapped;
  }

  if (status === "accepted") {
    const addresseeLabel = profileLabel(mapped.data.addressee);
    const notification = await createNotification(supabase, {
      recipientId: existing.data.requester_id,
      actorId: userId,
      actorLabel: addresseeLabel,
      type: "friend_request_accepted",
      friendRequestId: requestId,
      body: `${addresseeLabel} zaakceptował(a) Twoje zaproszenie do znajomych.`,
    });
    if ("error" in notification) {
      return notification;
    }
  }

  return mapped;
}

export async function removeFriendship(
  supabase: SupabaseClient,
  userId: string,
  friendshipId: string,
): Promise<ServiceResult<{ deleted: boolean }>> {
  const existing = await getFriendRequestById(supabase, friendshipId);
  if ("error" in existing) {
    return existing;
  }
  if (
    existing.data?.status !== "accepted" ||
    (existing.data.requester_id !== userId && existing.data.addressee_id !== userId)
  ) {
    return { error: FRIENDSHIP_NOT_FOUND_ERROR };
  }

  const response = await supabase
    .from("friend_requests")
    .delete()
    .eq("id", friendshipId)
    .eq("status", "accepted")
    .select("id")
    .maybeSingle();

  if (response.error) {
    if (response.error.code === "42501") {
      return { error: FRIENDSHIP_NOT_FOUND_ERROR };
    }
    return { error: response.error.message };
  }

  return { data: { deleted: response.data !== null } };
}

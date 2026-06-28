import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Crew,
  CrewContact,
  CrewJoinRequest,
  CrewJoinRequestRow,
  CrewMember,
  CrewMemberRow,
  CrewOverview,
  CrewRow,
  JoinableCrew,
  FanProfileRow,
} from "@/types";
import type { CreateCrewInput, UpdateCrewInput } from "@/lib/fan/crew-schema";

type ServiceResult<T> = { data: T } | { error: string };

const CREW_SELECT = "id, owner_id, name, city, subgenres, description, created_at, updated_at";
const CREW_MEMBER_SELECT = "crew_id, user_id, role, joined_at";
const CREW_JOIN_REQUEST_SELECT = "id, crew_id, requester_id, status, created_at, updated_at";
const FAN_PROFILE_CONTACT_SELECT =
  "user_id, login, instagram_url, soundcloud_url, facebook_url, spotify_url, twitch_url";

export const CREW_NOT_FOUND_ERROR = "Nie znaleziono ekipy";
export const CREW_FORBIDDEN_ERROR = "Nie masz uprawnień do tej ekipy";
export const CREW_ALREADY_EXISTS_ERROR = "Masz już własną ekipę";
export const CREW_MEMBER_NOT_FOUND_ERROR = "Nie znaleziono członka ekipy";
export const CREW_ALREADY_MEMBER_ERROR = "Jesteś już w tej ekipie";
export const CREW_JOIN_REQUEST_NOT_FOUND_ERROR = "Nie znaleziono prośby o dołączenie";
export const CREW_JOIN_REQUEST_ALREADY_PENDING_ERROR = "Prośba o dołączenie jest już wysłana";
export const CREW_JOIN_REQUEST_NOT_PENDING_ERROR = "Ta prośba została już obsłużona";
export const CREW_JOIN_REQUEST_SELF_ERROR = "Nie możesz prosić o dołączenie do własnej ekipy";
export const CREW_CONTACT_NOT_AVAILABLE_ERROR = "Kontakt jest dostępny tylko dla członków tej samej ekipy";
export const CREW_OWNER_CANNOT_LEAVE_ERROR = "Właściciel nie może opuścić własnej ekipy";

type ContactProfileRow = Pick<
  FanProfileRow,
  "user_id" | "login" | "instagram_url" | "soundcloud_url" | "facebook_url" | "spotify_url" | "twitch_url"
>;

function mapCrewRow(row: CrewRow): Crew {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    city: row.city,
    subgenres: row.subgenres,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCrewMemberRow(row: CrewMemberRow, profilesByUserId: Map<string, ContactProfileRow>): CrewMember {
  return {
    crewId: row.crew_id,
    userId: row.user_id,
    role: row.role,
    login: profilesByUserId.get(row.user_id)?.login ?? null,
    joinedAt: row.joined_at,
  };
}

function mapCrewJoinRequestRow(
  row: CrewJoinRequestRow,
  profilesByUserId: Map<string, ContactProfileRow>,
): CrewJoinRequest {
  return {
    id: row.id,
    crewId: row.crew_id,
    requesterId: row.requester_id,
    requesterLogin: profilesByUserId.get(row.requester_id)?.login ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCrewContact(profile: ContactProfileRow): CrewContact {
  return {
    login: profile.login,
    instagramUrl: profile.instagram_url,
    soundcloudUrl: profile.soundcloud_url,
    facebookUrl: profile.facebook_url,
    spotifyUrl: profile.spotify_url,
    twitchUrl: profile.twitch_url,
  };
}

function mapCrewInputToRow(input: CreateCrewInput | UpdateCrewInput): Partial<CrewRow> {
  const row: Partial<CrewRow> = {};
  if (input.name !== undefined) {
    row.name = input.name;
  }
  if (input.city !== undefined) {
    row.city = input.city;
  }
  if (input.subgenres !== undefined) {
    row.subgenres = input.subgenres;
  }
  if (input.description !== undefined) {
    row.description = input.description;
  }
  return row;
}

async function getProfilesByUserIds(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<ServiceResult<Map<string, ContactProfileRow>>> {
  const uniqueUserIds = Array.from(new Set(userIds));
  if (uniqueUserIds.length === 0) {
    return { data: new Map() };
  }

  const response = await supabase.from("fan_profiles").select(FAN_PROFILE_CONTACT_SELECT).in("user_id", uniqueUserIds);
  if (response.error) {
    return { error: response.error.message };
  }

  const rows = response.data as unknown as ContactProfileRow[];
  return { data: new Map(rows.map((row) => [row.user_id, row])) };
}

async function getCrewRowById(supabase: SupabaseClient, crewId: string): Promise<ServiceResult<CrewRow | null>> {
  const response = await supabase.from("crews").select(CREW_SELECT).eq("id", crewId).maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: response.data };
}

async function getCrewJoinRequestById(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ServiceResult<CrewJoinRequestRow | null>> {
  const response = await supabase
    .from("crew_join_requests")
    .select(CREW_JOIN_REQUEST_SELECT)
    .eq("id", requestId)
    .maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: response.data };
}

async function isCrewMember(supabase: SupabaseClient, userId: string, crewId: string): Promise<ServiceResult<boolean>> {
  const response = await supabase
    .from("crew_members")
    .select("crew_id")
    .eq("crew_id", crewId)
    .eq("user_id", userId)
    .maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: response.data !== null };
}

async function mapSingleJoinRequest(
  supabase: SupabaseClient,
  row: CrewJoinRequestRow,
): Promise<ServiceResult<CrewJoinRequest>> {
  const profiles = await getProfilesByUserIds(supabase, [row.requester_id]);
  if ("error" in profiles) {
    return profiles;
  }

  return { data: mapCrewJoinRequestRow(row, profiles.data) };
}

function profileLabel(profile: ContactProfileRow | undefined): string {
  return profile?.login ? `@${profile.login}` : "Fan BassMap";
}

export async function getCrewOverview(supabase: SupabaseClient, userId: string): Promise<ServiceResult<CrewOverview>> {
  const [ownCrewResponse, membershipResponse, outgoingRequestResponse] = await Promise.all([
    supabase.from("crews").select(CREW_SELECT).eq("owner_id", userId).maybeSingle(),
    supabase.from("crew_members").select(CREW_MEMBER_SELECT).eq("user_id", userId).order("joined_at").limit(1),
    supabase
      .from("crew_join_requests")
      .select(CREW_JOIN_REQUEST_SELECT)
      .eq("requester_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (ownCrewResponse.error) {
    return { error: ownCrewResponse.error.message };
  }
  if (membershipResponse.error) {
    return { error: membershipResponse.error.message };
  }
  if (outgoingRequestResponse.error) {
    return { error: outgoingRequestResponse.error.message };
  }

  const ownCrew = ownCrewResponse.data ? mapCrewRow(ownCrewResponse.data) : null;
  const membershipRows = (membershipResponse.data as unknown as CrewMemberRow[] | null) ?? [];
  const selectedCrewId = ownCrew ? ownCrew.id : (membershipRows[0]?.crew_id ?? null);

  let members: CrewMember[] = [];
  let membership: CrewMember | null = null;
  let incomingRequests: CrewJoinRequest[] = [];

  if (selectedCrewId) {
    const [membersResponse, incomingResponse] = await Promise.all([
      supabase.from("crew_members").select(CREW_MEMBER_SELECT).eq("crew_id", selectedCrewId).order("joined_at"),
      ownCrew
        ? supabase
            .from("crew_join_requests")
            .select(CREW_JOIN_REQUEST_SELECT)
            .eq("crew_id", ownCrew.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (membersResponse.error) {
      return { error: membersResponse.error.message };
    }
    if (incomingResponse.error) {
      return { error: incomingResponse.error.message };
    }

    const memberRows = (membersResponse.data as unknown as CrewMemberRow[] | null) ?? [];
    const requestRows = (incomingResponse.data as unknown as CrewJoinRequestRow[] | null) ?? [];
    const profileIds = [...memberRows.map((row) => row.user_id), ...requestRows.map((row) => row.requester_id)];
    const profiles = await getProfilesByUserIds(supabase, profileIds);
    if ("error" in profiles) {
      return profiles;
    }

    members = memberRows.map((row) => mapCrewMemberRow(row, profiles.data));
    membership = members.find((member) => member.userId === userId) ?? null;
    incomingRequests = requestRows.map((row) => mapCrewJoinRequestRow(row, profiles.data));
  }

  const outgoingRows = (outgoingRequestResponse.data as unknown as CrewJoinRequestRow[] | null) ?? [];
  const outgoingRequest = outgoingRows[0] ? await mapSingleJoinRequest(supabase, outgoingRows[0]) : { data: null };
  if ("error" in outgoingRequest) {
    return outgoingRequest;
  }

  return {
    data: {
      ownCrew,
      membership,
      members,
      incomingRequests,
      outgoingRequest: outgoingRequest.data,
    },
  };
}

export async function createCrew(
  supabase: SupabaseClient,
  userId: string,
  input: CreateCrewInput,
): Promise<ServiceResult<Crew>> {
  const response = await supabase
    .from("crews")
    .insert({ owner_id: userId, ...mapCrewInputToRow(input) })
    .select(CREW_SELECT)
    .single();

  if (response.error) {
    if (response.error.code === "23505") {
      return { error: CREW_ALREADY_EXISTS_ERROR };
    }
    return { error: response.error.message };
  }

  return { data: mapCrewRow(response.data) };
}

export async function updateCrew(
  supabase: SupabaseClient,
  userId: string,
  crewId: string,
  input: UpdateCrewInput,
): Promise<ServiceResult<Crew>> {
  const existing = await getCrewRowById(supabase, crewId);
  if ("error" in existing) {
    return existing;
  }
  if (!existing.data) {
    return { error: CREW_NOT_FOUND_ERROR };
  }
  if (existing.data.owner_id !== userId) {
    return { error: CREW_FORBIDDEN_ERROR };
  }

  const response = await supabase
    .from("crews")
    .update(mapCrewInputToRow(input))
    .eq("id", crewId)
    .eq("owner_id", userId)
    .select(CREW_SELECT)
    .single();

  if (response.error) {
    return { error: response.error.message };
  }

  return { data: mapCrewRow(response.data) };
}

export async function deleteCrew(
  supabase: SupabaseClient,
  userId: string,
  crewId: string,
): Promise<ServiceResult<{ deleted: boolean }>> {
  const response = await supabase
    .from("crews")
    .delete()
    .eq("id", crewId)
    .eq("owner_id", userId)
    .select("id")
    .maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }

  if (!response.data) {
    return { error: CREW_NOT_FOUND_ERROR };
  }

  return { data: { deleted: true } };
}

const JOINABLE_CREWS_LIMIT = 50;

export async function listJoinableCrews(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServiceResult<JoinableCrew[]>> {
  const [membershipsResponse, ownCrewResponse, pendingRequestsResponse, crewsResponse] = await Promise.all([
    supabase.from("crew_members").select("crew_id").eq("user_id", userId),
    supabase.from("crews").select("id").eq("owner_id", userId).maybeSingle(),
    supabase
      .from("crew_join_requests")
      .select(CREW_JOIN_REQUEST_SELECT)
      .eq("requester_id", userId)
      .eq("status", "pending"),
    supabase.from("crews").select(CREW_SELECT).order("created_at", { ascending: false }).limit(JOINABLE_CREWS_LIMIT),
  ]);

  if (membershipsResponse.error) {
    return { error: membershipsResponse.error.message };
  }
  if (ownCrewResponse.error) {
    return { error: ownCrewResponse.error.message };
  }
  if (pendingRequestsResponse.error) {
    return { error: pendingRequestsResponse.error.message };
  }
  if (crewsResponse.error) {
    return { error: crewsResponse.error.message };
  }

  const excludedCrewIds = new Set<string>();
  for (const row of (membershipsResponse.data as { crew_id: string }[] | null) ?? []) {
    excludedCrewIds.add(row.crew_id);
  }
  const ownCrewRow = ownCrewResponse.data;
  if (
    ownCrewRow !== null &&
    typeof ownCrewRow === "object" &&
    "id" in ownCrewRow &&
    typeof ownCrewRow.id === "string"
  ) {
    excludedCrewIds.add(ownCrewRow.id);
  }

  const pendingRows = (pendingRequestsResponse.data as unknown as CrewJoinRequestRow[] | null) ?? [];
  const pendingByCrewId = new Map(pendingRows.map((row) => [row.crew_id, row]));
  const profiles = await getProfilesByUserIds(
    supabase,
    pendingRows.map((row) => row.requester_id),
  );
  if ("error" in profiles) {
    return profiles;
  }

  const crewRows = ((crewsResponse.data as unknown as CrewRow[] | null) ?? []).filter(
    (row) => !excludedCrewIds.has(row.id),
  );

  return {
    data: crewRows.map((row) => {
      const pendingRow = pendingByCrewId.get(row.id);
      return {
        crew: mapCrewRow(row),
        pendingRequest: pendingRow ? mapCrewJoinRequestRow(pendingRow, profiles.data) : null,
      };
    }),
  };
}

export async function getCrewByIdForViewer(
  supabase: SupabaseClient,
  viewerId: string,
  crewId: string,
): Promise<
  ServiceResult<{ crew: Crew; members: CrewMember[]; isMember: boolean; pendingRequest: CrewJoinRequest | null }>
> {
  const crew = await getCrewRowById(supabase, crewId);
  if ("error" in crew) {
    return crew;
  }
  if (!crew.data) {
    return { error: CREW_NOT_FOUND_ERROR };
  }

  const memberCheck = await isCrewMember(supabase, viewerId, crewId);
  if ("error" in memberCheck) {
    return memberCheck;
  }

  let members: CrewMember[] = [];
  if (memberCheck.data) {
    const membersResponse = await supabase
      .from("crew_members")
      .select(CREW_MEMBER_SELECT)
      .eq("crew_id", crewId)
      .order("joined_at");

    if (membersResponse.error) {
      return { error: membersResponse.error.message };
    }

    const memberRows = (membersResponse.data as unknown as CrewMemberRow[] | null) ?? [];
    const profiles = await getProfilesByUserIds(
      supabase,
      memberRows.map((row) => row.user_id),
    );
    if ("error" in profiles) {
      return profiles;
    }
    members = memberRows.map((row) => mapCrewMemberRow(row, profiles.data));
  }

  const requestResponse = await supabase
    .from("crew_join_requests")
    .select(CREW_JOIN_REQUEST_SELECT)
    .eq("crew_id", crewId)
    .eq("requester_id", viewerId)
    .eq("status", "pending")
    .maybeSingle();

  if (requestResponse.error) {
    return { error: requestResponse.error.message };
  }

  const pendingRequest = requestResponse.data
    ? await mapSingleJoinRequest(supabase, requestResponse.data)
    : { data: null };
  if ("error" in pendingRequest) {
    return pendingRequest;
  }

  return {
    data: {
      crew: mapCrewRow(crew.data),
      members,
      isMember: memberCheck.data,
      pendingRequest: pendingRequest.data,
    },
  };
}

export async function createCrewJoinRequest(
  supabase: SupabaseClient,
  userId: string,
  crewId: string,
): Promise<ServiceResult<CrewJoinRequest>> {
  const crew = await getCrewRowById(supabase, crewId);
  if ("error" in crew) {
    return crew;
  }
  if (!crew.data) {
    return { error: CREW_NOT_FOUND_ERROR };
  }
  if (crew.data.owner_id === userId) {
    return { error: CREW_JOIN_REQUEST_SELF_ERROR };
  }

  const memberCheck = await isCrewMember(supabase, userId, crewId);
  if ("error" in memberCheck) {
    return memberCheck;
  }
  if (memberCheck.data) {
    return { error: CREW_ALREADY_MEMBER_ERROR };
  }

  const profiles = await getProfilesByUserIds(supabase, [userId]);
  if ("error" in profiles) {
    return profiles;
  }

  const actorLabel = profileLabel(profiles.data.get(userId));
  const response = await supabase.rpc("create_crew_join_request_with_notification", {
    p_crew_id: crewId,
    p_actor_label: actorLabel,
    p_body: `${actorLabel} prosi o dołączenie do ekipy ${crew.data.name}.`,
  });

  if (response.error) {
    if (response.error.code === "23505") {
      return { error: CREW_JOIN_REQUEST_ALREADY_PENDING_ERROR };
    }
    if (response.error.message.includes("already a member")) {
      return { error: CREW_ALREADY_MEMBER_ERROR };
    }
    if (response.error.message.includes("cannot request own crew")) {
      return { error: CREW_JOIN_REQUEST_SELF_ERROR };
    }
    return { error: response.error.message };
  }

  return mapSingleJoinRequest(supabase, response.data as CrewJoinRequestRow);
}

export async function respondCrewJoinRequest(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  status: "accepted" | "declined",
): Promise<ServiceResult<CrewJoinRequest>> {
  const existing = await getCrewJoinRequestById(supabase, requestId);
  if ("error" in existing) {
    return existing;
  }
  if (!existing.data) {
    return { error: CREW_JOIN_REQUEST_NOT_FOUND_ERROR };
  }
  if (existing.data.status !== "pending") {
    return { error: CREW_JOIN_REQUEST_NOT_PENDING_ERROR };
  }

  const crew = await getCrewRowById(supabase, existing.data.crew_id);
  if ("error" in crew) {
    return crew;
  }
  if (!crew.data) {
    return { error: CREW_NOT_FOUND_ERROR };
  }
  if (crew.data.owner_id !== userId) {
    return { error: CREW_FORBIDDEN_ERROR };
  }

  const profiles = await getProfilesByUserIds(supabase, [userId]);
  if ("error" in profiles) {
    return profiles;
  }

  const actorLabel = profileLabel(profiles.data.get(userId));
  const response = await supabase.rpc("respond_crew_join_request_with_notification", {
    p_request_id: requestId,
    p_status: status,
    p_actor_label: actorLabel,
    p_accept_body:
      status === "accepted" ? `${actorLabel} zaakceptował(a) Twoją prośbę do ekipy ${crew.data.name}.` : null,
  });

  if (response.error) {
    if (response.error.message.includes("only crew owner may respond") || response.error.code === "42501") {
      return { error: CREW_FORBIDDEN_ERROR };
    }
    if (response.error.message.includes("must be pending")) {
      return { error: CREW_JOIN_REQUEST_NOT_PENDING_ERROR };
    }
    if (response.error.message.includes("not found")) {
      return { error: CREW_JOIN_REQUEST_NOT_FOUND_ERROR };
    }
    if (response.error.message.includes("already a member")) {
      return { error: CREW_ALREADY_MEMBER_ERROR };
    }
    return { error: response.error.message };
  }

  return mapSingleJoinRequest(supabase, response.data as CrewJoinRequestRow);
}

export async function leaveCrew(
  supabase: SupabaseClient,
  userId: string,
  crewId: string,
): Promise<ServiceResult<{ deleted: boolean }>> {
  const response = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("user_id", userId)
    .eq("role", "member")
    .select("crew_id")
    .maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }
  if (!response.data) {
    return { error: CREW_OWNER_CANNOT_LEAVE_ERROR };
  }

  return { data: { deleted: true } };
}

export async function removeCrewMember(
  supabase: SupabaseClient,
  ownerId: string,
  crewId: string,
  memberUserId: string,
): Promise<ServiceResult<{ deleted: boolean }>> {
  const crew = await getCrewRowById(supabase, crewId);
  if ("error" in crew) {
    return crew;
  }
  if (!crew.data) {
    return { error: CREW_NOT_FOUND_ERROR };
  }
  if (crew.data.owner_id !== ownerId) {
    return { error: CREW_FORBIDDEN_ERROR };
  }
  if (memberUserId === ownerId) {
    return { error: CREW_OWNER_CANNOT_LEAVE_ERROR };
  }

  const response = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("user_id", memberUserId)
    .eq("role", "member")
    .select("crew_id")
    .maybeSingle();

  if (response.error) {
    return { error: response.error.message };
  }
  if (!response.data) {
    return { error: CREW_MEMBER_NOT_FOUND_ERROR };
  }

  return { data: { deleted: true } };
}

export async function getCrewContactForAcceptedPair(
  supabase: SupabaseClient,
  userId: string,
  crewId: string,
  targetUserId: string,
): Promise<ServiceResult<CrewContact>> {
  const [viewerMembership, targetMembership] = await Promise.all([
    isCrewMember(supabase, userId, crewId),
    isCrewMember(supabase, targetUserId, crewId),
  ]);

  if ("error" in viewerMembership) {
    return viewerMembership;
  }
  if ("error" in targetMembership) {
    return targetMembership;
  }
  if (!viewerMembership.data || !targetMembership.data) {
    return { error: CREW_CONTACT_NOT_AVAILABLE_ERROR };
  }

  const profiles = await getProfilesByUserIds(supabase, [targetUserId]);
  if ("error" in profiles) {
    return profiles;
  }

  const profile = profiles.data.get(targetUserId);
  if (!profile) {
    return {
      data: {
        login: null,
        instagramUrl: null,
        soundcloudUrl: null,
        facebookUrl: null,
        spotifyUrl: null,
        twitchUrl: null,
      },
    };
  }

  return { data: mapCrewContact(profile) };
}

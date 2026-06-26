import { afterAll, describe, expect, it } from "vitest";
import {
  createAnonClient,
  createAuthenticatedClient,
  createNonAdminClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

const INTEGRATION_CREW_OWNER_EMAIL = "integration-crew-owner@example.com";
const INTEGRATION_CREW_OWNER_PASSWORD = "IntegrationCrewOwner!2026";
const INTEGRATION_CREW_CANDIDATE_EMAIL = "integration-crew-candidate@example.com";
const INTEGRATION_CREW_CANDIDATE_PASSWORD = "IntegrationCrewCandidate!2026";
const INTEGRATION_CREW_UNRELATED_EMAIL = "integration-crew-unrelated@example.com";
const INTEGRATION_CREW_UNRELATED_PASSWORD = "IntegrationCrewUnrelated!2026";

async function ensureAuthUser(
  serviceClient: ReturnType<typeof createServiceClient>,
  email: string,
  password: string,
): Promise<string> {
  const createResult = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already")) {
    throw new Error(`Failed to create user ${email}: ${createResult.error.message}`);
  }

  const listResult = await serviceClient.auth.admin.listUsers();
  const existing = listResult.data.users.find((user) => user.email === email);
  if (!existing) {
    throw new Error(`User ${email} not found after create`);
  }

  return existing.id;
}

describe.skipIf(!runIntegration)("crew teams (RLS)", () => {
  const cleanupCrewIds: string[] = [];
  const cleanupRequestIds: string[] = [];
  const cleanupNotificationIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();

    if (cleanupNotificationIds.length > 0) {
      const response = await serviceClient.from("notifications").delete().in("id", cleanupNotificationIds);
      if (response.error) {
        throw new Error(`Failed to delete notification fixtures: ${response.error.message}`);
      }
    }

    if (cleanupRequestIds.length > 0) {
      const response = await serviceClient.from("crew_join_requests").delete().in("id", cleanupRequestIds);
      if (response.error) {
        throw new Error(`Failed to delete crew join request fixtures: ${response.error.message}`);
      }
    }

    if (cleanupCrewIds.length > 0) {
      const response = await serviceClient.from("crews").delete().in("id", cleanupCrewIds);
      if (response.error) {
        throw new Error(`Failed to delete crew fixtures: ${response.error.message}`);
      }
    }
  });

  it("auto-adds owner as crew member on crew create", async () => {
    const serviceClient = createServiceClient();
    const ownerId = await ensureAuthUser(serviceClient, INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);

    await serviceClient.from("crews").delete().eq("owner_id", ownerId);

    const ownerClient = await createAuthenticatedClient(INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);

    const crewInsert = await ownerClient
      .from("crews")
      .insert({
        owner_id: ownerId,
        name: "Integration Crew Alpha",
        subgenres: ["neurofunk"],
      })
      .select("id")
      .single();

    expect(crewInsert.error).toBeNull();
    if (!crewInsert.data) {
      throw new Error("Expected crew insert to succeed");
    }

    const crewId = crewInsert.data.id as string;
    cleanupCrewIds.push(crewId);

    const membersRead = await ownerClient
      .from("crew_members")
      .select("role")
      .eq("crew_id", crewId)
      .eq("user_id", ownerId)
      .single();

    expect(membersRead.error).toBeNull();
    expect(membersRead.data?.role).toBe("owner");
  }, 20_000);

  it("allows authenticated users to read crews but hides members from non-members", async () => {
    const serviceClient = createServiceClient();
    const ownerId = await ensureAuthUser(serviceClient, INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);
    const unrelatedId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_CREW_UNRELATED_EMAIL,
      INTEGRATION_CREW_UNRELATED_PASSWORD,
    );

    await serviceClient.from("crews").delete().eq("owner_id", ownerId);

    const crewInsert = await serviceClient
      .from("crews")
      .insert({
        owner_id: ownerId,
        name: "Integration Crew Visibility",
        subgenres: ["liquid_dnb"],
      })
      .select("id")
      .single();

    if (crewInsert.error) {
      throw new Error(`Crew fixture failed: ${crewInsert.error.message}`);
    }

    const crewId = crewInsert.data.id as string;
    cleanupCrewIds.push(crewId);

    const unrelatedClient = await createAuthenticatedClient(
      INTEGRATION_CREW_UNRELATED_EMAIL,
      INTEGRATION_CREW_UNRELATED_PASSWORD,
    );
    const anonClient = createAnonClient();

    const unrelatedCrewRead = await unrelatedClient.from("crews").select("id").eq("id", crewId).maybeSingle();
    expect(unrelatedCrewRead.error).toBeNull();
    expect(unrelatedCrewRead.data?.id).toBe(crewId);

    const anonCrewRead = await anonClient.from("crews").select("id").eq("id", crewId).maybeSingle();
    expect(anonCrewRead.error).toBeNull();
    expect(anonCrewRead.data).toBeNull();

    const unrelatedMembersRead = await unrelatedClient.from("crew_members").select("user_id").eq("crew_id", crewId);
    expect(unrelatedMembersRead.error).toBeNull();
    expect(unrelatedMembersRead.data ?? []).toHaveLength(0);

    const ownerClient = await createAuthenticatedClient(INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);
    const ownerMembersRead = await ownerClient.from("crew_members").select("user_id").eq("crew_id", crewId);
    expect(ownerMembersRead.error).toBeNull();
    expect(ownerMembersRead.data ?? []).toHaveLength(1);

    void unrelatedId;
  }, 20_000);

  it("allows requester and owner to read join requests; denies unrelated user", async () => {
    const serviceClient = createServiceClient();
    const ownerId = await ensureAuthUser(serviceClient, INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);
    const candidateId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_CREW_CANDIDATE_EMAIL,
      INTEGRATION_CREW_CANDIDATE_PASSWORD,
    );

    await serviceClient.from("crews").delete().eq("owner_id", ownerId);
    await serviceClient.from("crew_join_requests").delete().eq("requester_id", candidateId);

    const crewInsert = await serviceClient
      .from("crews")
      .insert({
        owner_id: ownerId,
        name: "Integration Crew Requests",
        subgenres: ["jump_up"],
      })
      .select("id")
      .single();

    if (crewInsert.error) {
      throw new Error(`Crew fixture failed: ${crewInsert.error.message}`);
    }

    const crewId = crewInsert.data.id as string;
    cleanupCrewIds.push(crewId);

    const requestInsert = await serviceClient
      .from("crew_join_requests")
      .insert({
        crew_id: crewId,
        requester_id: candidateId,
        status: "pending",
      })
      .select("id")
      .single();

    if (requestInsert.error) {
      throw new Error(`Join request fixture failed: ${requestInsert.error.message}`);
    }

    const requestId = requestInsert.data.id as string;
    cleanupRequestIds.push(requestId);

    const ownerClient = await createAuthenticatedClient(INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);
    const candidateClient = await createAuthenticatedClient(
      INTEGRATION_CREW_CANDIDATE_EMAIL,
      INTEGRATION_CREW_CANDIDATE_PASSWORD,
    );
    const unrelatedClient = await createAuthenticatedClient(
      INTEGRATION_CREW_UNRELATED_EMAIL,
      INTEGRATION_CREW_UNRELATED_PASSWORD,
    );

    const ownerRead = await ownerClient.from("crew_join_requests").select("id").eq("id", requestId).maybeSingle();
    expect(ownerRead.error).toBeNull();
    expect(ownerRead.data?.id).toBe(requestId);

    const candidateRead = await candidateClient
      .from("crew_join_requests")
      .select("id")
      .eq("id", requestId)
      .maybeSingle();
    expect(candidateRead.error).toBeNull();
    expect(candidateRead.data?.id).toBe(requestId);

    const unrelatedRead = await unrelatedClient
      .from("crew_join_requests")
      .select("id")
      .eq("id", requestId)
      .maybeSingle();
    expect(unrelatedRead.error).toBeNull();
    expect(unrelatedRead.data).toBeNull();
  }, 25_000);

  it("prevents spoofing requester_id on join request insert", async () => {
    const serviceClient = createServiceClient();
    const ownerId = await ensureAuthUser(serviceClient, INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);
    const candidateId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_CREW_CANDIDATE_EMAIL,
      INTEGRATION_CREW_CANDIDATE_PASSWORD,
    );

    await serviceClient.from("crews").delete().eq("owner_id", ownerId);

    const crewInsert = await serviceClient
      .from("crews")
      .insert({
        owner_id: ownerId,
        name: "Integration Crew Spoof",
        subgenres: ["techstep"],
      })
      .select("id")
      .single();

    if (crewInsert.error) {
      throw new Error(`Crew fixture failed: ${crewInsert.error.message}`);
    }

    const crewId = crewInsert.data.id as string;
    cleanupCrewIds.push(crewId);

    const candidateClient = await createAuthenticatedClient(
      INTEGRATION_CREW_CANDIDATE_EMAIL,
      INTEGRATION_CREW_CANDIDATE_PASSWORD,
    );

    const spoofInsert = await candidateClient.from("crew_join_requests").insert({
      crew_id: crewId,
      requester_id: ownerId,
      status: "pending",
    });

    expect(spoofInsert.error).not.toBeNull();
    void candidateId;
  }, 20_000);

  it("allows only crew owner to accept a pending join request via update", async () => {
    const serviceClient = createServiceClient();
    const ownerId = await ensureAuthUser(serviceClient, INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);
    const candidateId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_CREW_CANDIDATE_EMAIL,
      INTEGRATION_CREW_CANDIDATE_PASSWORD,
    );

    await serviceClient.from("crews").delete().eq("owner_id", ownerId);
    await serviceClient.from("crew_join_requests").delete().eq("requester_id", candidateId);

    const crewInsert = await serviceClient
      .from("crews")
      .insert({
        owner_id: ownerId,
        name: "Integration Crew Accept",
        subgenres: ["darkstep"],
      })
      .select("id")
      .single();

    if (crewInsert.error) {
      throw new Error(`Crew fixture failed: ${crewInsert.error.message}`);
    }

    const crewId = crewInsert.data.id as string;
    cleanupCrewIds.push(crewId);

    const requestInsert = await serviceClient
      .from("crew_join_requests")
      .insert({
        crew_id: crewId,
        requester_id: candidateId,
        status: "pending",
      })
      .select("id")
      .single();

    if (requestInsert.error) {
      throw new Error(`Join request fixture failed: ${requestInsert.error.message}`);
    }

    const requestId = requestInsert.data.id as string;
    cleanupRequestIds.push(requestId);

    const candidateClient = await createAuthenticatedClient(
      INTEGRATION_CREW_CANDIDATE_EMAIL,
      INTEGRATION_CREW_CANDIDATE_PASSWORD,
    );

    const candidateAccept = await candidateClient
      .from("crew_join_requests")
      .update({ status: "accepted" })
      .eq("id", requestId)
      .select("status");
    expect(candidateAccept.error).toBeNull();
    expect(candidateAccept.data ?? []).toHaveLength(0);

    const stillPending = await serviceClient.from("crew_join_requests").select("status").eq("id", requestId).single();
    expect(stillPending.data?.status).toBe("pending");

    const ownerClient = await createAuthenticatedClient(INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);

    const ownerAccept = await ownerClient
      .from("crew_join_requests")
      .update({ status: "accepted" })
      .eq("id", requestId)
      .select("status")
      .single();

    expect(ownerAccept.error).toBeNull();
    expect(ownerAccept.data?.status).toBe("accepted");
  }, 25_000);

  it("allows only crew owner to accept a join request via RPC and creates membership notification", async () => {
    const serviceClient = createServiceClient();
    const ownerId = await ensureAuthUser(serviceClient, INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);
    const candidateId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_CREW_CANDIDATE_EMAIL,
      INTEGRATION_CREW_CANDIDATE_PASSWORD,
    );

    await serviceClient.from("crews").delete().eq("owner_id", ownerId);
    await serviceClient.from("crew_join_requests").delete().eq("requester_id", candidateId);

    const crewInsert = await serviceClient
      .from("crews")
      .insert({
        owner_id: ownerId,
        name: "Integration Crew RPC",
        subgenres: ["jungle"],
      })
      .select("id")
      .single();

    if (crewInsert.error) {
      throw new Error(`Crew fixture failed: ${crewInsert.error.message}`);
    }

    const crewId = crewInsert.data.id as string;
    cleanupCrewIds.push(crewId);

    const candidateClient = await createAuthenticatedClient(
      INTEGRATION_CREW_CANDIDATE_EMAIL,
      INTEGRATION_CREW_CANDIDATE_PASSWORD,
    );

    const createRequest = await candidateClient.rpc("create_crew_join_request_with_notification", {
      p_crew_id: crewId,
      p_actor_label: "@candidate",
      p_body: "@candidate prosi o dołączenie do ekipy.",
    });

    expect(createRequest.error).toBeNull();
    const requestId = (createRequest.data as { id: string }).id;
    cleanupRequestIds.push(requestId);

    const unrelatedClient = await createAuthenticatedClient(
      INTEGRATION_CREW_UNRELATED_EMAIL,
      INTEGRATION_CREW_UNRELATED_PASSWORD,
    );
    const unrelatedAccept = await unrelatedClient.rpc("respond_crew_join_request_with_notification", {
      p_request_id: requestId,
      p_status: "accepted",
      p_actor_label: "@unrelated",
      p_accept_body: "@unrelated akceptuje prośbę.",
    });
    expect(unrelatedAccept.error).not.toBeNull();

    const ownerClient = await createAuthenticatedClient(INTEGRATION_CREW_OWNER_EMAIL, INTEGRATION_CREW_OWNER_PASSWORD);
    const ownerAccept = await ownerClient.rpc("respond_crew_join_request_with_notification", {
      p_request_id: requestId,
      p_status: "accepted",
      p_actor_label: "@owner",
      p_accept_body: "@owner zaakceptował(a) Twoją prośbę do ekipy.",
    });

    expect(ownerAccept.error).toBeNull();
    expect((ownerAccept.data as { status: string }).status).toBe("accepted");

    const memberRead = await serviceClient
      .from("crew_members")
      .select("role")
      .eq("crew_id", crewId)
      .eq("user_id", candidateId)
      .single();
    expect(memberRead.error).toBeNull();
    expect(memberRead.data?.role).toBe("member");

    const notificationRead = await serviceClient
      .from("notifications")
      .select("id, type")
      .eq("crew_join_request_id", requestId)
      .eq("type", "crew_join_accepted")
      .single();
    expect(notificationRead.error).toBeNull();
    expect(notificationRead.data?.type).toBe("crew_join_accepted");
    cleanupNotificationIds.push(notificationRead.data?.id as string);
  }, 25_000);

  it("keeps legacy notification types working after crew extension", async () => {
    const serviceClient = createServiceClient();
    const recipientId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_CREW_CANDIDATE_EMAIL,
      INTEGRATION_CREW_CANDIDATE_PASSWORD,
    );
    const senderClient = await createNonAdminClient();
    const {
      data: { user: sender },
    } = await senderClient.auth.getUser();

    if (!sender) {
      throw new Error("Sender not signed in");
    }

    const seedResponse = await serviceClient
      .from("notifications")
      .insert({
        recipient_id: recipientId,
        actor_id: sender.id,
        actor_label: "fan_legacy",
        type: "friend_request",
        body: "Stary typ powiadomienia nadal działa",
      })
      .select("id")
      .single();

    expect(seedResponse.error).toBeNull();
    const notificationId = seedResponse.data?.id as string;
    cleanupNotificationIds.push(notificationId);

    const recipientClient = await createAuthenticatedClient(
      INTEGRATION_CREW_CANDIDATE_EMAIL,
      INTEGRATION_CREW_CANDIDATE_PASSWORD,
    );

    const recipientRead = await recipientClient
      .from("notifications")
      .select("id, type")
      .eq("id", notificationId)
      .single();
    expect(recipientRead.error).toBeNull();
    expect(recipientRead.data?.type).toBe("friend_request");
  }, 20_000);
});

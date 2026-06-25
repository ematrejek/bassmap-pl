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

const INTEGRATION_SECOND_FAN_EMAIL = "integration-friends-b@example.com";
const INTEGRATION_SECOND_FAN_PASSWORD = "IntegrationFriendsB!2026";
const INTEGRATION_THIRD_FAN_EMAIL = "integration-friends-c@example.com";
const INTEGRATION_THIRD_FAN_PASSWORD = "IntegrationFriendsC!2026";

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

function futureStartsAt(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString();
}

async function insertPublishedEventFixture(
  serviceClient: ReturnType<typeof createServiceClient>,
  label: string,
): Promise<string> {
  const response = await serviceClient
    .from("events")
    .insert({
      name: `integration-friends-recs ${label}`,
      starts_at: futureStartsAt(60),
      city: "TestMutation",
      venue_name: "Test Venue",
      address_street: "Testowa",
      address_number: "1",
      latitude: 52.2297,
      longitude: 21.0122,
      subgenres: ["neurofunk"],
      is_free: true,
      status: "published",
    })
    .select("id")
    .single();

  if (response.error) {
    throw new Error(`Failed to insert event fixture: ${response.error.message}`);
  }

  return response.data.id as string;
}

describe.skipIf(!runIntegration)("friends, recommendations, notifications (RLS)", () => {
  const cleanupFriendRequestIds: string[] = [];
  const cleanupNotificationIds: string[] = [];
  const cleanupRecommendationIds: string[] = [];
  const cleanupEventIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();

    if (cleanupRecommendationIds.length > 0) {
      const response = await serviceClient
        .from("event_recommendations")
        .delete()
        .in("id", cleanupRecommendationIds);
      if (response.error) {
        throw new Error(`Failed to delete recommendation fixtures: ${response.error.message}`);
      }
    }

    if (cleanupNotificationIds.length > 0) {
      const response = await serviceClient.from("notifications").delete().in("id", cleanupNotificationIds);
      if (response.error) {
        throw new Error(`Failed to delete notification fixtures: ${response.error.message}`);
      }
    }

    if (cleanupFriendRequestIds.length > 0) {
      const response = await serviceClient.from("friend_requests").delete().in("id", cleanupFriendRequestIds);
      if (response.error) {
        throw new Error(`Failed to delete friend request fixtures: ${response.error.message}`);
      }
    }

    if (cleanupEventIds.length > 0) {
      const response = await serviceClient.from("events").delete().in("id", cleanupEventIds);
      if (response.error) {
        throw new Error(`Failed to delete event fixtures: ${response.error.message}`);
      }
    }
  });

  it("enforces pair uniqueness for A -> B and B -> A", async () => {
    const serviceClient = createServiceClient();
    const userAId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_SECOND_FAN_EMAIL,
      INTEGRATION_SECOND_FAN_PASSWORD,
    );
    const userBId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_THIRD_FAN_EMAIL,
      INTEGRATION_THIRD_FAN_PASSWORD,
    );

    await serviceClient
      .from("friend_requests")
      .delete()
      .or(`pair_user_low.eq.${userAId},pair_user_high.eq.${userAId}`);

    const clientA = await createAuthenticatedClient(INTEGRATION_SECOND_FAN_EMAIL, INTEGRATION_SECOND_FAN_PASSWORD);

    const firstInsert = await clientA.from("friend_requests").insert({
      requester_id: userAId,
      addressee_id: userBId,
      status: "pending",
      pair_user_low: userAId,
      pair_user_high: userBId,
    }).select("id").single();

    expect(firstInsert.error).toBeNull();
    if (!firstInsert.data) {
      throw new Error("Expected first friend request insert to succeed");
    }
    cleanupFriendRequestIds.push(firstInsert.data.id as string);

    const clientB = await createAuthenticatedClient(INTEGRATION_THIRD_FAN_EMAIL, INTEGRATION_THIRD_FAN_PASSWORD);

    const reverseInsert = await clientB.from("friend_requests").insert({
      requester_id: userBId,
      addressee_id: userAId,
      status: "pending",
      pair_user_low: userAId,
      pair_user_high: userBId,
    });

    expect(reverseInsert.error).not.toBeNull();
  }, 20_000);

  it("allows requester and addressee to SELECT friend request; denies unrelated user and anon", async () => {
    const serviceClient = createServiceClient();
    const requesterClient = await createNonAdminClient();
    const {
      data: { user: requester },
    } = await requesterClient.auth.getUser();

    if (!requester) {
      throw new Error("Requester not signed in");
    }

    const addresseeId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_SECOND_FAN_EMAIL,
      INTEGRATION_SECOND_FAN_PASSWORD,
    );
    const unrelatedId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_THIRD_FAN_EMAIL,
      INTEGRATION_THIRD_FAN_PASSWORD,
    );

    await serviceClient
      .from("friend_requests")
      .delete()
      .or(
        `and(requester_id.eq.${requester.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requester.id})`,
      );

    const insertResponse = await serviceClient
      .from("friend_requests")
      .insert({
        requester_id: requester.id,
        addressee_id: addresseeId,
        status: "pending",
        pair_user_low: requester.id < addresseeId ? requester.id : addresseeId,
        pair_user_high: requester.id < addresseeId ? addresseeId : requester.id,
      })
      .select("id")
      .single();

    if (insertResponse.error || !insertResponse.data) {
      throw new Error(`Service insert failed: ${insertResponse.error?.message}`);
    }

    const requestId = insertResponse.data.id as string;
    cleanupFriendRequestIds.push(requestId);

    const addresseeClient = await createAuthenticatedClient(
      INTEGRATION_SECOND_FAN_EMAIL,
      INTEGRATION_SECOND_FAN_PASSWORD,
    );
    const unrelatedClient = await createAuthenticatedClient(
      INTEGRATION_THIRD_FAN_EMAIL,
      INTEGRATION_THIRD_FAN_PASSWORD,
    );
    const anonClient = createAnonClient();

    const requesterRead = await requesterClient.from("friend_requests").select("id").eq("id", requestId).maybeSingle();
    expect(requesterRead.error).toBeNull();
    expect(requesterRead.data?.id).toBe(requestId);

    const addresseeRead = await addresseeClient.from("friend_requests").select("id").eq("id", requestId).maybeSingle();
    expect(addresseeRead.error).toBeNull();
    expect(addresseeRead.data?.id).toBe(requestId);

    const unrelatedRead = await unrelatedClient.from("friend_requests").select("id").eq("id", requestId).maybeSingle();
    expect(unrelatedRead.error).toBeNull();
    expect(unrelatedRead.data).toBeNull();

    const anonRead = await anonClient.from("friend_requests").select("id").eq("id", requestId).maybeSingle();
    expect(anonRead.error).toBeNull();
    expect(anonRead.data).toBeNull();

    void unrelatedId;
  }, 20_000);

  it("allows only addressee to accept a pending friend request", async () => {
    const serviceClient = createServiceClient();
    const requesterClient = await createNonAdminClient();
    const {
      data: { user: requester },
    } = await requesterClient.auth.getUser();

    if (!requester) {
      throw new Error("Requester not signed in");
    }

    const addresseeId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_SECOND_FAN_EMAIL,
      INTEGRATION_SECOND_FAN_PASSWORD,
    );

    await serviceClient
      .from("friend_requests")
      .delete()
      .or(
        `and(requester_id.eq.${requester.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requester.id})`,
      );

    const insertResponse = await serviceClient
      .from("friend_requests")
      .insert({
        requester_id: requester.id,
        addressee_id: addresseeId,
        status: "pending",
        pair_user_low: requester.id < addresseeId ? requester.id : addresseeId,
        pair_user_high: requester.id < addresseeId ? addresseeId : requester.id,
      })
      .select("id")
      .single();

    if (insertResponse.error || !insertResponse.data) {
      throw new Error(`Service insert failed: ${insertResponse.error?.message}`);
    }

    const requestId = insertResponse.data.id as string;
    cleanupFriendRequestIds.push(requestId);

    const requesterAccept = await requesterClient
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId)
      .select("status");
    expect(requesterAccept.error).toBeNull();
    expect(requesterAccept.data ?? []).toHaveLength(0);

    const stillPending = await serviceClient
      .from("friend_requests")
      .select("status")
      .eq("id", requestId)
      .single();
    expect(stillPending.data?.status).toBe("pending");

    const addresseeClient = await createAuthenticatedClient(
      INTEGRATION_SECOND_FAN_EMAIL,
      INTEGRATION_SECOND_FAN_PASSWORD,
    );

    const addresseeAccept = await addresseeClient
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId)
      .select("status")
      .single();

    expect(addresseeAccept.error).toBeNull();
    expect(addresseeAccept.data?.status).toBe("accepted");
  }, 20_000);

  it("keeps notifications private to recipient and allows read marking", async () => {
    const serviceClient = createServiceClient();
    const recipientId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_SECOND_FAN_EMAIL,
      INTEGRATION_SECOND_FAN_PASSWORD,
    );
    const senderClient = await createNonAdminClient();
    const {
      data: { user: sender },
    } = await senderClient.auth.getUser();

    if (!sender) {
      throw new Error("Sender not signed in");
    }

    const unrelatedClient = await createAuthenticatedClient(
      INTEGRATION_THIRD_FAN_EMAIL,
      INTEGRATION_THIRD_FAN_PASSWORD,
    );

    const createResponse = await senderClient.rpc("create_notification", {
      p_recipient_id: recipientId,
      p_actor_id: sender.id,
      p_actor_label: "fan_a",
      p_type: "event_recommendation",
      p_body: "Sprawdź ten event",
      p_event_id: null,
      p_friend_request_id: null,
    });

    expect(createResponse.error).toBeNull();
    const notificationId = createResponse.data as string;
    cleanupNotificationIds.push(notificationId);

    const recipientClient = await createAuthenticatedClient(
      INTEGRATION_SECOND_FAN_EMAIL,
      INTEGRATION_SECOND_FAN_PASSWORD,
    );

    const recipientRead = await recipientClient
      .from("notifications")
      .select("id, read_at")
      .eq("id", notificationId)
      .single();
    expect(recipientRead.error).toBeNull();
    expect(recipientRead.data?.read_at).toBeNull();

    const unrelatedRead = await unrelatedClient
      .from("notifications")
      .select("id")
      .eq("id", notificationId)
      .maybeSingle();
    expect(unrelatedRead.error).toBeNull();
    expect(unrelatedRead.data).toBeNull();

    const markRead = await recipientClient
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .select("read_at")
      .single();
    expect(markRead.error).toBeNull();
    expect(markRead.data?.read_at).not.toBeNull();

    const senderDirectInsert = await senderClient.from("notifications").insert({
      recipient_id: recipientId,
      actor_id: sender.id,
      actor_label: "fan_a",
      type: "event_recommendation",
      body: "Bezpośredni insert",
    });
    expect(senderDirectInsert.error).not.toBeNull();
  }, 20_000);

  it("allows event recommendation only between accepted friends on published upcoming events", async () => {
    const serviceClient = createServiceClient();
    const senderClient = await createNonAdminClient();
    const {
      data: { user: sender },
    } = await senderClient.auth.getUser();

    if (!sender) {
      throw new Error("Sender not signed in");
    }

    const recipientId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_SECOND_FAN_EMAIL,
      INTEGRATION_SECOND_FAN_PASSWORD,
    );
    const unrelatedId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_THIRD_FAN_EMAIL,
      INTEGRATION_THIRD_FAN_PASSWORD,
    );

    await serviceClient
      .from("friend_requests")
      .delete()
      .or(
        `and(requester_id.eq.${sender.id},addressee_id.eq.${recipientId}),and(requester_id.eq.${recipientId},addressee_id.eq.${sender.id})`,
      );

    const pairLow = sender.id < recipientId ? sender.id : recipientId;
    const pairHigh = sender.id < recipientId ? recipientId : sender.id;

    const friendshipInsert = await serviceClient.from("friend_requests").insert({
      requester_id: sender.id,
      addressee_id: recipientId,
      status: "accepted",
      pair_user_low: pairLow,
      pair_user_high: pairHigh,
    }).select("id").single();

    if (friendshipInsert.error || !friendshipInsert.data) {
      throw new Error(`Friendship fixture failed: ${friendshipInsert.error?.message}`);
    }
    cleanupFriendRequestIds.push(friendshipInsert.data.id as string);

    const eventId = await insertPublishedEventFixture(serviceClient, "recommendation");
    cleanupEventIds.push(eventId);

    const nonFriendInsert = await senderClient.from("event_recommendations").insert({
      event_id: eventId,
      sender_id: sender.id,
      recipient_id: unrelatedId,
      sender_label: "fan_a",
      message: "Nie znajomy",
    });
    expect(nonFriendInsert.error).not.toBeNull();

    const friendInsert = await senderClient
      .from("event_recommendations")
      .insert({
        event_id: eventId,
        sender_id: sender.id,
        recipient_id: recipientId,
        sender_label: "fan_a",
        message: "Polecam ten event",
      })
      .select("id")
      .single();

    expect(friendInsert.error).toBeNull();
    if (!friendInsert.data) {
      throw new Error("Expected friend recommendation insert to succeed");
    }
    cleanupRecommendationIds.push(friendInsert.data.id as string);

    const recipientClient = await createAuthenticatedClient(
      INTEGRATION_SECOND_FAN_EMAIL,
      INTEGRATION_SECOND_FAN_PASSWORD,
    );
    const unrelatedClient = await createAuthenticatedClient(
      INTEGRATION_THIRD_FAN_EMAIL,
      INTEGRATION_THIRD_FAN_PASSWORD,
    );

    const recipientRead = await recipientClient
      .from("event_recommendations")
      .select("id")
      .eq("id", friendInsert.data.id)
      .maybeSingle();
    expect(recipientRead.error).toBeNull();
    expect(recipientRead.data?.id).toBe(friendInsert.data.id);

    const unrelatedRead = await unrelatedClient
      .from("event_recommendations")
      .select("id")
      .eq("id", friendInsert.data.id)
      .maybeSingle();
    expect(unrelatedRead.error).toBeNull();
    expect(unrelatedRead.data).toBeNull();
  }, 25_000);
});

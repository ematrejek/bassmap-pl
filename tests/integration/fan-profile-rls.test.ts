import { afterAll, describe, expect, it } from "vitest";
import { getFanProfileByLogin, getFanProfileByUserId, updateFanProfile } from "@/lib/services/fan-profile";
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

const INTEGRATION_SECOND_FAN_EMAIL = "integration-fan-profile-b@example.com";
const INTEGRATION_SECOND_FAN_PASSWORD = "IntegrationFanProfileB!2026";

async function ensureSecondFanUser(serviceClient: ReturnType<typeof createServiceClient>): Promise<string> {
  const createResult = await serviceClient.auth.admin.createUser({
    email: INTEGRATION_SECOND_FAN_EMAIL,
    password: INTEGRATION_SECOND_FAN_PASSWORD,
    email_confirm: true,
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already")) {
    throw new Error(`Failed to create second fan user: ${createResult.error.message}`);
  }

  const listResult = await serviceClient.auth.admin.listUsers();
  const existing = listResult.data.users.find((user) => user.email === INTEGRATION_SECOND_FAN_EMAIL);
  if (!existing) {
    throw new Error("Second fan user not found after create");
  }

  return existing.id;
}

function uniqueLogin(prefix: string): string {
  const suffix = Date.now().toString(36).slice(-6);
  return `${prefix}_${suffix}`.slice(0, 30);
}

describe.skipIf(!runIntegration)("fan_profiles (RLS + service)", () => {
  const cleanupUserIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();
    if (cleanupUserIds.length > 0) {
      const response = await serviceClient.from("fan_profiles").delete().in("user_id", cleanupUserIds);
      if (response.error) {
        throw new Error(`Failed to delete fan profile fixtures: ${response.error.message}`);
      }
    }
  });

  it("allows fan INSERT and UPDATE own profile", async () => {
    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user) {
      throw new Error("Non-admin test user not signed in");
    }

    cleanupUserIds.push(user.id);

    const serviceClient = createServiceClient();
    await serviceClient.from("fan_profiles").delete().eq("user_id", user.id);

    const login = uniqueLogin("fan_own");
    const createResult = await updateFanProfile(nonAdminClient, user.id, {
      login,
      bio: "Pierwszy opis",
      city: "Kraków",
      favoriteSubgenres: ["liquid_dnb"],
    });

    expect(createResult).toHaveProperty("data");
    if (!("data" in createResult)) {
      throw new Error("Expected fan profile insert to succeed");
    }

    expect(createResult.data.login).toBe(login);
    expect(createResult.data.bio).toBe("Pierwszy opis");

    const updateResult = await updateFanProfile(nonAdminClient, user.id, {
      bio: "Zaktualizowany opis",
    });

    expect(updateResult).toHaveProperty("data");
    if (!("data" in updateResult)) {
      throw new Error("Expected fan profile update to succeed");
    }

    expect(updateResult.data.bio).toBe("Zaktualizowany opis");
    expect(updateResult.data.login).toBe(login);
  }, 15_000);

  it("allows anon SELECT by login", async () => {
    const serviceClient = createServiceClient();
    const userId = await ensureSecondFanUser(serviceClient);
    cleanupUserIds.push(userId);

    await serviceClient.from("fan_profiles").delete().eq("user_id", userId);

    const login = uniqueLogin("anon_read");
    const insertResponse = await serviceClient.from("fan_profiles").insert({
      user_id: userId,
      login,
      bio: "Publiczny profil",
      favorite_subgenres: ["jump_up"],
    });

    if (insertResponse.error) {
      throw new Error(`Service insert failed: ${insertResponse.error.message}`);
    }

    const anonClient = createAnonClient();
    const profileResult = await getFanProfileByLogin(anonClient, login);

    expect(profileResult).toHaveProperty("data");
    if (!("data" in profileResult) || !profileResult.data) {
      throw new Error("Expected anon read by login to succeed");
    }

    expect(profileResult.data.login).toBe(login);
    expect(profileResult.data.bio).toBe("Publiczny profil");
  }, 15_000);

  it("denies fan UPDATE on another user's profile row", async () => {
    const serviceClient = createServiceClient();
    const victimUserId = await ensureSecondFanUser(serviceClient);
    cleanupUserIds.push(victimUserId);

    await serviceClient.from("fan_profiles").delete().eq("user_id", victimUserId);

    const victimLogin = uniqueLogin("victim");
    const insertResponse = await serviceClient.from("fan_profiles").insert({
      user_id: victimUserId,
      login: victimLogin,
      favorite_subgenres: [],
    });

    if (insertResponse.error) {
      throw new Error(`Victim profile insert failed: ${insertResponse.error.message}`);
    }

    const attackerClient = await createNonAdminClient();
    const {
      data: { user: attacker },
    } = await attackerClient.auth.getUser();

    if (!attacker) {
      throw new Error("Attacker user not signed in");
    }

    cleanupUserIds.push(attacker.id);

    const attackResult = await updateFanProfile(attackerClient, victimUserId, {
      bio: "Próba włamania",
    });

    expect(attackResult).toHaveProperty("error");

    const victimProfile = await getFanProfileByUserId(serviceClient, victimUserId);
    if (!("data" in victimProfile) || !victimProfile.data) {
      throw new Error("Expected victim profile to remain");
    }

    expect(victimProfile.data.bio).toBeNull();
  }, 15_000);

  it("enforces UNIQUE login across profiles", async () => {
    const serviceClient = createServiceClient();
    const firstUserId = await ensureSecondFanUser(serviceClient);
    cleanupUserIds.push(firstUserId);

    const secondCreate = await serviceClient.auth.admin.createUser({
      email: "integration-fan-profile-c@example.com",
      password: "IntegrationFanProfileC!2026",
      email_confirm: true,
    });

    if (secondCreate.error && !secondCreate.error.message.toLowerCase().includes("already")) {
      throw new Error(`Failed to create third fan user: ${secondCreate.error.message}`);
    }

    const listResult = await serviceClient.auth.admin.listUsers();
    const secondUser = listResult.data.users.find((user) => user.email === "integration-fan-profile-c@example.com");
    if (!secondUser) {
      throw new Error("Third fan user not found");
    }

    cleanupUserIds.push(secondUser.id);
    await serviceClient.from("fan_profiles").delete().in("user_id", [firstUserId, secondUser.id]);

    const sharedLogin = uniqueLogin("unique_login");
    const firstInsert = await serviceClient.from("fan_profiles").insert({
      user_id: firstUserId,
      login: sharedLogin,
      favorite_subgenres: [],
    });

    if (firstInsert.error) {
      throw new Error(`First profile insert failed: ${firstInsert.error.message}`);
    }

    const secondFanClient = await createAuthenticatedClient(
      "integration-fan-profile-c@example.com",
      "IntegrationFanProfileC!2026",
    );

    const conflictResult = await updateFanProfile(secondFanClient, secondUser.id, {
      login: sharedLogin,
    });

    expect(conflictResult).toHaveProperty("error");
    if (!("error" in conflictResult)) {
      throw new Error("Expected unique login conflict");
    }

    expect(conflictResult.error).toBe("Ten login jest już zajęty");
  }, 15_000);
});

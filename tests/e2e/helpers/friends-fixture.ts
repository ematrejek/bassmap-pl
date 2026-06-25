import { createServiceClient } from "../../helpers/supabase";

export const E2E_FRIENDS_FAN_B_EMAIL = "integration-friends-b@example.com";
export const E2E_FRIENDS_FAN_B_PASSWORD = "IntegrationFriendsB!2026";
export const E2E_FRIENDS_FAN_A_LOGIN = "e2e_s23_fana";
export const E2E_FRIENDS_FAN_B_LOGIN = "e2e_s23_fanb";

async function ensureAuthUser(email: string, password: string): Promise<string> {
  const serviceClient = createServiceClient();
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

async function ensureFanProfile(userId: string, login: string): Promise<void> {
  const serviceClient = createServiceClient();
  const existing = await serviceClient.from("fan_profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (existing.error) {
    throw new Error(`Failed to read fan profile for ${login}: ${existing.error.message}`);
  }

  if (existing.data) {
    const update = await serviceClient.from("fan_profiles").update({ login }).eq("user_id", userId);
    if (update.error) {
      throw new Error(`Failed to update fan profile ${login}: ${update.error.message}`);
    }
    return;
  }

  const insert = await serviceClient.from("fan_profiles").insert({
    user_id: userId,
    login,
    favorite_subgenres: ["neurofunk"],
  });
  if (insert.error) {
    throw new Error(`Failed to insert fan profile ${login}: ${insert.error.message}`);
  }
}

export async function ensureFriendsE2eFixture(): Promise<{ fanALogin: string; fanBLogin: string }> {
  const serviceClient = createServiceClient();
  const fanAId = await ensureAuthUser("integration-auth-nonadmin@example.com", "IntegrationAuthNonAdmin!2026");
  const fanBId = await ensureAuthUser(E2E_FRIENDS_FAN_B_EMAIL, E2E_FRIENDS_FAN_B_PASSWORD);

  await ensureFanProfile(fanAId, E2E_FRIENDS_FAN_A_LOGIN);
  await ensureFanProfile(fanBId, E2E_FRIENDS_FAN_B_LOGIN);

  await serviceClient
    .from("friend_requests")
    .delete()
    .or(
      `and(requester_id.eq.${fanAId},addressee_id.eq.${fanBId}),and(requester_id.eq.${fanBId},addressee_id.eq.${fanAId})`,
    );

  return {
    fanALogin: E2E_FRIENDS_FAN_A_LOGIN,
    fanBLogin: E2E_FRIENDS_FAN_B_LOGIN,
  };
}

import { createServiceClient, INTEGRATION_NON_ADMIN_EMAIL } from "../../helpers/supabase";
import { E2E_FRIENDS_FAN_B_EMAIL, E2E_FRIENDS_FAN_B_LOGIN, ensureFriendsE2eFixture } from "./friends-fixture";

export const E2E_S24_CREW_NAME = "E2E S24 Crew";

export async function ensureCrewsE2eFixture(): Promise<{ crewName: string; fanBLogin: string }> {
  await ensureFriendsE2eFixture();

  const serviceClient = createServiceClient();
  const users = await serviceClient.auth.admin.listUsers();
  const fanA = users.data.users.find((user) => user.email === INTEGRATION_NON_ADMIN_EMAIL);
  const fanB = users.data.users.find((user) => user.email === E2E_FRIENDS_FAN_B_EMAIL);

  if (!fanA || !fanB) {
    throw new Error("E2E crew fixture: missing fan A or fan B auth user");
  }

  await serviceClient.from("crew_join_requests").delete().eq("requester_id", fanB.id);
  await serviceClient.from("crew_members").delete().eq("user_id", fanB.id);
  await serviceClient.from("crews").delete().eq("owner_id", fanA.id);

  return {
    crewName: E2E_S24_CREW_NAME,
    fanBLogin: E2E_FRIENDS_FAN_B_LOGIN,
  };
}

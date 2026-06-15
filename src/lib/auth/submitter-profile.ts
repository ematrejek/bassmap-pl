import { createServiceRoleClient } from "@/lib/supabase-service";

export interface SubmitterProfile {
  email: string;
  login: string;
}

export function loginFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

export async function resolveSubmitterProfiles(userIds: string[]): Promise<Map<string, SubmitterProfile>> {
  const map = new Map<string, SubmitterProfile>();
  const unique = [...new Set(userIds.filter(Boolean))];

  if (unique.length === 0) {
    return map;
  }

  const service = createServiceRoleClient();
  if (!service) {
    return map;
  }

  await Promise.all(
    unique.map(async (userId) => {
      const { data, error } = await service.auth.admin.getUserById(userId);
      const email = data.user?.email;
      if (error || !email) {
        return;
      }
      map.set(userId, { email, login: loginFromEmail(email) });
    }),
  );

  return map;
}

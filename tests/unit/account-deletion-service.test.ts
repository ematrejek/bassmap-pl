import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { anonymizeUserComments, deleteUserAccount } from "@/lib/services/account-deletion";

function mockServiceClient(options: {
  updateError?: { message: string } | null;
  deleteUserError?: { message: string } | null;
}): SupabaseClient {
  const updateEq = vi.fn().mockResolvedValue({ error: options.updateError ?? null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  const deleteUser = vi.fn().mockResolvedValue({ error: options.deleteUserError ?? null });

  return {
    from: vi.fn().mockReturnValue({ update }),
    auth: { admin: { deleteUser } },
  } as unknown as SupabaseClient;
}

describe("account-deletion service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs and returns error when comment anonymization fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const userId = "11111111-1111-1111-1111-111111111111";
    const client = mockServiceClient({ updateError: { message: "db update failed" } });

    const result = await anonymizeUserComments(client, userId);

    expect(result).toEqual({ error: "db update failed" });
    expect(consoleError).toHaveBeenCalledWith("[account-deletion] anonymizeUserComments failed", {
      userId,
      message: "db update failed",
    });
  });

  it("logs and returns user message when deleteUser fails after anonymization", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const userId = "22222222-2222-2222-2222-222222222222";
    const client = mockServiceClient({ deleteUserError: { message: "auth delete failed" } });

    const result = await deleteUserAccount(client, userId);

    expect(result).toEqual({
      error:
        "Nie udało się usunąć konta. Skontaktuj się z administratorem (matrejekemilia@gmail.com), jeśli problem się powtarza.",
    });
    expect(consoleError).toHaveBeenCalledWith("[account-deletion] deleteUser failed after comment anonymization", {
      userId,
      message: "auth delete failed",
    });
  });

  it("returns success when anonymization and deleteUser succeed", async () => {
    const client = mockServiceClient({});

    const result = await deleteUserAccount(client, "33333333-3333-3333-3333-333333333333");

    expect(result).toEqual({ success: true });
  });
});

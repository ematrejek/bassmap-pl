import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { anonymizeUserComments, anonymizeUserForumContent, deleteUserAccount } from "@/lib/services/account-deletion";

type AnonymizeTable = "event_comments" | "forum_threads" | "forum_comments";

function mockServiceClient(options: {
  updateErrors?: Partial<Record<AnonymizeTable, { message: string }>>;
  deleteUserError?: { message: string } | null;
}): { client: SupabaseClient; from: ReturnType<typeof vi.fn> } {
  const from = vi.fn().mockImplementation((table: AnonymizeTable) => ({
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: options.updateErrors?.[table] ?? null }),
    }),
  }));
  const deleteUser = vi.fn().mockResolvedValue({ error: options.deleteUserError ?? null });

  const client = {
    from,
    auth: { admin: { deleteUser } },
  } as unknown as SupabaseClient;

  return { client, from };
}

describe("account-deletion service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs and returns error when comment anonymization fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const userId = "11111111-1111-1111-1111-111111111111";
    const { client } = mockServiceClient({ updateErrors: { event_comments: { message: "db update failed" } } });

    const result = await anonymizeUserComments(client, userId);

    expect(result).toEqual({ error: "db update failed" });
    expect(consoleError).toHaveBeenCalledWith("[account-deletion] anonymize event_comments failed", {
      userId,
      message: "db update failed",
    });
  });

  it("logs and returns error when forum thread anonymization fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const userId = "44444444-4444-4444-4444-444444444444";
    const { client } = mockServiceClient({ updateErrors: { forum_threads: { message: "forum threads failed" } } });

    const result = await anonymizeUserForumContent(client, userId);

    expect(result).toEqual({ error: "forum threads failed" });
    expect(consoleError).toHaveBeenCalledWith("[account-deletion] anonymize forum_threads failed", {
      userId,
      message: "forum threads failed",
    });
  });

  it("logs and returns user message when deleteUser fails after anonymization", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const userId = "22222222-2222-2222-2222-222222222222";
    const { client } = mockServiceClient({ deleteUserError: { message: "auth delete failed" } });

    const result = await deleteUserAccount(client, userId);

    expect(result).toEqual({
      error:
        "Nie udało się usunąć konta. Skontaktuj się z administratorem (matrejekemilia@gmail.com), jeśli problem się powtarza.",
    });
    expect(consoleError).toHaveBeenCalledWith("[account-deletion] deleteUser failed after content anonymization", {
      userId,
      message: "auth delete failed",
    });
  });

  it("returns success when anonymization and deleteUser succeed", async () => {
    const { client, from } = mockServiceClient({});

    const result = await deleteUserAccount(client, "33333333-3333-3333-3333-333333333333");

    expect(result).toEqual({ success: true });
    expect(from).toHaveBeenCalledTimes(3);
    expect(from).toHaveBeenNthCalledWith(1, "event_comments");
    expect(from).toHaveBeenNthCalledWith(2, "forum_threads");
    expect(from).toHaveBeenNthCalledWith(3, "forum_comments");
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  anonymizeUserComments,
  anonymizeUserForumContent,
  cleanupUserCrewData,
  deleteUserAccount,
} from "@/lib/services/account-deletion";

type AnonymizeTable = "event_comments" | "forum_threads" | "forum_comments";
type DeleteTable = "crews" | "crew_members" | "crew_join_requests";

function mockServiceClient(options: {
  updateErrors?: Partial<Record<AnonymizeTable, { message: string }>>;
  deleteErrors?: Partial<Record<DeleteTable, { message: string }>>;
  deleteUserError?: { message: string } | null;
}): { client: SupabaseClient; from: ReturnType<typeof vi.fn> } {
  const from = vi.fn().mockImplementation((table: AnonymizeTable | DeleteTable) => {
    const updateError = options.updateErrors?.[table as AnonymizeTable] ?? null;
    const deleteError = options.deleteErrors?.[table as DeleteTable] ?? null;

    return {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: updateError }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: deleteError }),
      }),
    };
  });
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

  it("removes owned crews, memberships and pending crew requests", async () => {
    const userId = "55555555-5555-5555-5555-555555555555";
    const { client, from } = mockServiceClient({});

    const result = await cleanupUserCrewData(client, userId);

    expect(result).toEqual({});
    expect(from).toHaveBeenNthCalledWith(1, "crews");
    expect(from).toHaveBeenNthCalledWith(2, "crew_members");
    expect(from).toHaveBeenNthCalledWith(3, "crew_join_requests");
  });

  it("returns error when crew cleanup fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const userId = "66666666-6666-6666-6666-666666666666";
    const { client } = mockServiceClient({ deleteErrors: { crew_members: { message: "crew member delete failed" } } });

    const result = await cleanupUserCrewData(client, userId);

    expect(result).toEqual({ error: "crew member delete failed" });
    expect(consoleError).toHaveBeenCalledWith("[account-deletion] delete crew_members failed", {
      userId,
      message: "crew member delete failed",
    });
  });

  it("returns success when anonymization and deleteUser succeed", async () => {
    const { client, from } = mockServiceClient({});

    const result = await deleteUserAccount(client, "33333333-3333-3333-3333-333333333333");

    expect(result).toEqual({ success: true });
    expect(from).toHaveBeenCalledTimes(6);
    expect(from).toHaveBeenNthCalledWith(1, "event_comments");
    expect(from).toHaveBeenNthCalledWith(2, "forum_threads");
    expect(from).toHaveBeenNthCalledWith(3, "forum_comments");
    expect(from).toHaveBeenNthCalledWith(4, "crews");
    expect(from).toHaveBeenNthCalledWith(5, "crew_members");
    expect(from).toHaveBeenNthCalledWith(6, "crew_join_requests");
  });
});

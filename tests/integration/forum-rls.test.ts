import { afterAll, describe, expect, it } from "vitest";
import { createForumComment, deleteForumComment, listForumComments } from "@/lib/services/forum-comments";
import { createForumThread, deleteForumThread, listForumThreads } from "@/lib/services/forum-threads";
import {
  createAdminClient,
  createAnonClient,
  createNonAdminClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

describe.skipIf(!runIntegration)("forum_threads + forum_comments (RLS + service)", () => {
  const cleanupThreadIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();
    if (cleanupThreadIds.length > 0) {
      const response = await serviceClient.from("forum_threads").delete().in("id", cleanupThreadIds);
      if (response.error) {
        throw new Error(`Failed to delete forum thread fixtures: ${response.error.message}`);
      }
    }
  });

  it("allows fan INSERT thread and comment, and anon SELECT", async () => {
    const nonAdminClient = await createNonAdminClient();
    const {
      data: { user },
    } = await nonAdminClient.auth.getUser();

    if (!user?.email) {
      throw new Error("Non-admin test user not signed in");
    }

    const threadResult = await createForumThread(nonAdminClient, {
      authorId: user.id,
      authorEmail: user.email,
      category: "szukam_ekipy",
      title: "Integration thread from fan",
      body: "Szukam ekipy na rave.",
    });

    expect(threadResult).toHaveProperty("data");
    if (!("data" in threadResult)) {
      throw new Error("Expected fan thread create to succeed");
    }
    cleanupThreadIds.push(threadResult.data.id);

    expect(threadResult.data.authorId).toBe(user.id);

    const commentResult = await createForumComment(nonAdminClient, {
      authorId: user.id,
      authorEmail: user.email,
      threadId: threadResult.data.id,
      body: "Pierwszy komentarz fana",
    });

    expect(commentResult).toHaveProperty("data");

    const anonClient = createAnonClient();
    const anonThreads = await listForumThreads(anonClient, { limit: 50, offset: 0 });
    expect(anonThreads).toHaveProperty("data");
    if (!("data" in anonThreads)) {
      throw new Error("Expected anon thread list to succeed");
    }
    expect(anonThreads.data.some((thread) => thread.id === threadResult.data.id)).toBe(true);

    const anonComments = await listForumComments(anonClient, threadResult.data.id);
    expect(anonComments).toHaveProperty("data");
    if (!("data" in anonComments)) {
      throw new Error("Expected anon comment list to succeed");
    }
    expect(anonComments.data).toHaveLength(1);
  }, 15_000);

  it("denies fan INSERT thread with mismatched author_id", async () => {
    const nonAdminClient = await createNonAdminClient();

    const response = await nonAdminClient
      .from("forum_threads")
      .insert({
        category: "pozostale",
        title: "Spoofed author thread",
        body: "Ten wpis powinien zostać odrzucony przez RLS.",
        author_id: "00000000-0000-0000-0000-000000000000",
        author_label: "spoof",
      })
      .select("id")
      .maybeSingle();

    expect(response.error).not.toBeNull();
  }, 15_000);

  it("denies fan DELETE on own thread and another user's comment, but allows own comment", async () => {
    const nonAdminClient = await createNonAdminClient();
    const adminClient = await createAdminClient();
    const {
      data: { user: fanUser },
    } = await nonAdminClient.auth.getUser();
    const {
      data: { user: adminUser },
    } = await adminClient.auth.getUser();

    if (!fanUser?.email || !adminUser?.email) {
      throw new Error("Test users not signed in");
    }

    const threadResult = await createForumThread(nonAdminClient, {
      authorId: fanUser.id,
      authorEmail: fanUser.email,
      category: "transport_noclegi",
      title: "Fan thread for delete checks",
      body: "Wątek do testów usuwania.",
    });
    if (!("data" in threadResult)) {
      throw new Error("Expected thread create to succeed");
    }
    cleanupThreadIds.push(threadResult.data.id);
    const threadId = threadResult.data.id;

    const fanComment = await createForumComment(nonAdminClient, {
      authorId: fanUser.id,
      authorEmail: fanUser.email,
      threadId,
      body: "Komentarz fana",
    });
    const adminComment = await createForumComment(adminClient, {
      authorId: adminUser.id,
      authorEmail: adminUser.email,
      threadId,
      body: "Komentarz admina",
    });

    if (!("data" in fanComment) || !("data" in adminComment)) {
      throw new Error("Expected comments to be created");
    }

    const fanDeletesOwnThread = await deleteForumThread(nonAdminClient, threadId);
    expect(fanDeletesOwnThread).toHaveProperty("error");

    const fanDeletesOtherComment = await deleteForumComment(nonAdminClient, adminComment.data.id);
    expect(fanDeletesOtherComment).toHaveProperty("error");

    const fanDeletesOwnComment = await deleteForumComment(nonAdminClient, fanComment.data.id);
    expect(fanDeletesOwnComment).toHaveProperty("data");
  }, 20_000);

  it("allows admin DELETE thread and cascades to comments", async () => {
    const nonAdminClient = await createNonAdminClient();
    const adminClient = await createAdminClient();
    const {
      data: { user: fanUser },
    } = await nonAdminClient.auth.getUser();

    if (!fanUser?.email) {
      throw new Error("Fan test user not signed in");
    }

    const threadResult = await createForumThread(nonAdminClient, {
      authorId: fanUser.id,
      authorEmail: fanUser.email,
      category: "pozostale",
      title: "Thread for admin cascade delete",
      body: "Wątek usuwany przez admina.",
    });
    if (!("data" in threadResult)) {
      throw new Error("Expected thread create to succeed");
    }
    const threadId = threadResult.data.id;

    await createForumComment(nonAdminClient, {
      authorId: fanUser.id,
      authorEmail: fanUser.email,
      threadId,
      body: "Komentarz do skasowania kaskadą",
    });

    const adminDelete = await deleteForumThread(adminClient, threadId);
    expect(adminDelete).toHaveProperty("data");

    const serviceClient = createServiceClient();
    const remainingComments = await serviceClient.from("forum_comments").select("id").eq("thread_id", threadId);
    expect(remainingComments.error).toBeNull();
    expect(remainingComments.data ?? []).toHaveLength(0);
  }, 20_000);
});

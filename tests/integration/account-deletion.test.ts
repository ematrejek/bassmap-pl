import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DELETED_USER_AUTHOR_LABEL } from "@/lib/auth/display-name";
import { deleteUserAccount } from "@/lib/services/account-deletion";
import { createServiceClient, isSupabaseConfigured, logSkipIfNotConfigured } from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

let accountDeletionMigrationApplied = false;

beforeAll(async () => {
  if (!runIntegration) {
    return;
  }

  const serviceClient = createServiceClient();
  const migrationCheck = await serviceClient
    .schema("supabase_migrations")
    .from("schema_migrations")
    .select("version")
    .eq("version", "20260620100000")
    .maybeSingle();

  accountDeletionMigrationApplied = !migrationCheck.error && migrationCheck.data !== null;

  if (!accountDeletionMigrationApplied) {
    // eslint-disable-next-line no-console -- intentional skip notice for developers
    console.warn(
      "account-deletion integration (suggestions SET NULL): migration 20260620100000 not applied. Run: npx supabase migration up",
    );
  }
});

function futureStartsAt(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString();
}

async function insertPublishedEventFixture(serviceClient: ReturnType<typeof createServiceClient>): Promise<string> {
  const response = await serviceClient
    .from("events")
    .insert({
      name: `integration-account-deletion ${randomUUID()}`,
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

describe.skipIf(!runIntegration)("account deletion (service + FK)", () => {
  const cleanupEventIds: string[] = [];
  const cleanupUserIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();

    for (const userId of cleanupUserIds) {
      await serviceClient.auth.admin.deleteUser(userId);
    }

    if (cleanupEventIds.length > 0) {
      const response = await serviceClient.from("events").delete().in("id", cleanupEventIds);
      if (response.error) {
        throw new Error(`Failed to delete event fixtures: ${response.error.message}`);
      }
    }
  });

  it.skipIf(() => !accountDeletionMigrationApplied)(
    "anonymizes comments, deletes user, and keeps suggestions with null submitter",
    async () => {
      const serviceClient = createServiceClient();
      const email = `integration-delete-${randomUUID()}@example.com`;
      const password = "IntegrationDelete!2026";

      const createUserResult = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createUserResult.error) {
        throw new Error(`Failed to create test user: ${createUserResult.error.message}`);
      }

      const userId = createUserResult.data.user.id;
      cleanupUserIds.push(userId);

      const eventId = await insertPublishedEventFixture(serviceClient);
      cleanupEventIds.push(eventId);

      const commentResponse = await serviceClient
        .from("event_comments")
        .insert({
          event_id: eventId,
          author_id: userId,
          author_label: "Test Fan",
          body: "Komentarz przed usunięciem konta",
        })
        .select("id")
        .single();

      if (commentResponse.error) {
        throw new Error(`Failed to insert comment fixture: ${commentResponse.error.message}`);
      }

      const commentId = commentResponse.data.id as string;

      const suggestionResponse = await serviceClient
        .from("change_suggestions")
        .insert({
          event_id: eventId,
          submitted_by: userId,
          body: "Sugestia przed usunięciem konta z wystarczającą długością",
          status: "pending",
          source: "duplicate_flow",
        })
        .select("id")
        .single();

      if (suggestionResponse.error) {
        throw new Error(`Failed to insert suggestion fixture: ${suggestionResponse.error.message}`);
      }

      const suggestionId = suggestionResponse.data.id as string;

      const deleteResult = await deleteUserAccount(serviceClient, userId);
      expect(deleteResult).toEqual({ success: true });
      cleanupUserIds.splice(cleanupUserIds.indexOf(userId), 1);

      const userLookup = await serviceClient.auth.admin.getUserById(userId);
      expect(userLookup.error).toBeTruthy();

      const commentLookup = await serviceClient
        .from("event_comments")
        .select("author_id, author_label, body")
        .eq("id", commentId)
        .single();

      expect(commentLookup.error).toBeNull();
      expect(commentLookup.data?.author_id).toBeNull();
      expect(commentLookup.data?.author_label).toBe(DELETED_USER_AUTHOR_LABEL);
      expect(commentLookup.data?.body).toBe("Komentarz przed usunięciem konta");

      const suggestionLookup = await serviceClient
        .from("change_suggestions")
        .select("id, submitted_by")
        .eq("id", suggestionId)
        .single();

      expect(suggestionLookup.error).toBeNull();
      expect(suggestionLookup.data?.submitted_by).toBeNull();
    },
  );

  it("does not delete user when password verification would fail", async () => {
    const serviceClient = createServiceClient();
    const email = `integration-delete-keep-${randomUUID()}@example.com`;
    const password = "IntegrationKeep!2026";

    const createUserResult = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserResult.error) {
      throw new Error(`Failed to create test user: ${createUserResult.error.message}`);
    }

    const userId = createUserResult.data.user.id;
    cleanupUserIds.push(userId);

    const eventId = await insertPublishedEventFixture(serviceClient);
    cleanupEventIds.push(eventId);

    const commentResponse = await serviceClient
      .from("event_comments")
      .insert({
        event_id: eventId,
        author_id: userId,
        author_label: "Keep Fan",
        body: "Komentarz bez usunięcia konta",
      })
      .select("id")
      .single();

    if (commentResponse.error) {
      throw new Error(`Failed to insert comment fixture: ${commentResponse.error.message}`);
    }

    const commentId = commentResponse.data.id as string;

    const signInResult = await serviceClient.auth.signInWithPassword({
      email,
      password: "wrong-password",
    });

    expect(signInResult.error).toBeTruthy();

    const userLookup = await serviceClient.auth.admin.getUserById(userId);
    expect(userLookup.data.user?.id).toBe(userId);

    const commentLookup = await serviceClient
      .from("event_comments")
      .select("author_id, author_label")
      .eq("id", commentId)
      .single();

    expect(commentLookup.data?.author_id).toBe(userId);
    expect(commentLookup.data?.author_label).toBe("Keep Fan");
  });
});

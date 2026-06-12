import { afterAll, describe, expect, it } from "vitest";
import { createEvent, deleteEvent, getEventById, updateEvent } from "@/lib/services/events";
import {
  buildMutationCreatePayload,
  deleteMutationFixtureIds,
  insertMutationFixtureRow,
} from "../helpers/mutation-fixtures";
import {
  createAdminClient,
  createNonAdminClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

describe.skipIf(!runIntegration)("event mutations allowed for admin", () => {
  const cleanupIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();
    await deleteMutationFixtureIds(serviceClient, cleanupIds);
  });

  it("is_admin RPC and create succeed for admin (3a)", async () => {
    const adminClient = await createAdminClient();
    const nonAdminClient = await createNonAdminClient();

    const adminRpc = await adminClient.rpc("is_admin");
    const nonAdminRpc = await nonAdminClient.rpc("is_admin");

    expect(adminRpc.error).toBeNull();
    expect(adminRpc.data).toBe(true);
    expect(nonAdminRpc.error).toBeNull();
    expect(nonAdminRpc.data).toBe(false);

    const payload = buildMutationCreatePayload("admin-create");
    const createResult = await createEvent(adminClient, payload);

    expect(createResult).toHaveProperty("data");
    if (!("data" in createResult)) {
      throw new Error("Expected admin create to succeed");
    }

    cleanupIds.push(createResult.data.id);

    const serviceClient = createServiceClient();
    const persisted = await getEventById(serviceClient, createResult.data.id);
    expect(persisted?.name).toBe(payload.name);
  });

  it("update and delete succeed for admin (3b)", async () => {
    const adminClient = await createAdminClient();
    const serviceClient = createServiceClient();

    const fixture = await insertMutationFixtureRow(serviceClient, "admin-update-delete");
    cleanupIds.push(fixture.id);

    const updatedName = "integration-auth-mutation admin-updated";
    const updateResult = await updateEvent(adminClient, fixture.id, { name: updatedName });

    expect(updateResult).toHaveProperty("data");
    if (!("data" in updateResult)) {
      throw new Error("Expected admin update to succeed");
    }

    expect(updateResult.data.name).toBe(updatedName);

    const deleteResult = await deleteEvent(adminClient, fixture.id);
    expect(deleteResult).toEqual({ success: true });

    const afterDelete = await getEventById(serviceClient, fixture.id);
    expect(afterDelete).toBeNull();

    cleanupIds.splice(cleanupIds.indexOf(fixture.id), 1);
  });
});

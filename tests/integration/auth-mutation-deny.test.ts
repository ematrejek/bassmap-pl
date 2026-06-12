import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createEvent, deleteEvent, getEventById, updateEvent } from "@/lib/services/events";
import {
  buildMutationCreatePayload,
  deleteMutationFixtureIds,
  insertMutationFixtureRow,
} from "../helpers/mutation-fixtures";
import {
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

describe.skipIf(!runIntegration)("event mutations denied for non-admin", () => {
  const cleanupIds: string[] = [];
  let fixtureId: string | undefined;

  beforeAll(async () => {
    const serviceClient = createServiceClient();
    const fixture = await insertMutationFixtureRow(serviceClient, "fixture");
    fixtureId = fixture.id;
    cleanupIds.push(fixture.id);
  });

  afterAll(async () => {
    const serviceClient = createServiceClient();
    await deleteMutationFixtureIds(serviceClient, cleanupIds);
  });

  it("blocks create for anon and non-admin (2a)", async () => {
    const anonClient = createAnonClient();
    const nonAdminClient = await createNonAdminClient();
    const anonPayload = buildMutationCreatePayload("anon-create");
    const nonAdminPayload = buildMutationCreatePayload("nonadmin-create");

    const anonResult = await createEvent(anonClient, anonPayload);
    const nonAdminResult = await createEvent(nonAdminClient, nonAdminPayload);

    expect(anonResult).toHaveProperty("error");
    expect(nonAdminResult).toHaveProperty("error");

    const serviceClient = createServiceClient();
    const anonCheck = await serviceClient.from("events").select("id").eq("name", anonPayload.name);
    const nonAdminCheck = await serviceClient.from("events").select("id").eq("name", nonAdminPayload.name);

    expect(anonCheck.data ?? []).toHaveLength(0);
    expect(nonAdminCheck.data ?? []).toHaveLength(0);
  });

  it("blocks update and delete for non-admin (2b)", async () => {
    if (!fixtureId) {
      throw new Error("Fixture not seeded");
    }

    const nonAdminClient = await createNonAdminClient();
    const serviceClient = createServiceClient();

    const before = await getEventById(serviceClient, fixtureId);
    if (!before) {
      throw new Error("Fixture row missing before update attempt");
    }

    const updateResult = await updateEvent(nonAdminClient, fixtureId, { name: "integration-auth-mutation hacked" });
    expect(updateResult).toHaveProperty("error");

    const afterUpdate = await getEventById(serviceClient, fixtureId);
    expect(afterUpdate?.name).toBe(before.name);

    const deleteResult = await deleteEvent(nonAdminClient, fixtureId);
    expect(deleteResult).toHaveProperty("error");

    const afterDeleteAttempt = await getEventById(serviceClient, fixtureId);
    expect(afterDeleteAttempt).not.toBeNull();
  });
});

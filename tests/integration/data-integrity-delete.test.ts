import { afterAll, describe, expect, it } from "vitest";
import { deleteEvent } from "@/lib/services/events";
import { countEvents, deleteMutationFixtureIds, insertMutationFixtureRow } from "../helpers/mutation-fixtures";
import {
  createAdminClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

describe.skipIf(!runIntegration)("scoped delete data integrity", () => {
  const cleanupIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();
    await deleteMutationFixtureIds(serviceClient, cleanupIds);
  });

  it("deleteEvent reduces row count by exactly one (4a)", async () => {
    const serviceClient = createServiceClient();
    const adminClient = await createAdminClient();

    const beforeCount = await countEvents(serviceClient);
    const fixture = await insertMutationFixtureRow(serviceClient, "count-delta");
    cleanupIds.push(fixture.id);

    const afterInsertCount = await countEvents(serviceClient);
    expect(afterInsertCount).toBe(beforeCount + 1);

    const deleteResult = await deleteEvent(adminClient, fixture.id);
    expect(deleteResult).toEqual({ success: true });

    const afterDeleteCount = await countEvents(serviceClient);
    expect(afterDeleteCount).toBe(beforeCount);

    cleanupIds.splice(cleanupIds.indexOf(fixture.id), 1);
  });

  it("deleteEvent on missing id returns error without changing count (4b)", async () => {
    const serviceClient = createServiceClient();
    const adminClient = await createAdminClient();
    const missingId = "00000000-0000-4000-8000-000000000099";

    const beforeCount = await countEvents(serviceClient);
    const deleteResult = await deleteEvent(adminClient, missingId);

    expect(deleteResult).toHaveProperty("error");
    const afterCount = await countEvents(serviceClient);
    expect(afterCount).toBe(beforeCount);
  });
});

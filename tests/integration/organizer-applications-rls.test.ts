import { afterAll, describe, expect, it } from "vitest";
import type { OrganizerApplicationStatus } from "@/types";
import {
  createAdminClient,
  createAnonClient,
  createAuthenticatedClient,
  createServiceClient,
  isSupabaseConfigured,
  logSkipIfNotConfigured,
} from "../helpers/supabase";

const runIntegration = isSupabaseConfigured();

if (!runIntegration) {
  logSkipIfNotConfigured();
}

const INTEGRATION_ORGANIZER_APPLICANT_EMAIL = "integration-organizer-applicant@example.com";
const INTEGRATION_ORGANIZER_APPLICANT_PASSWORD = "IntegrationOrganizerApplicant!2026";
const INTEGRATION_ORGANIZER_OTHER_EMAIL = "integration-organizer-other@example.com";
const INTEGRATION_ORGANIZER_OTHER_PASSWORD = "IntegrationOrganizerOther!2026";

interface OrganizerApplicationSafeRpcRow {
  status: OrganizerApplicationStatus;
  decision_reason?: string | null;
}

async function ensureAuthUser(
  serviceClient: ReturnType<typeof createServiceClient>,
  email: string,
  password: string,
): Promise<string> {
  const createResult = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already")) {
    throw new Error(`Failed to create user ${email}: ${createResult.error.message}`);
  }

  const listResult = await serviceClient.auth.admin.listUsers();
  const existing = listResult.data.users.find((user) => user.email === email);
  if (!existing) {
    throw new Error(`User ${email} not found after create`);
  }

  return existing.id;
}

describe.skipIf(!runIntegration)("organizer applications (RLS + RPC)", () => {
  const cleanupApplicationIds: string[] = [];
  const cleanupUserIds: string[] = [];

  afterAll(async () => {
    const serviceClient = createServiceClient();

    if (cleanupApplicationIds.length > 0) {
      const response = await serviceClient.from("organizer_applications").delete().in("id", cleanupApplicationIds);
      if (response.error) {
        throw new Error(`Failed to delete organizer application fixtures: ${response.error.message}`);
      }
    }

    for (const userId of cleanupUserIds) {
      await serviceClient.from("organizer_roles").delete().eq("user_id", userId);
    }
  });

  it("allows fan INSERT own pending application and denies when already organizer", async () => {
    const serviceClient = createServiceClient();
    const applicantId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );
    cleanupUserIds.push(applicantId);

    await serviceClient.from("organizer_roles").delete().eq("user_id", applicantId);
    await serviceClient.from("organizer_applications").delete().eq("user_id", applicantId);

    const applicantClient = await createAuthenticatedClient(
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );

    const insertResponse = await applicantClient
      .from("organizer_applications")
      .insert({
        user_id: applicantId,
        business_name: "Integration Bass Crew",
        social_platform: "instagram",
        social_profile_url: "instagram.com/integration_bass_crew",
        description: "Test organizer application",
        status: "pending",
      })
      .select("id, status")
      .single();

    if (insertResponse.error) {
      throw new Error(`Expected application insert to succeed: ${insertResponse.error.message}`);
    }

    expect(insertResponse.data.status).toBe("pending");
    const applicationId = insertResponse.data.id as string;
    cleanupApplicationIds.push(applicationId);

    await serviceClient.from("organizer_roles").insert({
      user_id: applicantId,
      granted_by: applicantId,
    });

    const secondInsert = await applicantClient.from("organizer_applications").insert({
      user_id: applicantId,
      business_name: "Should Fail",
      social_platform: "facebook",
      social_profile_url: "https://www.facebook.com/should-fail",
      status: "pending",
    });

    expect(secondInsert.error).not.toBeNull();

    await serviceClient.from("organizer_roles").delete().eq("user_id", applicantId);
  });

  it("hides other users applications from fan SELECT", async () => {
    const serviceClient = createServiceClient();
    const applicantId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );
    const otherId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_ORGANIZER_OTHER_EMAIL,
      INTEGRATION_ORGANIZER_OTHER_PASSWORD,
    );
    cleanupUserIds.push(applicantId, otherId);

    await serviceClient.from("organizer_applications").delete().eq("user_id", applicantId);
    await serviceClient.from("organizer_applications").delete().eq("user_id", otherId);

    const otherInsert = await serviceClient
      .from("organizer_applications")
      .insert({
        user_id: otherId,
        business_name: "Other Crew",
        social_platform: "facebook",
        social_profile_url: "https://www.facebook.com/other-crew",
        status: "pending",
      })
      .select("id")
      .single();

    if (otherInsert.error) {
      throw new Error(`Failed to insert other application: ${otherInsert.error.message}`);
    }

    const otherApplicationId = otherInsert.data.id as string;
    cleanupApplicationIds.push(otherApplicationId);

    const applicantClient = await createAuthenticatedClient(
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );

    const peekResponse = await applicantClient.from("organizer_applications").select("id").eq("id", otherApplicationId);

    expect(peekResponse.error).toBeNull();
    expect(peekResponse.data).toEqual([]);
  });

  it("hides verification code hash from authenticated SELECT", async () => {
    const serviceClient = createServiceClient();
    const applicantId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );
    cleanupUserIds.push(applicantId);

    await serviceClient.from("organizer_roles").delete().eq("user_id", applicantId);
    await serviceClient.from("organizer_applications").delete().eq("user_id", applicantId);

    const insertResponse = await serviceClient
      .from("organizer_applications")
      .insert({
        user_id: applicantId,
        business_name: "Hidden Hash Crew",
        social_platform: "instagram",
        social_profile_url: "https://www.instagram.com/hidden-hash-crew/",
        status: "pending",
      })
      .select("id")
      .single();

    if (insertResponse.error) {
      throw new Error(`Failed to insert application: ${insertResponse.error.message}`);
    }

    const applicationId = insertResponse.data.id as string;
    cleanupApplicationIds.push(applicationId);

    const adminClient = await createAdminClient();
    const issueResponse = await adminClient.rpc("issue_organizer_verification_code", {
      p_application_id: applicationId,
    });
    expect(issueResponse.error).toBeNull();

    const serviceHashSelect = await serviceClient
      .from("organizer_applications")
      .select("verification_code_hash")
      .eq("id", applicationId)
      .single();
    expect(serviceHashSelect.error).toBeNull();
    expect(serviceHashSelect.data?.verification_code_hash).toEqual(expect.any(String));

    const applicantClient = await createAuthenticatedClient(
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );
    const safeSelect = await applicantClient
      .from("organizer_applications")
      .select("id, status, code_attempt_count")
      .eq("id", applicationId)
      .single();

    expect(safeSelect.error).toBeNull();
    expect(safeSelect.data).not.toHaveProperty("verification_code_hash");

    const hashSelect = await applicantClient
      .from("organizer_applications")
      .select("id, verification_code_hash")
      .eq("id", applicationId)
      .single();

    expect(hashSelect.error).not.toBeNull();
  });

  it("denies direct fan UPDATE on own application", async () => {
    const serviceClient = createServiceClient();
    const applicantId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );
    cleanupUserIds.push(applicantId);

    await serviceClient.from("organizer_roles").delete().eq("user_id", applicantId);
    await serviceClient.from("organizer_applications").delete().eq("user_id", applicantId);

    const applicantClient = await createAuthenticatedClient(
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );

    const insertResponse = await applicantClient
      .from("organizer_applications")
      .insert({
        user_id: applicantId,
        business_name: "No Update Crew",
        social_platform: "instagram",
        social_profile_url: "https://www.instagram.com/no-update-crew/",
        status: "pending",
      })
      .select("id")
      .single();

    if (insertResponse.error) {
      throw new Error(`Expected application insert to succeed: ${insertResponse.error.message}`);
    }

    const applicationId = insertResponse.data.id as string;
    cleanupApplicationIds.push(applicationId);

    const updateResponse = await applicantClient
      .from("organizer_applications")
      .update({ business_name: "Changed by fan" })
      .eq("id", applicationId);

    expect(updateResponse.error).not.toBeNull();
  });

  it("runs issue → verify → approve RPC flow and grants organizer role", async () => {
    const serviceClient = createServiceClient();
    const applicantId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );
    cleanupUserIds.push(applicantId);

    await serviceClient.from("organizer_roles").delete().eq("user_id", applicantId);
    await serviceClient.from("organizer_applications").delete().eq("user_id", applicantId);

    const insertResponse = await serviceClient
      .from("organizer_applications")
      .insert({
        user_id: applicantId,
        business_name: "RPC Flow Crew",
        social_platform: "facebook",
        social_profile_url: "https://www.facebook.com/rpc-flow-crew",
        status: "pending",
      })
      .select("id")
      .single();

    if (insertResponse.error) {
      throw new Error(`Failed to insert application: ${insertResponse.error.message}`);
    }

    const applicationId = insertResponse.data.id as string;
    cleanupApplicationIds.push(applicationId);

    const adminClient = await createAdminClient();
    const applicantClient = await createAuthenticatedClient(
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );

    const issueResponse = await adminClient.rpc("issue_organizer_verification_code", {
      p_application_id: applicationId,
    });

    expect(issueResponse.error).toBeNull();
    const plaintextCode = issueResponse.data as string;
    expect(plaintextCode).toMatch(/^[A-Z2-9]{8}$/);

    const verifyResponse = await applicantClient.rpc("verify_organizer_application_code", {
      p_application_id: applicationId,
      p_code: plaintextCode,
    });

    expect(verifyResponse.error).toBeNull();
    const verifiedApplication = verifyResponse.data as OrganizerApplicationSafeRpcRow;
    expect(verifiedApplication.status).toBe("code_verified");

    const approveResponse = await adminClient.rpc("approve_organizer_application", {
      p_application_id: applicationId,
    });

    expect(approveResponse.error).toBeNull();
    const approvedApplication = approveResponse.data as OrganizerApplicationSafeRpcRow;
    expect(approvedApplication.status).toBe("approved");

    const isOrganizerResponse = await applicantClient.rpc("is_organizer");
    expect(isOrganizerResponse.error).toBeNull();
    expect(isOrganizerResponse.data).toBe(true);
  });

  it("allows admin to reject active application with reason", async () => {
    const serviceClient = createServiceClient();
    const applicantId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_ORGANIZER_OTHER_EMAIL,
      INTEGRATION_ORGANIZER_OTHER_PASSWORD,
    );
    cleanupUserIds.push(applicantId);

    await serviceClient.from("organizer_roles").delete().eq("user_id", applicantId);
    await serviceClient.from("organizer_applications").delete().eq("user_id", applicantId);

    const insertResponse = await serviceClient
      .from("organizer_applications")
      .insert({
        user_id: applicantId,
        business_name: "Reject Flow Crew",
        social_platform: "facebook",
        social_profile_url: "https://www.facebook.com/reject-flow-crew",
        status: "code_verified",
        code_verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertResponse.error) {
      throw new Error(`Failed to insert application: ${insertResponse.error.message}`);
    }

    const applicationId = insertResponse.data.id as string;
    cleanupApplicationIds.push(applicationId);

    const adminClient = await createAdminClient();
    const rejectResponse = await adminClient.rpc("reject_organizer_application", {
      p_application_id: applicationId,
      p_reason: "Profil nie wygląda na oficjalny",
    });

    expect(rejectResponse.error).toBeNull();
    const rejectedApplication = rejectResponse.data as OrganizerApplicationSafeRpcRow;
    expect(rejectedApplication.status).toBe("rejected");
    expect(rejectedApplication.decision_reason).toBe("Profil nie wygląda na oficjalny");
  });

  it("enforces verification code attempt limit", async () => {
    const serviceClient = createServiceClient();
    const applicantId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );
    cleanupUserIds.push(applicantId);

    await serviceClient.from("organizer_roles").delete().eq("user_id", applicantId);
    await serviceClient.from("organizer_applications").delete().eq("user_id", applicantId);

    const insertResponse = await serviceClient
      .from("organizer_applications")
      .insert({
        user_id: applicantId,
        business_name: "Attempt Limit Crew",
        social_platform: "instagram",
        social_profile_url: "https://www.instagram.com/attempt-limit-crew/",
        status: "pending",
      })
      .select("id")
      .single();

    if (insertResponse.error) {
      throw new Error(`Failed to insert application: ${insertResponse.error.message}`);
    }

    const applicationId = insertResponse.data.id as string;
    cleanupApplicationIds.push(applicationId);

    const adminClient = await createAdminClient();
    const issueResponse = await adminClient.rpc("issue_organizer_verification_code", {
      p_application_id: applicationId,
    });
    expect(issueResponse.error).toBeNull();

    const applicantClient = await createAuthenticatedClient(
      INTEGRATION_ORGANIZER_APPLICANT_EMAIL,
      INTEGRATION_ORGANIZER_APPLICANT_PASSWORD,
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const verifyResponse = await applicantClient.rpc("verify_organizer_application_code", {
        p_application_id: applicationId,
        p_code: "AAAAAA",
      });
      expect(verifyResponse.error).toBeNull();
      const application = verifyResponse.data as OrganizerApplicationSafeRpcRow;
      expect(application.status).toBe("code_issued");
    }

    const limitResponse = await applicantClient.rpc("verify_organizer_application_code", {
      p_application_id: applicationId,
      p_code: "AAAAAA",
    });

    expect(limitResponse.error).not.toBeNull();
    expect(limitResponse.error?.message).toContain("attempt limit exceeded");
  });

  it("denies fan approve RPC and anon reads", async () => {
    const serviceClient = createServiceClient();
    const applicantId = await ensureAuthUser(
      serviceClient,
      INTEGRATION_ORGANIZER_OTHER_EMAIL,
      INTEGRATION_ORGANIZER_OTHER_PASSWORD,
    );
    cleanupUserIds.push(applicantId);

    await serviceClient.from("organizer_roles").delete().eq("user_id", applicantId);
    await serviceClient.from("organizer_applications").delete().eq("user_id", applicantId);

    const insertResponse = await serviceClient
      .from("organizer_applications")
      .insert({
        user_id: applicantId,
        business_name: "Deny Approve Crew",
        social_platform: "instagram",
        social_profile_url: "https://www.instagram.com/deny-approve/",
        status: "code_verified",
        code_verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertResponse.error) {
      throw new Error(`Failed to insert application: ${insertResponse.error.message}`);
    }

    const applicationId = insertResponse.data.id as string;
    cleanupApplicationIds.push(applicationId);

    const applicantClient = await createAuthenticatedClient(
      INTEGRATION_ORGANIZER_OTHER_EMAIL,
      INTEGRATION_ORGANIZER_OTHER_PASSWORD,
    );

    const approveResponse = await applicantClient.rpc("approve_organizer_application", {
      p_application_id: applicationId,
    });

    expect(approveResponse.error).not.toBeNull();

    const anonClient = createAnonClient();
    const anonSelect = await anonClient.from("organizer_applications").select("id").limit(1);
    expect(anonSelect.error).not.toBeNull();
  });
});

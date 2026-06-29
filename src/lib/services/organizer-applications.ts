import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSubmitterProfiles } from "@/lib/auth/submitter-profile";
import type { OrganizerApplicationInput } from "@/lib/organizer/application-schema";
import type { OrganizerApplication, OrganizerApplicationListItem, OrganizerApplicationRow } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

const APPLICATION_SELECT =
  "id, user_id, business_name, social_platform, social_profile_url, description, status, code_issued_at, code_verified_at, code_attempt_count, reviewed_by, reviewed_at, decision_reason, created_at, updated_at";

type SafeApplicationRow = OrganizerApplicationRow;

export function mapOrganizerApplicationRow(row: SafeApplicationRow): OrganizerApplication {
  return {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    socialPlatform: row.social_platform,
    socialProfileUrl: row.social_profile_url,
    description: row.description,
    status: row.status,
    codeIssuedAt: row.code_issued_at,
    codeVerifiedAt: row.code_verified_at,
    codeAttemptCount: row.code_attempt_count,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    decisionReason: row.decision_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createOrganizerApplication(
  supabase: SupabaseClient,
  userId: string,
  input: OrganizerApplicationInput,
): Promise<ServiceResult<OrganizerApplication>> {
  const insertResponse = await supabase
    .from("organizer_applications")
    .insert({
      user_id: userId,
      business_name: input.businessName,
      social_platform: input.socialPlatform,
      social_profile_url: input.socialProfileUrl,
      description: input.description,
      status: "pending",
    })
    .select(APPLICATION_SELECT)
    .single();

  if (insertResponse.error) {
    if (insertResponse.error.code === "23505") {
      return { error: "Masz już aktywny wniosek organizatora" };
    }
    if (insertResponse.error.code === "42501") {
      return { error: "Nie możesz złożyć wniosku organizatora" };
    }
    return { error: "Nie udało się złożyć wniosku" };
  }

  return { data: mapOrganizerApplicationRow(insertResponse.data) };
}

export async function getOwnOrganizerApplication(
  supabase: SupabaseClient,
  userId: string,
): Promise<ServiceResult<OrganizerApplication | null>> {
  const response = await supabase
    .from("organizer_applications")
    .select(APPLICATION_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (response.error) {
    return { error: "Nie udało się pobrać wniosku" };
  }

  const row = response.data[0] as SafeApplicationRow | undefined;
  return { data: row ? mapOrganizerApplicationRow(row) : null };
}

export async function listOrganizerApplicationsForAdmin(
  supabase: SupabaseClient,
): Promise<ServiceResult<OrganizerApplicationListItem[]>> {
  const response = await supabase
    .from("organizer_applications")
    .select(APPLICATION_SELECT)
    .order("created_at", { ascending: false });

  if (response.error) {
    return { error: "Nie udało się pobrać wniosków" };
  }

  const rows = (response.data as SafeApplicationRow[]).map(mapOrganizerApplicationRow);
  const profiles = await resolveSubmitterProfiles(rows.map((row) => row.userId));

  const items: OrganizerApplicationListItem[] = rows.map((row) => {
    const profile = profiles.get(row.userId);
    return {
      ...row,
      submitterEmail: profile?.email ?? null,
      submitterLogin: profile?.login ?? null,
    };
  });

  return { data: items };
}

export async function issueVerificationCode(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<ServiceResult<{ code: string }>> {
  const response = await supabase.rpc("issue_organizer_verification_code", {
    p_application_id: applicationId,
  });

  if (response.error) {
    return { error: mapRpcError(response.error.message) };
  }

  return { data: { code: response.data as string } };
}

export async function verifyOrganizerCode(
  supabase: SupabaseClient,
  applicationId: string,
  code: string,
): Promise<ServiceResult<OrganizerApplication>> {
  const response = await supabase.rpc("verify_organizer_application_code", {
    p_application_id: applicationId,
    p_code: code,
  });

  if (response.error) {
    return { error: mapRpcError(response.error.message) };
  }

  return { data: mapOrganizerApplicationRow(response.data as SafeApplicationRow) };
}

export async function approveOrganizerApplication(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<ServiceResult<OrganizerApplication>> {
  const response = await supabase.rpc("approve_organizer_application", {
    p_application_id: applicationId,
  });

  if (response.error) {
    return { error: mapRpcError(response.error.message) };
  }

  return { data: mapOrganizerApplicationRow(response.data as SafeApplicationRow) };
}

export async function rejectOrganizerApplication(
  supabase: SupabaseClient,
  applicationId: string,
  reason: string | null,
): Promise<ServiceResult<OrganizerApplication>> {
  const response = await supabase.rpc("reject_organizer_application", {
    p_application_id: applicationId,
    p_reason: reason,
  });

  if (response.error) {
    return { error: mapRpcError(response.error.message) };
  }

  return { data: mapOrganizerApplicationRow(response.data as SafeApplicationRow) };
}

function mapRpcError(message: string): string {
  if (message.includes("not found")) {
    return "Nie znaleziono wniosku";
  }
  if (message.includes("admin required")) {
    return "Brak uprawnień administratora";
  }
  if (message.includes("attempt limit exceeded")) {
    return "Przekroczono limit prób. Poproś administratora o nowy kod";
  }
  if (message.includes("invalid code")) {
    return "Nieprawidłowy kod weryfikacyjny";
  }
  if (message.includes("invalid code format")) {
    return "Nieprawidłowy format kodu";
  }
  if (message.includes("only application owner")) {
    return "Nie możesz weryfikować cudzego wniosku";
  }
  if (message.includes("must be code_issued")) {
    return "Wniosek nie oczekuje na wpisanie kodu";
  }
  if (message.includes("must be code_verified")) {
    return "Wniosek nie został jeszcze zweryfikowany kodem";
  }
  if (message.includes("must be pending or code_issued")) {
    return "Nie można wygenerować kodu dla tego wniosku";
  }
  if (message.includes("is not active")) {
    return "Wniosek nie jest już aktywny";
  }
  return "Operacja nie powiodła się";
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { getStartOfTodayWarsawUtcIso } from "@/lib/events/format";
import { mapEventRow, type EventRow } from "@/lib/events/mapper";
import type { AttendanceStatus, Event, EventAttendanceRow, EventAttendanceSummary } from "@/types";

type ServiceResult<T> = { data: T } | { error: string };

const EVENT_ATTENDANCE_SELECT = "id, user_id, event_id, status, created_at, updated_at";

function mapAttendanceRow(row: EventAttendanceRow) {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function attendanceRlsError(): string {
  return "Nie można oznaczyć udziału w tym wydarzeniu";
}

/** PostgREST when a migration was not applied yet (code deployed before db push). */
function isMissingAttendanceTableError(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? "";
  return (
    error.code === "PGRST205" ||
    message.includes("Could not find the table") ||
    message.includes("schema cache")
  );
}

function emptyGoingCounts(eventIds: string[]): Record<string, number> {
  return Object.fromEntries(eventIds.map((id) => [id, 0]));
}

export async function getAttendanceSummary(
  supabase: SupabaseClient,
  eventId: string,
  userId?: string | null,
): Promise<ServiceResult<EventAttendanceSummary>> {
  const [goingResponse, interestedResponse, userResponse] = await Promise.all([
    supabase
      .from("event_attendance")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "going"),
    supabase
      .from("event_attendance")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "interested"),
    userId
      ? supabase.from("event_attendance").select("status").eq("event_id", eventId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (goingResponse.error) {
    if (isMissingAttendanceTableError(goingResponse.error)) {
      return {
        data: { goingCount: 0, interestedCount: 0, userStatus: null },
      };
    }
    return { error: goingResponse.error.message };
  }
  if (interestedResponse.error) {
    if (isMissingAttendanceTableError(interestedResponse.error)) {
      return {
        data: { goingCount: 0, interestedCount: 0, userStatus: null },
      };
    }
    return { error: interestedResponse.error.message };
  }
  if (userResponse.error) {
    if (isMissingAttendanceTableError(userResponse.error)) {
      return {
        data: {
          goingCount: goingResponse.count ?? 0,
          interestedCount: interestedResponse.count ?? 0,
          userStatus: null,
        },
      };
    }
    return { error: userResponse.error.message };
  }

  const userStatus =
    userResponse.data && "status" in userResponse.data ? (userResponse.data.status as AttendanceStatus) : null;

  return {
    data: {
      goingCount: goingResponse.count ?? 0,
      interestedCount: interestedResponse.count ?? 0,
      userStatus,
    },
  };
}

export async function setAttendanceStatus(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  status: AttendanceStatus,
): Promise<ServiceResult<ReturnType<typeof mapAttendanceRow>>> {
  const response = await supabase
    .from("event_attendance")
    .upsert(
      {
        user_id: userId,
        event_id: eventId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,event_id" },
    )
    .select(EVENT_ATTENDANCE_SELECT)
    .single();

  if (response.error) {
    if (response.error.code === "42501") {
      return { error: attendanceRlsError() };
    }
    return { error: response.error.message };
  }

  return { data: mapAttendanceRow(response.data) };
}

export async function clearAttendance(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<ServiceResult<{ cleared: boolean }>> {
  const response = await supabase
    .from("event_attendance")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();

  if (response.error) {
    if (response.error.code === "42501") {
      return { error: attendanceRlsError() };
    }
    return { error: response.error.message };
  }

  return { data: { cleared: response.data !== null } };
}

export async function listEventsForUserAttendance(
  supabase: SupabaseClient,
  userId: string,
  status: AttendanceStatus,
): Promise<ServiceResult<Event[]>> {
  const attendanceResponse = await supabase
    .from("event_attendance")
    .select("event_id")
    .eq("user_id", userId)
    .eq("status", status);

  if (attendanceResponse.error) {
    if (isMissingAttendanceTableError(attendanceResponse.error)) {
      return { data: [] };
    }
    return { error: attendanceResponse.error.message };
  }

  const eventIds = (attendanceResponse.data as { event_id: string }[] | null)?.map((row) => row.event_id) ?? [];
  if (eventIds.length === 0) {
    return { data: [] };
  }

  const todayStart = getStartOfTodayWarsawUtcIso();
  const eventsResponse = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds)
    .eq("status", "published")
    .gte("starts_at", todayStart)
    .order("starts_at", { ascending: true });

  if (eventsResponse.error) {
    return { error: "Nie udało się załadować wydarzeń" };
  }

  return { data: (eventsResponse.data as EventRow[]).map(mapEventRow) };
}

export async function getGoingCountsByEventIds(
  supabase: SupabaseClient,
  eventIds: string[],
): Promise<ServiceResult<Record<string, number>>> {
  if (eventIds.length === 0) {
    return { data: {} };
  }

  const response = await supabase
    .from("event_attendance")
    .select("event_id")
    .in("event_id", eventIds)
    .eq("status", "going");

  if (response.error) {
    if (isMissingAttendanceTableError(response.error)) {
      return { data: emptyGoingCounts(eventIds) };
    }
    return { error: response.error.message };
  }

  const counts: Record<string, number> = emptyGoingCounts(eventIds);
  for (const row of (response.data as { event_id: string }[] | null) ?? []) {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  }

  return { data: counts };
}

export async function getUserAttendanceByEventIds(
  supabase: SupabaseClient,
  userId: string,
  eventIds: string[],
): Promise<ServiceResult<Record<string, AttendanceStatus>>> {
  if (eventIds.length === 0) {
    return { data: {} };
  }

  const response = await supabase
    .from("event_attendance")
    .select("event_id, status")
    .eq("user_id", userId)
    .in("event_id", eventIds);

  if (response.error) {
    if (isMissingAttendanceTableError(response.error)) {
      return { data: {} };
    }
    return { error: response.error.message };
  }

  const statuses: Record<string, AttendanceStatus> = {};
  for (const row of (response.data as Pick<EventAttendanceRow, "event_id" | "status">[] | null) ?? []) {
    statuses[row.event_id] = row.status;
  }

  return { data: statuses };
}

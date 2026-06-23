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

export async function getAttendanceSummary(
  supabase: SupabaseClient,
  eventId: string,
  userId?: string | null,
): Promise<ServiceResult<EventAttendanceSummary>> {
  const response = await supabase.from("event_attendance").select("status, user_id").eq("event_id", eventId);

  if (response.error) {
    return { error: response.error.message };
  }

  const rows = (response.data as Pick<EventAttendanceRow, "status" | "user_id">[] | null) ?? [];
  let goingCount = 0;
  let interestedCount = 0;
  let userStatus: AttendanceStatus | null = null;

  for (const row of rows) {
    if (row.status === "going") {
      goingCount += 1;
    } else {
      interestedCount += 1;
    }
    if (userId && row.user_id === userId) {
      userStatus = row.status;
    }
  }

  return { data: { goingCount, interestedCount, userStatus } };
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
    return { error: response.error.message };
  }

  const counts: Record<string, number> = Object.fromEntries(eventIds.map((id) => [id, 0]));
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
    return { error: response.error.message };
  }

  const statuses: Record<string, AttendanceStatus> = {};
  for (const row of (response.data as Pick<EventAttendanceRow, "event_id" | "status">[] | null) ?? []) {
    statuses[row.event_id] = row.status;
  }

  return { data: statuses };
}

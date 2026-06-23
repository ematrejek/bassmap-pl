import { readApiError } from "@/lib/api/json";
import type { AttendanceStatus, EventAttendanceSummary } from "@/types";
import { useState } from "react";

interface Options {
  eventId: string;
  initialGoingCount: number;
  initialInterestedCount: number;
  initialUserStatus: AttendanceStatus | null;
}

export function useEventAttendance({ eventId, initialGoingCount, initialInterestedCount, initialUserStatus }: Options) {
  const [goingCount, setGoingCount] = useState(initialGoingCount);
  const [interestedCount, setInterestedCount] = useState(initialInterestedCount);
  const [userStatus, setUserStatus] = useState<AttendanceStatus | null>(initialUserStatus);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<AttendanceStatus | null>(null);

  function applySummary(summary: EventAttendanceSummary) {
    setGoingCount(summary.goingCount);
    setInterestedCount(summary.interestedCount);
    setUserStatus(summary.userStatus);
  }

  async function handleStatusClick(requestedStatus: AttendanceStatus) {
    if (pendingStatus !== null) {
      return;
    }

    setError(null);
    setPendingStatus(requestedStatus);

    const isToggleOff = userStatus === requestedStatus;

    try {
      const response = await fetch(`/api/events/${eventId}/attendance`, {
        method: isToggleOff ? "DELETE" : "PUT",
        headers: isToggleOff ? undefined : { "Content-Type": "application/json" },
        body: isToggleOff ? undefined : JSON.stringify({ status: requestedStatus }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się zaktualizować udziału");
        return;
      }

      if (typeof data === "object" && data !== null && "goingCount" in data && "interestedCount" in data) {
        applySummary(data as EventAttendanceSummary);
      }
    } catch {
      setError("Nie udało się zaktualizować udziału");
    } finally {
      setPendingStatus(null);
    }
  }

  return {
    goingCount,
    interestedCount,
    userStatus,
    pendingStatus,
    error,
    handleStatusClick,
  };
}

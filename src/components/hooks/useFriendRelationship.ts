import { readApiError } from "@/lib/api/json";
import type { FriendRelationshipStatus, FriendRequestActionResult, FriendRequestSummary } from "@/lib/services/friends";
import { useCallback, useEffect, useState } from "react";

const EMPTY_STATUS: FriendRelationshipStatus = {
  state: "none",
  requestId: null,
  acceptedAt: null,
};

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function useFriendRelationship(targetUserId: string) {
  const [relationship, setRelationship] = useState<FriendRelationshipStatus>(EMPTY_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadRelationship = useCallback(async () => {
    try {
      const response = await fetch(`/api/fan/friends/status?userId=${encodeURIComponent(targetUserId)}`, {
        credentials: "include",
      });
      const data = await parseJson(response);

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się sprawdzić relacji");
        return;
      }

      setRelationship(data as FriendRelationshipStatus);
    } catch {
      setError("Nie udało się sprawdzić relacji");
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialRelationship() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/fan/friends/status?userId=${encodeURIComponent(targetUserId)}`, {
          credentials: "include",
        });
        const data = await parseJson(response);

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setError(readApiError(data) ?? "Nie udało się sprawdzić relacji");
          return;
        }

        setRelationship(data as FriendRelationshipStatus);
      } catch {
        if (isMounted) {
          setError("Nie udało się sprawdzić relacji");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialRelationship();

    return () => {
      isMounted = false;
    };
  }, [targetUserId]);

  async function mutate(
    actionKey: string,
    request: () => Promise<Response>,
    fallbackError: string,
  ): Promise<{ data: unknown } | { error: string }> {
    setError(null);
    setPendingAction(actionKey);

    try {
      const response = await request();
      const data = await parseJson(response);

      if (!response.ok) {
        const message = readApiError(data) ?? fallbackError;
        setError(message);
        return { error: message };
      }

      await loadRelationship();
      return { data };
    } catch {
      setError(fallbackError);
      return { error: fallbackError };
    } finally {
      setPendingAction(null);
    }
  }

  async function sendRequest(targetLogin: string): Promise<{ data: FriendRequestActionResult } | { error: string }> {
    const result = await mutate(
      "send",
      () =>
        fetch("/api/fan/friends/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ targetLogin }),
        }),
      "Nie udało się wysłać zaproszenia",
    );
    if ("error" in result) {
      return result;
    }
    return { data: result.data as FriendRequestActionResult };
  }

  async function updateRequest(
    requestId: string,
    status: "accepted" | "declined",
  ): Promise<{ data: { request: FriendRequestSummary } } | { error: string }> {
    const result = await mutate(
      `${status}:${requestId}`,
      () =>
        fetch(`/api/fan/friends/requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        }),
      "Nie udało się zaktualizować zaproszenia",
    );
    if ("error" in result) {
      return result;
    }
    return { data: result.data as { request: FriendRequestSummary } };
  }

  return {
    relationship,
    isLoading,
    error,
    pendingAction,
    sendRequest,
    acceptRequest: (requestId: string) => updateRequest(requestId, "accepted"),
    declineRequest: (requestId: string) => updateRequest(requestId, "declined"),
  };
}

import { readApiError } from "@/lib/api/json";
import type { FriendRequestActionResult, FriendRequestSummary, FriendsOverview } from "@/lib/services/friends";
import { useCallback, useEffect, useState } from "react";

const EMPTY_OVERVIEW: FriendsOverview = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
};

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function useFriends() {
  const [overview, setOverview] = useState<FriendsOverview>(EMPTY_OVERVIEW);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      const response = await fetch("/api/fan/friends", {
        credentials: "include",
      });
      const data = await parseJson(response);

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się załadować znajomych");
        return;
      }

      setOverview(data as FriendsOverview);
    } catch {
      setError("Nie udało się załadować znajomych");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    await loadFriends();
  }, [loadFriends]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialFriends() {
      try {
        const response = await fetch("/api/fan/friends", {
          credentials: "include",
        });
        const data = await parseJson(response);

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setError(readApiError(data) ?? "Nie udało się załadować znajomych");
          return;
        }

        setOverview(data as FriendsOverview);
      } catch {
        if (isMounted) {
          setError("Nie udało się załadować znajomych");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialFriends();

    return () => {
      isMounted = false;
    };
  }, []);

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

      await refresh();
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

  async function removeFriend(friendshipId: string): Promise<{ data: { deleted: boolean } } | { error: string }> {
    const result = await mutate(
      `delete:${friendshipId}`,
      () =>
        fetch(`/api/fan/friends/${friendshipId}`, {
          method: "DELETE",
          credentials: "include",
        }),
      "Nie udało się usunąć znajomego",
    );
    if ("error" in result) {
      return result;
    }
    return { data: result.data as { deleted: boolean } };
  }

  return {
    overview,
    isLoading,
    error,
    pendingAction,
    refresh,
    sendRequest,
    acceptRequest: (requestId: string) => updateRequest(requestId, "accepted"),
    declineRequest: (requestId: string) => updateRequest(requestId, "declined"),
    removeFriend,
  };
}

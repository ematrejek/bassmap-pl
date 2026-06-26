import { readApiError } from "@/lib/api/json";
import type { CreateCrewInput, UpdateCrewInput } from "@/lib/fan/crew-schema";
import type { Crew, CrewContact, CrewJoinRequest, CrewOverview } from "@/types";
import { useCallback, useEffect, useState } from "react";

const EMPTY_OVERVIEW: CrewOverview = {
  ownCrew: null,
  membership: null,
  members: [],
  incomingRequests: [],
  outgoingRequest: null,
};

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function useCrews() {
  const [overview, setOverview] = useState<CrewOverview>(EMPTY_OVERVIEW);
  const [viewedCrew, setViewedCrew] = useState<Crew | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const applyOverview = useCallback(async (data: CrewOverview) => {
    setOverview(data);

    if (data.ownCrew) {
      setViewedCrew(null);
      return;
    }

    const memberCrewId = data.membership?.crewId;
    if (!memberCrewId) {
      setViewedCrew(null);
      return;
    }

    try {
      const response = await fetch(`/api/fan/crews/${memberCrewId}`, {
        credentials: "include",
      });
      const crewData = await parseJson(response);

      if (!response.ok) {
        setViewedCrew(null);
        return;
      }

      setViewedCrew((crewData as { crew: Crew }).crew);
    } catch {
      setViewedCrew(null);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const response = await fetch("/api/fan/crews", {
        credentials: "include",
      });
      const data = await parseJson(response);

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się załadować ekipy");
        return;
      }

      await applyOverview(data as CrewOverview);
    } catch {
      setError("Nie udało się załadować ekipy");
    } finally {
      setIsLoading(false);
    }
  }, [applyOverview]);

  const refresh = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    await loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialOverview() {
      try {
        const response = await fetch("/api/fan/crews", {
          credentials: "include",
        });
        const data = await parseJson(response);

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setError(readApiError(data) ?? "Nie udało się załadować ekipy");
          return;
        }

        await applyOverview(data as CrewOverview);
      } catch {
        if (isMounted) {
          setError("Nie udało się załadować ekipy");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialOverview();

    return () => {
      isMounted = false;
    };
  }, [applyOverview]);

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

  async function createCrew(input: CreateCrewInput): Promise<{ data: { crew: Crew } } | { error: string }> {
    const result = await mutate(
      "create",
      () =>
        fetch("/api/fan/crews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(input),
        }),
      "Nie udało się utworzyć ekipy",
    );
    if ("error" in result) {
      return result;
    }
    return { data: result.data as { crew: Crew } };
  }

  async function updateCrew(
    crewId: string,
    input: UpdateCrewInput,
  ): Promise<{ data: { crew: Crew } } | { error: string }> {
    const result = await mutate(
      `update:${crewId}`,
      () =>
        fetch(`/api/fan/crews/${crewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(input),
        }),
      "Nie udało się zaktualizować ekipy",
    );
    if ("error" in result) {
      return result;
    }
    return { data: result.data as { crew: Crew } };
  }

  async function deleteCrew(crewId: string): Promise<{ data: { deleted: boolean } } | { error: string }> {
    const result = await mutate(
      `delete:${crewId}`,
      () =>
        fetch(`/api/fan/crews/${crewId}`, {
          method: "DELETE",
          credentials: "include",
        }),
      "Nie udało się usunąć ekipy",
    );
    if ("error" in result) {
      return result;
    }
    return { data: result.data as { deleted: boolean } };
  }

  async function requestJoin(crewId: string): Promise<{ data: { request: CrewJoinRequest } } | { error: string }> {
    const result = await mutate(
      `request:${crewId}`,
      () =>
        fetch(`/api/fan/crews/${crewId}/requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        }),
      "Nie udało się wysłać prośby",
    );
    if ("error" in result) {
      return result;
    }
    return { data: result.data as { request: CrewJoinRequest } };
  }

  async function respondRequest(
    requestId: string,
    status: "accepted" | "declined",
  ): Promise<{ data: { request: CrewJoinRequest } } | { error: string }> {
    const result = await mutate(
      `${status}:${requestId}`,
      () =>
        fetch(`/api/fan/crews/requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        }),
      "Nie udało się zaktualizować prośby",
    );
    if ("error" in result) {
      return result;
    }
    return { data: result.data as { request: CrewJoinRequest } };
  }

  async function leaveCrew(crewId: string): Promise<{ data: { deleted: boolean } } | { error: string }> {
    const result = await mutate(
      `leave:${crewId}`,
      () =>
        fetch(`/api/fan/crews/${crewId}/leave`, {
          method: "POST",
          credentials: "include",
        }),
      "Nie udało się opuścić ekipy",
    );
    if ("error" in result) {
      return result;
    }
    return { data: result.data as { deleted: boolean } };
  }

  async function removeMember(
    crewId: string,
    memberUserId: string,
  ): Promise<{ data: { deleted: boolean } } | { error: string }> {
    const result = await mutate(
      `remove:${memberUserId}`,
      () =>
        fetch(`/api/fan/crews/${crewId}/members/${memberUserId}`, {
          method: "DELETE",
          credentials: "include",
        }),
      "Nie udało się usunąć członka",
    );
    if ("error" in result) {
      return result;
    }
    return { data: result.data as { deleted: boolean } };
  }

  async function fetchContact(
    crewId: string,
    memberUserId: string,
  ): Promise<{ data: CrewContact } | { error: string }> {
    try {
      const response = await fetch(`/api/fan/crews/${crewId}/members/${memberUserId}`, {
        credentials: "include",
      });
      const data = await parseJson(response);

      if (!response.ok) {
        const message = readApiError(data) ?? "Nie udało się pobrać kontaktu";
        return { error: message };
      }

      return { data: (data as { contact: CrewContact }).contact };
    } catch {
      return { error: "Nie udało się pobrać kontaktu" };
    }
  }

  return {
    overview,
    displayedCrew: overview.ownCrew ?? viewedCrew,
    isLoading,
    error,
    pendingAction,
    refresh,
    createCrew,
    updateCrew,
    deleteCrew,
    requestJoin,
    respondRequest,
    acceptRequest: (requestId: string) => respondRequest(requestId, "accepted"),
    declineRequest: (requestId: string) => respondRequest(requestId, "declined"),
    leaveCrew,
    removeMember,
    fetchContact,
  };
}

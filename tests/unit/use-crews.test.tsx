import { useCrews } from "@/components/hooks/useCrews";
import type { Crew, CrewOverview } from "@/types";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const EMPTY_OVERVIEW: CrewOverview = {
  ownCrew: null,
  membership: null,
  members: [],
  incomingRequests: [],
  outgoingRequest: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCrews", () => {
  it("loads crew overview on mount", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(EMPTY_OVERVIEW),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ crews: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCrews());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/fan/crews", { credentials: "include" });
    expect(result.current.overview).toEqual(EMPTY_OVERVIEW);
    expect(result.current.error).toBeNull();
  });

  it("creates a crew and refreshes overview", async () => {
    const createdCrew: Crew = {
      id: "22222222-2222-2222-2222-222222222222",
      ownerId: "11111111-1111-1111-1111-111111111111",
      name: "Bass Crew",
      city: "Warszawa",
      subgenres: ["liquid_dnb"],
      description: "Test",
      createdAt: "2026-06-26T10:00:00.000Z",
      updatedAt: "2026-06-26T10:00:00.000Z",
    };

    const overviewWithCrew: CrewOverview = {
      ownCrew: createdCrew,
      membership: {
        crewId: createdCrew.id,
        userId: "11111111-1111-1111-1111-111111111111",
        role: "owner",
        login: "owner_fan",
        joinedAt: "2026-06-26T10:00:00.000Z",
      },
      members: [],
      incomingRequests: [],
      outgoingRequest: null,
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(EMPTY_OVERVIEW),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ crews: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ crew: createdCrew }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(overviewWithCrew),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ crews: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCrews());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      const createResult = await result.current.createCrew({
        name: "Bass Crew",
        city: "Warszawa",
        subgenres: ["liquid_dnb"],
        description: "Test",
      });
      expect("data" in createResult).toBe(true);
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/fan/crews",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(result.current.overview.ownCrew?.name).toBe("Bass Crew");
  });

  it("surfaces API errors when responding to a request fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(EMPTY_OVERVIEW),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ crews: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Nie masz uprawnień do tej ekipy" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(EMPTY_OVERVIEW),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ crews: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCrews());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      const respondResult = await result.current.declineRequest("33333333-3333-3333-3333-333333333333");
      expect("error" in respondResult).toBe(true);
    });

    expect(result.current.error).toBe("Nie masz uprawnień do tej ekipy");
  });
});

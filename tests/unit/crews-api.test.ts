import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Crew, CrewOverview } from "@/types";
import {
  CREW_ALREADY_EXISTS_ERROR,
  CREW_JOIN_REQUEST_ALREADY_PENDING_ERROR,
  createCrew,
  createCrewJoinRequest,
  deleteCrew,
  getCrewContactForAcceptedPair,
  getCrewOverview,
  listJoinableCrews,
  removeCrewMember,
  respondCrewJoinRequest,
  updateCrew,
} from "@/lib/services/crews";
import { DELETE as deleteCrewRoute, PATCH as patchCrewRoute } from "@/pages/api/fan/crews/[id]";
import { GET as getJoinableCrews } from "@/pages/api/fan/crews/joinable";
import { GET as getCrews, POST as postCrew } from "@/pages/api/fan/crews/index";
import { POST as postCrewRequest } from "@/pages/api/fan/crews/[id]/requests";
import { PATCH as patchCrewRequest } from "@/pages/api/fan/crews/requests/[id]";
import {
  DELETE as deleteCrewMemberRoute,
  GET as getCrewMemberContact,
} from "@/pages/api/fan/crews/[id]/members/[userId]";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;
const crewId = "22222222-2222-2222-2222-222222222222";
const requestId = "33333333-3333-3333-3333-333333333333";
const memberId = "44444444-4444-4444-4444-444444444444";

const mockCrew: Crew = {
  id: crewId,
  ownerId: mockUser.id,
  name: "Amen Crew",
  city: "Warszawa",
  subgenres: ["neurofunk"],
  description: "Ekipa na koncerty DnB",
  createdAt: "2026-06-26T10:00:00.000Z",
  updatedAt: "2026-06-26T10:00:00.000Z",
};

const mockMember = {
  crewId,
  userId: mockUser.id,
  role: "owner" as const,
  login: "amen_fan",
  joinedAt: "2026-06-26T10:00:00.000Z",
};

const mockRequest = {
  id: requestId,
  crewId,
  requesterId: memberId,
  requesterLogin: "candidate",
  status: "pending" as const,
  createdAt: "2026-06-26T10:05:00.000Z",
  updatedAt: "2026-06-26T10:05:00.000Z",
};

const mockOverview: CrewOverview = {
  ownCrew: mockCrew,
  membership: mockMember,
  members: [mockMember],
  incomingRequests: [mockRequest],
  outgoingRequest: null,
};

const mockContact = {
  login: "candidate",
  instagramUrl: "https://instagram.com/candidate",
  soundcloudUrl: null,
  facebookUrl: null,
  spotifyUrl: null,
  twitchUrl: null,
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/crews", () => ({
  getCrewOverview: vi.fn(() => Promise.resolve({ data: mockOverview })),
  listJoinableCrews: vi.fn(() =>
    Promise.resolve({
      data: [{ crew: mockCrew, pendingRequest: null }],
    }),
  ),
  createCrew: vi.fn(() => Promise.resolve({ data: mockCrew })),
  updateCrew: vi.fn(() => Promise.resolve({ data: mockCrew })),
  deleteCrew: vi.fn(() => Promise.resolve({ data: { deleted: true } })),
  getCrewByIdForViewer: vi.fn(() =>
    Promise.resolve({ data: { crew: mockCrew, members: [mockMember], isMember: true, pendingRequest: null } }),
  ),
  createCrewJoinRequest: vi.fn(() => Promise.resolve({ data: mockRequest })),
  respondCrewJoinRequest: vi.fn(() => Promise.resolve({ data: { ...mockRequest, status: "accepted" as const } })),
  leaveCrew: vi.fn(() => Promise.resolve({ data: { deleted: true } })),
  removeCrewMember: vi.fn(() => Promise.resolve({ data: { deleted: true } })),
  getCrewContactForAcceptedPair: vi.fn(() => Promise.resolve({ data: mockContact })),
  CREW_NOT_FOUND_ERROR: "Nie znaleziono ekipy",
  CREW_FORBIDDEN_ERROR: "Nie masz uprawnień do tej ekipy",
  CREW_ALREADY_EXISTS_ERROR: "Masz już własną ekipę",
  CREW_MEMBER_NOT_FOUND_ERROR: "Nie znaleziono członka ekipy",
  CREW_ALREADY_MEMBER_ERROR: "Jesteś już w tej ekipie",
  CREW_JOIN_REQUEST_NOT_FOUND_ERROR: "Nie znaleziono prośby o dołączenie",
  CREW_JOIN_REQUEST_ALREADY_PENDING_ERROR: "Prośba o dołączenie jest już wysłana",
  CREW_JOIN_REQUEST_NOT_PENDING_ERROR: "Ta prośba została już obsłużona",
  CREW_JOIN_REQUEST_SELF_ERROR: "Nie możesz prosić o dołączenie do własnej ekipy",
  CREW_CONTACT_NOT_AVAILABLE_ERROR: "Kontakt jest dostępny tylko dla członków tej samej ekipy",
  CREW_OWNER_CANNOT_LEAVE_ERROR: "Właściciel nie może opuścić własnej ekipy",
}));

const mockGetCrewOverview = vi.mocked(getCrewOverview);
const mockListJoinableCrews = vi.mocked(listJoinableCrews);
const mockCreateCrew = vi.mocked(createCrew);
const mockUpdateCrew = vi.mocked(updateCrew);
const mockDeleteCrew = vi.mocked(deleteCrew);
const mockCreateCrewJoinRequest = vi.mocked(createCrewJoinRequest);
const mockRespondCrewJoinRequest = vi.mocked(respondCrewJoinRequest);
const mockRemoveCrewMember = vi.mocked(removeCrewMember);
const mockGetCrewContactForAcceptedPair = vi.mocked(getCrewContactForAcceptedPair);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCrewOverview.mockResolvedValue({ data: mockOverview });
  mockListJoinableCrews.mockResolvedValue({ data: [{ crew: mockCrew, pendingRequest: null }] });
  mockCreateCrew.mockResolvedValue({ data: mockCrew });
  mockUpdateCrew.mockResolvedValue({ data: mockCrew });
  mockDeleteCrew.mockResolvedValue({ data: { deleted: true } });
  mockCreateCrewJoinRequest.mockResolvedValue({ data: mockRequest });
  mockRespondCrewJoinRequest.mockResolvedValue({ data: { ...mockRequest, status: "accepted" } });
  mockRemoveCrewMember.mockResolvedValue({ data: { deleted: true } });
  mockGetCrewContactForAcceptedPair.mockResolvedValue({ data: mockContact });
});

function mockContext(
  locals: Partial<App.Locals>,
  options?: {
    method?: string;
    body?: unknown;
    rawBody?: string;
    params?: Record<string, string | undefined>;
    url?: string;
  },
): APIContext {
  const method = options?.method ?? "GET";
  const url = options?.url ?? "http://localhost/api/fan/crews";
  const body = options?.rawBody ?? (options?.body !== undefined ? JSON.stringify(options.body) : undefined);

  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    params: options?.params ?? {},
    url: new URL(url),
    request: new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    }),
    cookies: {
      get: () => undefined,
      set: () => undefined,
      delete: () => undefined,
      has: () => false,
      merge: () => undefined,
      headers: () => new Headers(),
    },
  } as unknown as APIContext;
}

describe("GET /api/fan/crews/joinable", () => {
  it("returns 401 when not logged in", async () => {
    const response = await getJoinableCrews(mockContext({}));

    expect(response.status).toBe(401);
  });

  it("returns joinable crews for logged-in user", async () => {
    const response = await getJoinableCrews(mockContext({ user: mockUser }));

    expect(response.status).toBe(200);
    expect(mockListJoinableCrews).toHaveBeenCalledWith(expect.anything(), mockUser.id);
    await expect(response.json()).resolves.toEqual({
      crews: [{ crew: mockCrew, pendingRequest: null }],
    });
  });
});

describe("GET /api/fan/crews", () => {
  it("returns 401 when not logged in", async () => {
    const response = await getCrews(mockContext({}));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Wymagane logowanie" });
  });

  it("returns crew overview for logged-in user", async () => {
    const response = await getCrews(mockContext({ user: mockUser }));

    expect(response.status).toBe(200);
    expect(mockGetCrewOverview).toHaveBeenCalledWith(expect.anything(), mockUser.id);
    await expect(response.json()).resolves.toEqual(mockOverview);
  });
});

describe("POST /api/fan/crews", () => {
  it("returns 400 for invalid crew payload", async () => {
    const response = await postCrew(
      mockContext({ user: mockUser }, { method: "POST", body: { name: "", city: null, subgenres: [] } }),
    );

    expect(response.status).toBe(400);
  });

  it("creates a crew", async () => {
    const response = await postCrew(
      mockContext(
        { user: mockUser },
        {
          method: "POST",
          body: { name: "Amen Crew", city: "Warszawa", subgenres: ["neurofunk"], description: "Ekipa" },
        },
      ),
    );

    expect(response.status).toBe(201);
    expect(mockCreateCrew).toHaveBeenCalledWith(expect.anything(), mockUser.id, {
      name: "Amen Crew",
      city: "Warszawa",
      subgenres: ["neurofunk"],
      description: "Ekipa",
    });
    await expect(response.json()).resolves.toEqual({ crew: mockCrew });
  });

  it("returns 409 when user already owns a crew", async () => {
    mockCreateCrew.mockResolvedValueOnce({ error: CREW_ALREADY_EXISTS_ERROR });

    const response = await postCrew(
      mockContext(
        { user: mockUser },
        {
          method: "POST",
          body: { name: "Amen Crew", city: null, subgenres: [], description: null },
        },
      ),
    );

    expect(response.status).toBe(409);
  });
});

describe("PATCH /api/fan/crews/[id]", () => {
  it("updates a crew", async () => {
    const response = await patchCrewRoute(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          params: { id: crewId },
          url: `http://localhost/api/fan/crews/${crewId}`,
          body: { name: "New Crew" },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockUpdateCrew).toHaveBeenCalledWith(expect.anything(), mockUser.id, crewId, { name: "New Crew" });
  });
});

describe("DELETE /api/fan/crews/[id]", () => {
  it("deletes owner crew", async () => {
    const response = await deleteCrewRoute(
      mockContext(
        { user: mockUser },
        { method: "DELETE", params: { id: crewId }, url: `http://localhost/api/fan/crews/${crewId}` },
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: true });
  });
});

describe("POST /api/fan/crews/[id]/requests", () => {
  it("creates a join request", async () => {
    const response = await postCrewRequest(
      mockContext(
        { user: mockUser },
        { method: "POST", params: { id: crewId }, url: `http://localhost/api/fan/crews/${crewId}/requests` },
      ),
    );

    expect(response.status).toBe(201);
    expect(mockCreateCrewJoinRequest).toHaveBeenCalledWith(expect.anything(), mockUser.id, crewId);
  });

  it("returns 409 for duplicate pending request", async () => {
    mockCreateCrewJoinRequest.mockResolvedValueOnce({ error: CREW_JOIN_REQUEST_ALREADY_PENDING_ERROR });

    const response = await postCrewRequest(
      mockContext(
        { user: mockUser },
        { method: "POST", params: { id: crewId }, url: `http://localhost/api/fan/crews/${crewId}/requests` },
      ),
    );

    expect(response.status).toBe(409);
  });
});

describe("PATCH /api/fan/crews/requests/[id]", () => {
  it("accepts a join request", async () => {
    const response = await patchCrewRequest(
      mockContext(
        { user: mockUser },
        {
          method: "PATCH",
          params: { id: requestId },
          url: `http://localhost/api/fan/crews/requests/${requestId}`,
          body: { status: "accepted" },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockRespondCrewJoinRequest).toHaveBeenCalledWith(expect.anything(), mockUser.id, requestId, "accepted");
  });
});

describe("GET /api/fan/crews/[id]/members/[userId]", () => {
  it("returns accepted crew contact without email", async () => {
    const response = await getCrewMemberContact(
      mockContext(
        { user: mockUser },
        {
          params: { id: crewId, userId: memberId },
          url: `http://localhost/api/fan/crews/${crewId}/members/${memberId}`,
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockGetCrewContactForAcceptedPair).toHaveBeenCalledWith(expect.anything(), mockUser.id, crewId, memberId);
    await expect(response.json()).resolves.toEqual({ contact: mockContact });
  });
});

describe("DELETE /api/fan/crews/[id]/members/[userId]", () => {
  it("removes a crew member", async () => {
    const response = await deleteCrewMemberRoute(
      mockContext(
        { user: mockUser },
        {
          method: "DELETE",
          params: { id: crewId, userId: memberId },
          url: `http://localhost/api/fan/crews/${crewId}/members/${memberId}`,
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockRemoveCrewMember).toHaveBeenCalledWith(expect.anything(), mockUser.id, crewId, memberId);
  });
});

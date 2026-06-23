import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import { clearAttendance, getAttendanceSummary, setAttendanceStatus } from "@/lib/services/event-attendance";
import { getPublishedEventById } from "@/lib/services/events";
import { DELETE, GET, PUT } from "@/pages/api/events/[id]/attendance";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;
const eventId = "22222222-2222-2222-2222-222222222222";

const mockEvent = {
  id: eventId,
  name: "Test Event",
  startsAt: "2099-07-01T20:00:00.000Z",
  city: "Warszawa",
  venueName: "Club",
  addressStreet: "Testowa",
  addressNumber: "1",
  latitude: 52.23,
  longitude: 21.01,
  subgenres: ["neurofunk" as const],
  lineup: null,
  description: null,
  ticketUrl: null,
  isFree: true,
  priceMode: null,
  priceMin: null,
  priceMax: null,
  currency: null,
  status: "published" as const,
  coverPath: null,
  coverAspect: null,
  descriptionRightsAcceptedAt: null,
  coverSource: null,
  coverDeclarationKind: null,
  coverCopyrightDeclaredAt: null,
  createdBy: null,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
};

const mockPastEvent = {
  ...mockEvent,
  startsAt: "2020-01-01T20:00:00.000Z",
};

const mockSummary = {
  goingCount: 2,
  interestedCount: 1,
  userStatus: "going" as const,
};

const mockAttendanceRow = {
  id: "33333333-3333-3333-3333-333333333333",
  userId: mockUser.id,
  eventId,
  status: "going" as const,
  createdAt: "2026-06-23T10:00:00.000Z",
  updatedAt: "2026-06-23T10:00:00.000Z",
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/events", () => ({
  getPublishedEventById: vi.fn(() => Promise.resolve(mockEvent)),
}));

vi.mock("@/lib/services/event-attendance", () => ({
  getAttendanceSummary: vi.fn(() => Promise.resolve({ data: mockSummary })),
  setAttendanceStatus: vi.fn(() => Promise.resolve({ data: mockAttendanceRow })),
  clearAttendance: vi.fn(() => Promise.resolve({ data: { cleared: true } })),
}));

const mockGetPublishedEventById = vi.mocked(getPublishedEventById);
const mockGetAttendanceSummary = vi.mocked(getAttendanceSummary);
const mockSetAttendanceStatus = vi.mocked(setAttendanceStatus);
const mockClearAttendance = vi.mocked(clearAttendance);

function mockContext(
  locals: Partial<App.Locals>,
  options?: {
    method?: string;
    body?: unknown;
    params?: Record<string, string | undefined>;
    url?: string;
  },
): APIContext {
  const method = options?.method ?? "GET";
  const url = options?.url ?? `http://localhost/api/events/${eventId}/attendance`;

  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    params: options?.params ?? { id: eventId },
    request: new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
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

describe("GET /api/events/[id]/attendance", () => {
  it("returns attendance summary for published event", async () => {
    const response = await GET(mockContext({}));

    expect(response.status).toBe(200);
    const json: unknown = await response.json();
    expect(json).toEqual(mockSummary);
    expect(mockGetPublishedEventById).toHaveBeenCalled();
    expect(mockGetAttendanceSummary).toHaveBeenCalled();
  });

  it("returns 404 when event is missing", async () => {
    mockGetPublishedEventById.mockResolvedValueOnce(null);

    const response = await GET(mockContext({}));

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/events/[id]/attendance", () => {
  it("returns 401 when not logged in", async () => {
    const response = await PUT(mockContext({}, { method: "PUT", body: { status: "going" } }));

    expect(response.status).toBe(401);
  });

  it("returns 404 when event is not published", async () => {
    mockGetPublishedEventById.mockResolvedValueOnce(null);

    const response = await PUT(mockContext({ user: mockUser }, { method: "PUT", body: { status: "going" } }));

    expect(response.status).toBe(404);
  });

  it("returns 404 when event is in the past", async () => {
    mockGetPublishedEventById.mockResolvedValueOnce(mockPastEvent);

    const response = await PUT(mockContext({ user: mockUser }, { method: "PUT", body: { status: "going" } }));

    expect(response.status).toBe(404);
    const json: unknown = await response.json();
    expect(json).toEqual({ error: "Nie można oznaczyć udziału w zakończonym wydarzeniu" });
  });

  it("sets attendance for logged-in fan", async () => {
    const response = await PUT(mockContext({ user: mockUser }, { method: "PUT", body: { status: "going" } }));

    expect(response.status).toBe(200);
    expect(mockSetAttendanceStatus).toHaveBeenCalledWith(expect.anything(), mockUser.id, eventId, "going");
    const json: unknown = await response.json();
    expect(json).toEqual(mockSummary);
  });
});

describe("DELETE /api/events/[id]/attendance", () => {
  it("returns 401 when not logged in", async () => {
    const response = await DELETE(mockContext({}, { method: "DELETE" }));

    expect(response.status).toBe(401);
  });

  it("clears attendance for logged-in fan", async () => {
    const response = await DELETE(mockContext({ user: mockUser }, { method: "DELETE" }));

    expect(response.status).toBe(200);
    expect(mockClearAttendance).toHaveBeenCalledWith(expect.anything(), mockUser.id, eventId);
    const json: unknown = await response.json();
    expect(json).toEqual(mockSummary);
  });
});

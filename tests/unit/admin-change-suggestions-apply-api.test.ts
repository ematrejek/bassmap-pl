import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import { applyChangeSuggestionToEvent, updateChangeSuggestionStatus } from "@/lib/services/change-suggestions";
import { POST as POSTApply } from "@/pages/api/admin/change-suggestions/[id]/apply";
import { POST as POSTStatus } from "@/pages/api/admin/change-suggestions/[id]/status";

const suggestionId = "33333333-3333-3333-3333-333333333333";
const eventId = "22222222-2222-2222-2222-222222222222";
const adminUser = { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", email: "admin@example.com" } as User;

const mockEvent = {
  id: eventId,
  name: "Test Event",
  startsAt: "2026-07-01T20:00:00.000Z",
  city: "Warszawa",
  venueName: "Club",
  addressStreet: "Testowa",
  addressNumber: "1",
  latitude: 52.23,
  longitude: 21.01,
  subgenres: ["neurofunk" as const],
  lineup: null,
  description: "Updated description",
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
  updatedAt: "2026-06-18T10:00:00.000Z",
};

const mockAcceptedSuggestion = {
  id: suggestionId,
  eventId,
  submittedBy: "11111111-1111-1111-1111-111111111111",
  body: null,
  payload: { description: "Updated description" },
  status: "accepted" as const,
  source: "event_page" as const,
  createdAt: "2026-06-17T10:00:00.000Z",
  updatedAt: "2026-06-18T10:00:00.000Z",
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/change-suggestions", () => ({
  applyChangeSuggestionToEvent: vi.fn(() =>
    Promise.resolve({
      data: {
        event: mockEvent,
        suggestion: mockAcceptedSuggestion,
      },
    }),
  ),
  updateChangeSuggestionStatus: vi.fn(() => Promise.resolve({ data: mockAcceptedSuggestion })),
}));

const mockApply = vi.mocked(applyChangeSuggestionToEvent);
const mockUpdateStatus = vi.mocked(updateChangeSuggestionStatus);

function mockApplyContext(locals: Partial<App.Locals>, id = suggestionId): APIContext {
  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    params: { id },
    request: new Request(`http://localhost/api/admin/change-suggestions/${id}/apply`, {
      method: "POST",
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

function mockStatusContext(
  locals: Partial<App.Locals>,
  id = suggestionId,
  status: "accepted" | "rejected" = "accepted",
): APIContext {
  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    params: { id },
    request: new Request(`http://localhost/api/admin/change-suggestions/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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

describe("POST /api/admin/change-suggestions/[id]/apply", () => {
  it("returns 403 when not admin", async () => {
    const response = await POSTApply(mockApplyContext({ user: adminUser, isAdmin: false }));
    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid suggestion id", async () => {
    const response = await POSTApply(mockApplyContext({ user: adminUser, isAdmin: true }, "not-a-uuid"));
    expect(response.status).toBe(400);
  });

  it("returns 200 with event and suggestion on success", async () => {
    mockApply.mockClear();

    const response = await POSTApply(mockApplyContext({ user: adminUser, isAdmin: true }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      event: mockEvent,
      suggestion: mockAcceptedSuggestion,
    });
    expect(mockApply).toHaveBeenCalledWith(expect.anything(), suggestionId);
  });

  it("returns 400 when apply service rejects wrong source", async () => {
    mockApply.mockResolvedValueOnce({
      error: "Tę sugestię można tylko zaakceptować bez zmiany wydarzenia",
    });

    const response = await POSTApply(mockApplyContext({ user: adminUser, isAdmin: true }));

    expect(response.status).toBe(400);
  });
});

describe("POST /api/admin/change-suggestions/[id]/status", () => {
  it("returns 400 when accepting event_page suggestion without apply", async () => {
    mockUpdateStatus.mockResolvedValueOnce({
      error: "Użyj Otwórz sugestię → Przyjmij, aby zastosować zmiany w wydarzeniu",
    });

    const response = await POSTStatus(mockStatusContext({ user: adminUser, isAdmin: true }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Użyj Otwórz sugestię → Przyjmij, aby zastosować zmiany w wydarzeniu",
    });
  });
});

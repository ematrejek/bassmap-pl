import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import {
  approveOrganizerApplication,
  createOrganizerApplication,
  issueVerificationCode,
  rejectOrganizerApplication,
  verifyOrganizerCode,
} from "@/lib/services/organizer-applications";
import { POST as APPROVE } from "@/pages/api/admin/organizer-applications/[id]/approve";
import { POST as ISSUE_CODE } from "@/pages/api/admin/organizer-applications/[id]/issue-code";
import { POST as REJECT } from "@/pages/api/admin/organizer-applications/[id]/reject";
import { POST as CREATE } from "@/pages/api/fan/organizer-application/index";
import { POST as VERIFY } from "@/pages/api/fan/organizer-application/verify-code";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;
const applicationId = "22222222-2222-2222-2222-222222222222";

const mockApplication = {
  id: applicationId,
  userId: mockUser.id,
  businessName: "BassMap Crew",
  socialPlatform: "instagram" as const,
  socialProfileUrl: "https://instagram.com/bassmap.pl",
  description: null,
  status: "pending" as const,
  codeIssuedAt: null,
  codeVerifiedAt: null,
  codeAttemptCount: 0,
  reviewedBy: null,
  reviewedAt: null,
  decisionReason: null,
  createdAt: "2026-06-29T10:00:00.000Z",
  updatedAt: "2026-06-29T10:00:00.000Z",
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/organizer-applications", () => ({
  createOrganizerApplication: vi.fn(() => Promise.resolve({ data: mockApplication })),
  getOwnOrganizerApplication: vi.fn(() => Promise.resolve({ data: mockApplication })),
  verifyOrganizerCode: vi.fn(() => Promise.resolve({ data: { ...mockApplication, status: "code_verified" } })),
  issueVerificationCode: vi.fn(() => Promise.resolve({ data: { code: "A3K7M2NP" } })),
  approveOrganizerApplication: vi.fn(() => Promise.resolve({ data: { ...mockApplication, status: "approved" } })),
  rejectOrganizerApplication: vi.fn(() => Promise.resolve({ data: { ...mockApplication, status: "rejected" } })),
}));

const mockCreate = vi.mocked(createOrganizerApplication);
const mockVerify = vi.mocked(verifyOrganizerCode);
const mockIssue = vi.mocked(issueVerificationCode);
const mockApprove = vi.mocked(approveOrganizerApplication);
const mockReject = vi.mocked(rejectOrganizerApplication);

function mockContext(
  locals: Partial<App.Locals>,
  url: string,
  body?: unknown,
  params: Record<string, string> = {},
): APIContext {
  return {
    locals: {
      user: null,
      isAdmin: false,
      isOrganizer: false,
      ...locals,
    } as App.Locals,
    params,
    request: new Request(`http://localhost${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

describe("POST /api/fan/organizer-application", () => {
  it("returns 401 when not logged in", async () => {
    const response = await CREATE(mockContext({}, "/api/fan/organizer-application"));
    expect(response.status).toBe(401);
  });

  it("returns 403 when admin submits", async () => {
    const response = await CREATE(
      mockContext({ user: mockUser, isAdmin: true }, "/api/fan/organizer-application", {
        businessName: "BassMap Crew",
        socialPlatform: "instagram",
        socialProfileUrl: "instagram.com/bassmap.pl",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("returns 409 when already organizer", async () => {
    const response = await CREATE(
      mockContext({ user: mockUser, isOrganizer: true }, "/api/fan/organizer-application", {
        businessName: "BassMap Crew",
        socialPlatform: "instagram",
        socialProfileUrl: "instagram.com/bassmap.pl",
      }),
    );
    expect(response.status).toBe(409);
  });

  it("returns 400 on invalid url", async () => {
    const response = await CREATE(
      mockContext({ user: mockUser }, "/api/fan/organizer-application", {
        businessName: "BassMap Crew",
        socialPlatform: "instagram",
        socialProfileUrl: "facebook.com/bassmap",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 201 for valid application", async () => {
    mockCreate.mockClear();
    const response = await CREATE(
      mockContext({ user: mockUser }, "/api/fan/organizer-application", {
        businessName: "BassMap Crew",
        socialPlatform: "instagram",
        socialProfileUrl: "instagram.com/bassmap.pl",
      }),
    );
    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), mockUser.id, {
      businessName: "BassMap Crew",
      socialPlatform: "instagram",
      socialProfileUrl: "https://instagram.com/bassmap.pl",
      description: null,
    });
  });
});

describe("POST /api/fan/organizer-application/verify-code", () => {
  it("returns 401 when not logged in", async () => {
    const response = await VERIFY(mockContext({}, "/api/fan/organizer-application/verify-code"));
    expect(response.status).toBe(401);
  });

  it("returns 400 on invalid application id", async () => {
    const response = await VERIFY(
      mockContext({ user: mockUser }, "/api/fan/organizer-application/verify-code", {
        applicationId: "not-a-uuid",
        code: "A3K7M2",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 200 for a valid code", async () => {
    mockVerify.mockClear();
    const response = await VERIFY(
      mockContext({ user: mockUser }, "/api/fan/organizer-application/verify-code", {
        applicationId,
        code: "a3k7m2",
      }),
    );
    expect(response.status).toBe(200);
    expect(mockVerify).toHaveBeenCalledWith(expect.anything(), applicationId, "A3K7M2");
  });
});

describe("POST /api/admin/organizer-applications/[id]/issue-code", () => {
  it("returns 403 when not admin", async () => {
    const response = await ISSUE_CODE(
      mockContext({ user: mockUser }, `/api/admin/organizer-applications/${applicationId}/issue-code`, undefined, {
        id: applicationId,
      }),
    );
    expect(response.status).toBe(403);
  });

  it("returns 200 and the code for admin", async () => {
    mockIssue.mockClear();
    const response = await ISSUE_CODE(
      mockContext(
        { user: mockUser, isAdmin: true },
        `/api/admin/organizer-applications/${applicationId}/issue-code`,
        undefined,
        { id: applicationId },
      ),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ code: "A3K7M2NP" });
    expect(mockIssue).toHaveBeenCalledWith(expect.anything(), applicationId);
  });
});

describe("POST /api/admin/organizer-applications/[id]/approve", () => {
  it("returns 403 when not admin", async () => {
    const response = await APPROVE(
      mockContext({ user: mockUser }, `/api/admin/organizer-applications/${applicationId}/approve`, undefined, {
        id: applicationId,
      }),
    );
    expect(response.status).toBe(403);
  });

  it("returns 200 for admin approve", async () => {
    mockApprove.mockClear();
    const response = await APPROVE(
      mockContext(
        { user: mockUser, isAdmin: true },
        `/api/admin/organizer-applications/${applicationId}/approve`,
        undefined,
        { id: applicationId },
      ),
    );
    expect(response.status).toBe(200);
    expect(mockApprove).toHaveBeenCalledWith(expect.anything(), applicationId);
  });
});

describe("POST /api/admin/organizer-applications/[id]/reject", () => {
  it("returns 403 when not admin", async () => {
    const response = await REJECT(
      mockContext({ user: mockUser }, `/api/admin/organizer-applications/${applicationId}/reject`, undefined, {
        id: applicationId,
      }),
    );
    expect(response.status).toBe(403);
  });

  it("returns 200 for admin reject with reason", async () => {
    mockReject.mockClear();
    const response = await REJECT(
      mockContext(
        { user: mockUser, isAdmin: true },
        `/api/admin/organizer-applications/${applicationId}/reject`,
        { reason: "Profil nieoficjalny" },
        { id: applicationId },
      ),
    );
    expect(response.status).toBe(200);
    expect(mockReject).toHaveBeenCalledWith(expect.anything(), applicationId, "Profil nieoficjalny");
  });

  it("returns 200 for admin reject without reason", async () => {
    mockReject.mockClear();
    const response = await REJECT(
      mockContext(
        { user: mockUser, isAdmin: true },
        `/api/admin/organizer-applications/${applicationId}/reject`,
        undefined,
        { id: applicationId },
      ),
    );
    expect(response.status).toBe(200);
    expect(mockReject).toHaveBeenCalledWith(expect.anything(), applicationId, null);
  });
});

import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildUnitTestEvent } from "../helpers/event-fixtures";
import { applyEventCoverUpload, getEventById } from "@/lib/services/events";
import { POST } from "@/pages/api/admin/events/[id]/cover";

const EVENT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "admin@example.com" } as User;

const mockUpload = vi.fn(() => Promise.resolve({ error: null }));
const mockRemove = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/supabase-service", () => ({
  createServiceRoleClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        remove: mockRemove,
      })),
    },
  })),
}));

vi.mock("@/lib/services/events", () => ({
  applyEventCoverUpload: vi.fn(),
  getEventById: vi.fn(),
}));

const mockApplyEventCoverUpload = vi.mocked(applyEventCoverUpload);
const mockGetEventById = vi.mocked(getEventById);

function mockJpegFile(): File {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  return new File([bytes], "cover.jpg", { type: "image/jpeg" });
}

function buildCoverFormData(): FormData {
  const formData = new FormData();
  formData.set("file", mockJpegFile());
  formData.set("coverAspect", "landscape");
  formData.set("coverSource", "facebook");
  formData.set("coverDeclarationAccepted", "true");
  return formData;
}

function mockContext(formData: FormData, locals: Partial<App.Locals> = {}): APIContext {
  return {
    locals: {
      user: mockUser,
      isAdmin: true,
      ...locals,
    } as App.Locals,
    params: { id: EVENT_ID },
    request: new Request(`http://localhost/api/admin/events/${EVENT_ID}/cover`, {
      method: "POST",
      body: formData,
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

describe("POST /api/admin/events/[id]/cover", () => {
  beforeEach(() => {
    mockUpload.mockClear();
    mockRemove.mockClear();
    mockApplyEventCoverUpload.mockReset();
    mockGetEventById.mockReset();
    mockGetEventById.mockResolvedValue(
      buildUnitTestEvent({
        id: EVENT_ID,
        coverPath: null,
      }),
    );
    mockApplyEventCoverUpload.mockResolvedValue({
      data: buildUnitTestEvent({
        id: EVENT_ID,
        coverPath: `${EVENT_ID}/cover.jpg`,
        coverAspect: "landscape",
        coverSource: "facebook",
        coverDeclarationKind: "creator_consent",
        coverCopyrightDeclaredAt: "2026-06-29T19:40:00.000Z",
      }),
    });
  });

  it("uploads a new admin cover through the cover upload service", async () => {
    const response = await POST(mockContext(buildCoverFormData()));

    expect(response.status).toBe(200);
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mockApplyEventCoverUpload).toHaveBeenCalledWith(
      {},
      EVENT_ID,
      expect.objectContaining({
        coverPath: `${EVENT_ID}/cover.jpg`,
        coverAspect: "landscape",
        coverSource: "facebook",
        coverDeclarationKind: "creator_consent",
      }),
    );
  });
});

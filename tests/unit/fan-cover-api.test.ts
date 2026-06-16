import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildUnitTestEvent } from "../helpers/event-fixtures";
import { getEventById } from "@/lib/services/events";
import { POST } from "@/pages/api/fan/events/[id]/cover";

const EVENT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;

const mockUpload = vi.fn(() => Promise.resolve({ error: null }));
const mockRemove = vi.fn(() => Promise.resolve({ error: null }));
const mockMaybeSingle = vi.fn(() => Promise.resolve({ data: { id: EVENT_ID }, error: null }));

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
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: mockMaybeSingle,
              })),
            })),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/services/events", () => ({
  getEventById: vi.fn(),
}));

const mockGetEventById = vi.mocked(getEventById);

function mockJpegFile(): File {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  return new File([bytes], "cover.jpg", { type: "image/jpeg" });
}

function buildCoverFormData(options: { includeAudit?: boolean; source?: string } = {}): FormData {
  const formData = new FormData();
  formData.set("file", mockJpegFile());
  formData.set("coverAspect", "portrait");

  if (options.includeAudit !== false) {
    formData.set("coverSource", options.source ?? "facebook");
    formData.set("coverDeclarationAccepted", "true");
  }

  return formData;
}

function mockContext(formData: FormData, locals: Partial<App.Locals> = {}): APIContext {
  return {
    locals: {
      user: mockUser,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    params: { id: EVENT_ID },
    request: new Request(`http://localhost/api/fan/events/${EVENT_ID}/cover`, {
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

describe("POST /api/fan/events/[id]/cover", () => {
  beforeEach(() => {
    mockUpload.mockClear();
    mockRemove.mockClear();
    mockMaybeSingle.mockClear();
    mockGetEventById.mockReset();
    mockGetEventById.mockResolvedValue(
      buildUnitTestEvent({
        id: EVENT_ID,
        createdBy: mockUser.id,
        status: "pending",
      }),
    );
  });

  it("returns 400 when cover audit fields are missing", async () => {
    const formData = buildCoverFormData({ includeAudit: false });
    const response = await POST(mockContext(formData));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Wybierz źródło grafiki okładki",
    });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("returns 200 when cover upload includes audit fields", async () => {
    const formData = buildCoverFormData({ source: "own" });
    const response = await POST(mockContext(formData));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mockMaybeSingle).toHaveBeenCalledOnce();
  });
});

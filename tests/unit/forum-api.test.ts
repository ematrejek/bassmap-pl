import type { User } from "@supabase/supabase-js";
import type { APIContext } from "astro";
import { describe, expect, it, vi } from "vitest";
import { createForumComment, deleteForumComment, listForumComments } from "@/lib/services/forum-comments";
import {
  createForumThread,
  deleteForumThread,
  getForumThreadById,
  listForumThreads,
} from "@/lib/services/forum-threads";
import { DELETE as DELETEAdminComment } from "@/pages/api/admin/forum-comments/[id]";
import { DELETE as DELETEAdminThread } from "@/pages/api/admin/forum-threads/[id]";
import { DELETE as DELETEFanComment } from "@/pages/api/fan/forum-comments/[id]";
import { GET as GETComments, POST as POSTComment } from "@/pages/api/forum/threads/[id]/comments";
import { GET as GETThreads, POST as POSTThread } from "@/pages/api/forum/threads/index";

const mockUser = { id: "11111111-1111-1111-1111-111111111111", email: "fan@example.com" } as User;
const threadId = "22222222-2222-2222-2222-222222222222";
const commentId = "33333333-3333-3333-3333-333333333333";

const mockThread = {
  id: threadId,
  category: "szukam_ekipy" as const,
  title: "Szukam crew",
  body: "Gram jungle.",
  city: null,
  tags: [] as string[],
  authorId: mockUser.id,
  authorLabel: "fan",
  crewId: null,
  createdAt: "2026-06-24T10:00:00.000Z",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

const crewId = "44444444-4444-4444-4444-444444444444";

const mockComment = {
  id: commentId,
  threadId,
  authorId: mockUser.id,
  authorLabel: "fan",
  body: "Wchodzę w to!",
  createdAt: "2026-06-24T11:00:00.000Z",
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/forum-threads", () => ({
  listForumThreads: vi.fn(() => Promise.resolve({ data: [mockThread] })),
  getForumThreadById: vi.fn(() => Promise.resolve({ data: mockThread })),
  createForumThread: vi.fn(() => Promise.resolve({ data: mockThread })),
  deleteForumThread: vi.fn(() => Promise.resolve({ data: { id: threadId } })),
}));

vi.mock("@/lib/services/forum-comments", () => ({
  listForumComments: vi.fn(() => Promise.resolve({ data: [mockComment] })),
  createForumComment: vi.fn(() => Promise.resolve({ data: mockComment })),
  deleteForumComment: vi.fn(() => Promise.resolve({ data: { id: commentId } })),
}));

const mockListForumThreads = vi.mocked(listForumThreads);
const mockGetForumThreadById = vi.mocked(getForumThreadById);
const mockCreateForumThread = vi.mocked(createForumThread);
const mockDeleteForumThread = vi.mocked(deleteForumThread);
const mockListForumComments = vi.mocked(listForumComments);
const mockCreateForumComment = vi.mocked(createForumComment);
const mockDeleteForumComment = vi.mocked(deleteForumComment);

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
  const url = options?.url ?? `http://localhost/api/forum/threads`;

  return {
    locals: {
      user: null,
      isAdmin: false,
      ...locals,
    } as App.Locals,
    params: options?.params ?? {},
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

describe("GET /api/forum/threads", () => {
  it("returns threads with pagination metadata", async () => {
    const response = await GETThreads(mockContext({}));

    expect(response.status).toBe(200);
    const json: unknown = await response.json();
    expect(json).toEqual({ threads: [mockThread], page: 1, hasNextPage: false });
    expect(mockListForumThreads).toHaveBeenCalled();
  });

  it("rejects an invalid category", async () => {
    const response = await GETThreads(mockContext({}, { url: "http://localhost/api/forum/threads?category=bogus" }));

    expect(response.status).toBe(400);
  });
});

describe("POST /api/forum/threads", () => {
  it("returns 401 when not logged in", async () => {
    const response = await POSTThread(
      mockContext({}, { method: "POST", body: { category: "szukam_ekipy", title: "T", body: "B" } }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid thread input", async () => {
    const response = await POSTThread(
      mockContext({ user: mockUser }, { method: "POST", body: { category: "szukam_ekipy", title: "", body: "B" } }),
    );

    expect(response.status).toBe(400);
  });

  it("creates a thread for a logged-in fan", async () => {
    const response = await POSTThread(
      mockContext(
        { user: mockUser },
        { method: "POST", body: { category: "szukam_ekipy", title: "Szukam crew", body: "Gram jungle." } },
      ),
    );

    expect(response.status).toBe(201);
    expect(mockCreateForumThread).toHaveBeenCalled();
  });

  it("creates a crew-linked thread when crewId belongs to the author", async () => {
    const response = await POSTThread(
      mockContext(
        { user: mockUser },
        {
          method: "POST",
          body: {
            category: "szukam_ekipy",
            title: "Szukam ludzi",
            body: "Szukam ludzi do ekipy.",
            crewId,
          },
        },
      ),
    );

    expect(response.status).toBe(201);
    expect(mockCreateForumThread).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        authorId: mockUser.id,
        crewId,
      }),
    );
  });

  it("rejects crewId on a non-crew forum category", async () => {
    mockCreateForumThread.mockClear();

    const response = await POSTThread(
      mockContext(
        { user: mockUser },
        {
          method: "POST",
          body: {
            category: "pozostale",
            title: "Ogłoszenie",
            body: "Treść.",
            crewId,
          },
        },
      ),
    );

    expect(response.status).toBe(400);
    expect(mockCreateForumThread).not.toHaveBeenCalled();
  });

  it("returns 400 when createForumThread rejects foreign crew ownership", async () => {
    mockCreateForumThread.mockResolvedValueOnce({ error: "Możesz powiązać wątek tylko ze swoją ekipą" });

    const response = await POSTThread(
      mockContext(
        { user: mockUser },
        {
          method: "POST",
          body: {
            category: "szukam_ekipy",
            title: "Szukam ludzi",
            body: "Treść.",
            crewId,
          },
        },
      ),
    );

    expect(response.status).toBe(400);
  });
});

describe("GET /api/forum/threads/[id]/comments", () => {
  it("returns 400 for invalid thread id", async () => {
    const response = await GETComments(mockContext({}, { params: { id: "not-a-uuid" } }));

    expect(response.status).toBe(400);
  });

  it("returns comments for a thread", async () => {
    const response = await GETComments(mockContext({}, { params: { id: threadId } }));

    expect(response.status).toBe(200);
    const json: unknown = await response.json();
    expect(json).toEqual({ comments: [mockComment] });
    expect(mockListForumComments).toHaveBeenCalled();
  });
});

describe("POST /api/forum/threads/[id]/comments", () => {
  it("returns 401 when not logged in", async () => {
    const response = await POSTComment(
      mockContext({}, { method: "POST", params: { id: threadId }, body: { body: "Hej" } }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the thread is missing", async () => {
    mockGetForumThreadById.mockResolvedValueOnce({ error: "Nie znaleziono wątku" });

    const response = await POSTComment(
      mockContext({ user: mockUser }, { method: "POST", params: { id: threadId }, body: { body: "Hej" } }),
    );

    expect(response.status).toBe(404);
  });

  it("creates a comment for a logged-in fan", async () => {
    const response = await POSTComment(
      mockContext({ user: mockUser }, { method: "POST", params: { id: threadId }, body: { body: "Wchodzę w to!" } }),
    );

    expect(response.status).toBe(201);
    expect(mockCreateForumComment).toHaveBeenCalled();
  });
});

describe("DELETE /api/fan/forum-comments/[id]", () => {
  it("returns 401 when not logged in", async () => {
    const response = await DELETEFanComment(
      mockContext(
        { user: null },
        { method: "DELETE", params: { id: commentId }, url: `http://localhost/api/fan/forum-comments/${commentId}` },
      ),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for admin", async () => {
    const response = await DELETEFanComment(
      mockContext(
        { user: mockUser, isAdmin: true },
        { method: "DELETE", params: { id: commentId }, url: `http://localhost/api/fan/forum-comments/${commentId}` },
      ),
    );

    expect(response.status).toBe(403);
  });

  it("deletes own comment for a logged-in fan", async () => {
    const response = await DELETEFanComment(
      mockContext(
        { user: mockUser, isAdmin: false },
        { method: "DELETE", params: { id: commentId }, url: `http://localhost/api/fan/forum-comments/${commentId}` },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockDeleteForumComment).toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/forum-comments/[id]", () => {
  it("returns 403 for non-admin", async () => {
    const response = await DELETEAdminComment(
      mockContext(
        { user: mockUser, isAdmin: false },
        { method: "DELETE", params: { id: commentId }, url: `http://localhost/api/admin/forum-comments/${commentId}` },
      ),
    );

    expect(response.status).toBe(403);
  });

  it("deletes any comment for admin", async () => {
    const response = await DELETEAdminComment(
      mockContext(
        { user: mockUser, isAdmin: true },
        { method: "DELETE", params: { id: commentId }, url: `http://localhost/api/admin/forum-comments/${commentId}` },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockDeleteForumComment).toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/forum-threads/[id]", () => {
  it("returns 403 for non-admin", async () => {
    const response = await DELETEAdminThread(
      mockContext(
        { user: mockUser, isAdmin: false },
        { method: "DELETE", params: { id: threadId }, url: `http://localhost/api/admin/forum-threads/${threadId}` },
      ),
    );

    expect(response.status).toBe(403);
  });

  it("deletes any thread for admin", async () => {
    const response = await DELETEAdminThread(
      mockContext(
        { user: mockUser, isAdmin: true },
        { method: "DELETE", params: { id: threadId }, url: `http://localhost/api/admin/forum-threads/${threadId}` },
      ),
    );

    expect(response.status).toBe(200);
    expect(mockDeleteForumThread).toHaveBeenCalled();
  });
});

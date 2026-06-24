import ForumView from "@/components/forum/ForumView";
import { FORUM_SECTIONS } from "@/lib/forum/thread-schema";
import type { ForumThread } from "@/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  cleanup();
});

function buildThread(overrides: Partial<ForumThread> = {}): ForumThread {
  return {
    id: "thread-1",
    category: "szukam_ekipy",
    title: "Szukam ekipy na Audioriver",
    body: "Jadę solo, szukam towarzystwa na festiwal.",
    city: "Płock",
    tags: ["dnb"],
    authorId: "user-1",
    authorLabel: "basshead",
    createdAt: "2026-06-20T10:00:00.000Z",
    updatedAt: "2026-06-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("ForumView", () => {
  it("renders the Share the bass hero heading", () => {
    render(<ForumView initialThreads={[]} replyCounts={{}} isLoggedIn={false} isAdmin={false} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Share the");
    expect(heading).toHaveTextContent("bass");
  });

  it("renders all six section headings", () => {
    render(<ForumView initialThreads={[]} replyCounts={{}} isLoggedIn={false} isAdmin={false} />);

    for (const section of FORUM_SECTIONS) {
      expect(screen.getByRole("heading", { level: 2, name: section.label })).toBeInTheDocument();
    }
  });

  it("shows a thread card with author and reply count", () => {
    const thread = buildThread();

    render(<ForumView initialThreads={[thread]} replyCounts={{ "thread-1": 4 }} isLoggedIn isAdmin={false} />);

    expect(screen.getByRole("heading", { level: 3, name: /Szukam ekipy na Audioriver/i })).toBeInTheDocument();
    expect(screen.getByText("@basshead")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("filters threads locally by title via the search box", () => {
    const threads = [
      buildThread({ id: "t1", title: "Neuro w Krakowie" }),
      buildThread({ id: "t2", title: "Jungle we Wrocławiu" }),
    ];

    render(<ForumView initialThreads={threads} replyCounts={{}} isLoggedIn={false} isAdmin={false} />);

    expect(screen.getByRole("heading", { level: 3, name: /Neuro w Krakowie/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /Jungle we Wrocławiu/i })).toBeInTheDocument();

    const search = screen.getByLabelText("Szukaj wątku po tytule");
    fireEvent.change(search, { target: { value: "jungle" } });

    expect(screen.queryByRole("heading", { level: 3, name: /Neuro w Krakowie/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /Jungle we Wrocławiu/i })).toBeInTheDocument();
  });

  it("hides create buttons for guests and shows a sign-in prompt", () => {
    render(<ForumView initialThreads={[]} replyCounts={{}} isLoggedIn={false} isAdmin={false} />);

    expect(screen.queryByRole("button", { name: /Załóż wątek/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Zaloguj się, aby pisać/i })).toBeInTheDocument();
  });

  it("shows delete-thread control only for admins", () => {
    const thread = buildThread();

    const { rerender } = render(<ForumView initialThreads={[thread]} replyCounts={{}} isLoggedIn isAdmin={false} />);
    expect(screen.queryByRole("button", { name: /Usuń wątek/i })).not.toBeInTheDocument();

    rerender(<ForumView initialThreads={[thread]} replyCounts={{}} isLoggedIn isAdmin />);
    expect(screen.getByRole("button", { name: /Usuń wątek/i })).toBeInTheDocument();
  });
});

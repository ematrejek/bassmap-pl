import ProfileShareButton from "@/components/fan/ProfileShareButton";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const shareUrl = "https://bassmap.pl/u/test_fan";

describe("ProfileShareButton", () => {
  let writeText: ReturnType<typeof vi.fn>;
  let share: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    share = vi.fn();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing when login is empty", () => {
    const { container } = render(<ProfileShareButton login="   " />);
    expect(container).toBeEmptyDOMElement();
  });

  it("copies canonical profile URL and shows confirmation when Web Share is unavailable", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
      writable: true,
    });

    render(<ProfileShareButton login="test_fan" />);
    fireEvent.click(screen.getByRole("button", { name: /Udostępnij profil/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(shareUrl);
    });
    expect(screen.getByText("Skopiowano")).toBeInTheDocument();
    expect(screen.getByText("Skopiowano link do profilu")).toBeInTheDocument();
  });

  it("uses Web Share when available and does not copy to clipboard", async () => {
    share.mockResolvedValue(undefined);

    render(<ProfileShareButton login="test_fan" />);
    fireEvent.click(screen.getByRole("button", { name: /Udostępnij profil/i }));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: "Profil @test_fan – BassMap PL",
        url: shareUrl,
      });
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("does nothing when Web Share is cancelled", async () => {
    share.mockRejectedValue(new DOMException("Share cancelled", "AbortError"));

    render(<ProfileShareButton login="test_fan" />);
    fireEvent.click(screen.getByRole("button", { name: /Udostępnij profil/i }));

    await waitFor(() => {
      expect(share).toHaveBeenCalled();
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText(/Skopiowano/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nie udało się skopiować/i)).not.toBeInTheDocument();
  });

  it("falls back to clipboard when Web Share fails with a non-abort error", async () => {
    share.mockRejectedValue(new Error("Share failed"));

    render(<ProfileShareButton login="test_fan" />);
    fireEvent.click(screen.getByRole("button", { name: /Udostępnij profil/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(shareUrl);
    });
    expect(screen.getByText("Skopiowano")).toBeInTheDocument();
    expect(screen.getByText("Skopiowano link do profilu")).toBeInTheDocument();
  });

  it("shows error message when clipboard write fails", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
      writable: true,
    });
    writeText.mockRejectedValue(new Error("Clipboard denied"));

    render(<ProfileShareButton login="test_fan" />);
    fireEvent.click(screen.getByRole("button", { name: /Udostępnij profil/i }));

    await waitFor(() => {
      expect(screen.getByText(/Nie udało się skopiować linku/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Skopiowano/i)).not.toBeInTheDocument();
  });
});

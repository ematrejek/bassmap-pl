import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTrackTitle } from "@/lib/fan/track-oembed";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchTrackTitle", () => {
  it("returns title from spotify oembed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ title: "Test Track" }),
        }),
      ),
    );

    await expect(fetchTrackTitle("spotify", "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")).resolves.toBe(
      "Test Track",
    );
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
        }),
      ),
    );

    await expect(fetchTrackTitle("soundcloud", "https://soundcloud.com/a/b")).resolves.toBeNull();
  });
});

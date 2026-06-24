import { describe, expect, it } from "vitest";
import {
  favouriteTrackEmbedSrc,
  normalizeFavouriteTrackUrl,
  parseSoundCloudTrackUrl,
  parseSpotifyTrackUrl,
  validateFavouriteTrackUrl,
} from "@/lib/fan/favourite-track";

const SPOTIFY_TRACK = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC";
const SOUNDCLOUD_TRACK = "https://soundcloud.com/artist-name/track-name";

describe("parseSpotifyTrackUrl", () => {
  it("accepts canonical track URL", () => {
    expect(parseSpotifyTrackUrl(SPOTIFY_TRACK)).toBe(SPOTIFY_TRACK);
  });

  it("accepts embed path and normalizes", () => {
    expect(parseSpotifyTrackUrl("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC")).toBe(SPOTIFY_TRACK);
  });

  it("rejects playlist", () => {
    expect(parseSpotifyTrackUrl("https://open.spotify.com/playlist/37i9dQZF1DX")).toBeNull();
  });

  it("rejects album", () => {
    expect(parseSpotifyTrackUrl("https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC")).toBeNull();
  });
});

describe("parseSoundCloudTrackUrl", () => {
  it("accepts artist/track URL", () => {
    expect(parseSoundCloudTrackUrl(SOUNDCLOUD_TRACK)).toBe(SOUNDCLOUD_TRACK);
  });

  it("rejects playlist sets", () => {
    expect(parseSoundCloudTrackUrl("https://soundcloud.com/artist-name/sets/my-set")).toBeNull();
  });

  it("rejects profile-only URL", () => {
    expect(parseSoundCloudTrackUrl("https://soundcloud.com/artist-name")).toBeNull();
  });
});

describe("validateFavouriteTrackUrl", () => {
  it("validates spotify track", () => {
    expect(validateFavouriteTrackUrl("spotify", SPOTIFY_TRACK)).toBe(true);
  });

  it("validates soundcloud track", () => {
    expect(validateFavouriteTrackUrl("soundcloud", SOUNDCLOUD_TRACK)).toBe(true);
  });
});

describe("favouriteTrackEmbedSrc", () => {
  it("builds spotify embed src", () => {
    expect(favouriteTrackEmbedSrc("spotify", SPOTIFY_TRACK)).toBe(
      "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
    );
  });

  it("builds soundcloud widget src", () => {
    const src = favouriteTrackEmbedSrc("soundcloud", SOUNDCLOUD_TRACK);
    expect(src).toContain("w.soundcloud.com/player/");
    expect(src).toContain(encodeURIComponent(SOUNDCLOUD_TRACK));
  });
});

describe("normalizeFavouriteTrackUrl", () => {
  it("strips query params from spotify URL", () => {
    expect(normalizeFavouriteTrackUrl("spotify", `${SPOTIFY_TRACK}?si=abc`)).toBe(SPOTIFY_TRACK);
  });
});

import { describe, expect, it } from "vitest";
import {
  ADMIN_PATH,
  ARCHIVE_PATH,
  buildDiscoverySearchUrl,
  DISCOVERY_PATH,
  fanPublicProfilePath,
  FORUM_PATH,
  MY_EVENTS_NEW_PATH,
  MY_EVENTS_PATH,
  PROFILE_PATH,
  SIGN_IN_PATH,
  TEAM_PATH,
} from "@/lib/routes";
import type { Subgenre } from "@/types";

const emptyFilters = {
  city: null,
  subgenres: [] as Subgenre[],
  dateFrom: null,
  dateTo: null,
  freeOnly: false,
};

describe("buildDiscoverySearchUrl", () => {
  it("returns DISCOVERY_PATH when no filters are set", () => {
    expect(buildDiscoverySearchUrl(emptyFilters)).toBe(DISCOVERY_PATH);
    expect(DISCOVERY_PATH).toBe("/events");
  });

  it("builds query string on DISCOVERY_PATH", () => {
    expect(
      buildDiscoverySearchUrl({
        ...emptyFilters,
        city: "Warszawa",
        subgenres: ["neurofunk"],
        freeOnly: true,
      }),
    ).toBe("/events?city=Warszawa&subgenre=neurofunk&free=1");
  });

  it("includes date range params", () => {
    expect(
      buildDiscoverySearchUrl({
        ...emptyFilters,
        dateFrom: "2026-06-15",
        dateTo: "2026-06-20",
      }),
    ).toBe("/events?from=2026-06-15&to=2026-06-20");
  });
});

describe("fan account zone paths", () => {
  it("exports profile and fan zone routes", () => {
    expect(PROFILE_PATH).toBe("/profile");
    expect(MY_EVENTS_PATH).toBe("/my-events");
    expect(MY_EVENTS_NEW_PATH).toBe("/my-events/new");
    expect(TEAM_PATH).toBe("/team");
    expect(FORUM_PATH).toBe("/forum");
  });
});

describe("header navigation paths", () => {
  it("exports public shell shortcuts", () => {
    expect(ARCHIVE_PATH).toBe("/archive");
    expect(SIGN_IN_PATH).toBe("/auth/signin");
    expect(ADMIN_PATH).toBe("/admin");
  });

  it("my-events new path is under protected my-events prefix", () => {
    expect(MY_EVENTS_NEW_PATH.startsWith(MY_EVENTS_PATH)).toBe(true);
  });
});

describe("fanPublicProfilePath", () => {
  it("builds lowercase public profile URL without @ prefix", () => {
    expect(fanPublicProfilePath("Siemema")).toBe("/u/siemema");
    expect(fanPublicProfilePath("@Siemema")).toBe("/u/siemema");
  });
});

import { fanPublicProfileAbsoluteUrl } from "@/lib/fan/profile-share";
import { describe, expect, it } from "vitest";

describe("fanPublicProfileAbsoluteUrl", () => {
  it("builds canonical absolute URL with lowercase login", () => {
    expect(fanPublicProfileAbsoluteUrl("Siemema")).toBe("https://bassmap.pl/u/siemema");
  });

  it("strips @ prefix and lowercases login", () => {
    expect(fanPublicProfileAbsoluteUrl("@Fan_1")).toBe("https://bassmap.pl/u/fan_1");
  });
});

import { describe, expect, it } from "vitest";
import { activeSubgenresChanged, filterActiveSubgenres, isActiveSubgenre } from "@/lib/subgenres";
import { ACTIVE_SUBGENRES, SUBGENRE_LABELS, SUBGENRES, type Subgenre } from "@/types";

describe("subgenre catalog v2", () => {
  it("exposes 13 active subgenres in UI order", () => {
    expect(SUBGENRES).toHaveLength(13);
    expect(ACTIVE_SUBGENRES).toEqual(SUBGENRES);
  });

  it("uses updated labels for renamed entries", () => {
    expect(SUBGENRE_LABELS.liquid_dnb).toBe("Liquid");
    expect(SUBGENRE_LABELS.hardcore_oldschool).toBe("Hardcore");
    expect(SUBGENRE_LABELS.trancestep).toBe("Trance");
    expect(SUBGENRE_LABELS.garage).toBe("Garage");
    expect(SUBGENRE_LABELS.bass_house).toBe("Bass House");
  });

  it("filterActiveSubgenres keeps active tags in order", () => {
    const input: Subgenre[] = ["neurofunk", "halftime", "jump_up", "liquid_funk"];
    expect(filterActiveSubgenres(input)).toEqual(["neurofunk", "jump_up"]);
  });

  it("isActiveSubgenre rejects legacy slugs", () => {
    expect(isActiveSubgenre("neurofunk")).toBe(true);
    expect(isActiveSubgenre("halftime")).toBe(false);
    expect(isActiveSubgenre("bogus")).toBe(false);
  });

  it("activeSubgenresChanged ignores legacy tags in previous record", () => {
    expect(activeSubgenresChanged(["neurofunk", "halftime"], ["neurofunk"])).toBe(false);
    expect(activeSubgenresChanged(["neurofunk", "halftime"], ["jump_up"])).toBe(true);
  });
});

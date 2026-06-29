import { ACTIVE_SUBGENRES, type Subgenre } from "@/types";

const ACTIVE_SET = new Set<string>(ACTIVE_SUBGENRES);

export function isActiveSubgenre(value: string): value is Subgenre {
  return ACTIVE_SET.has(value);
}

export function filterActiveSubgenres(subgenres: readonly Subgenre[]): Subgenre[] {
  return subgenres.filter((subgenre) => ACTIVE_SET.has(subgenre));
}

/** Compares two subgenre lists ignoring order. */
export function subgenreSetsEqual(a: readonly Subgenre[], b: readonly Subgenre[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setB = new Set(b);
  return a.every((subgenre) => setB.has(subgenre));
}

/** True when the active-only selection changed vs the stored record (legacy ignored). */
export function activeSubgenresChanged(previous: readonly Subgenre[], nextActive: readonly Subgenre[]): boolean {
  return !subgenreSetsEqual(filterActiveSubgenres(previous), nextActive);
}

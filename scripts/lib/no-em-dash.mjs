/** @typedef {{ line: number; column: number }} EmDashLocation */

export const EM_DASH = "\u2014";
export const EN_DASH = "\u2013";

/**
 * @param {string} text
 * @returns {EmDashLocation[]}
 */
export function findEmDashLocations(text) {
  /** @type {EmDashLocation[]} */
  const locations = [];
  let index = text.indexOf(EM_DASH);

  while (index !== -1) {
    const before = text.slice(0, index);
    const line = before.split("\n").length;
    const lastNewline = before.lastIndexOf("\n");
    const column = index - lastNewline;
    locations.push({ line, column });
    index = text.indexOf(EM_DASH, index + 1);
  }

  return locations;
}

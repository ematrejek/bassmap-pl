/**
 * Public-facing “On the roadmap” list on the homepage (`/`).
 *
 * **Agent sync rule** — update in the same session when you:
 * - add a new slice/foundation to `context/foundation/roadmap.md` (status not `done`)
 * - start `/10x-plan` or `/10x-implement` for a user-visible feature
 * - archive a slice (`/10x-archive`) — remove its fan-facing line here
 *
 * Keep 3–6 short items in plain English (fans read this). One line = one upcoming capability.
 * Internal-only work (migrations, CI, refactors) does not belong here.
 */
export interface PublicRoadmapItem {
  /** Stable id for edits (e.g. roadmap S-03 slug). */
  id: string;
  /** Shown on the homepage. */
  label: string;
}

export const PUBLIC_ROADMAP_ITEMS: PublicRoadmapItem[] = [
  {
    id: "date-range-filter",
    label: "Date filtering (calendar & quick picks)",
  },
  {
    id: "free-events-filter",
    label: "Show free events only",
  },
  {
    id: "mobile-subgenre-dropdown",
    label: "Better subgenre picker on mobile",
  },
  {
    id: "structured-price-currency",
    label: "Clear ticket prices with currency",
  },
  {
    id: "marketing-homepage",
    label: "New homepage & navigation",
  },
];

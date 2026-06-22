import GenreBadge, { type NeonColor } from "@/components/fan/GenreBadge";
import { cn } from "@/lib/utils";
import type { Subgenre } from "@/types";
import { SUBGENRE_LABELS } from "@/types";
import { useState } from "react";

const NEON_CYCLE: NeonColor[] = ["violet", "green", "cyan", "orange"];
const VISIBLE_COUNT = 2;

interface Props {
  subgenres: Subgenre[];
  className?: string;
}

export default function EventCardSubgenreBadges({ subgenres, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = subgenres.slice(0, VISIBLE_COUNT);
  const rest = subgenres.slice(VISIBLE_COUNT);

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visible.map((subgenre, index) => (
        <GenreBadge key={subgenre} color={NEON_CYCLE[index % NEON_CYCLE.length]}>
          {SUBGENRE_LABELS[subgenre]}
        </GenreBadge>
      ))}

      {rest.length > 0 && (
        <div
          className="inline-flex flex-wrap items-center gap-1.5"
          tabIndex={0}
          role="group"
          aria-label={`+${String(rest.length)} podgatunków – najechanie rozwija listę`}
          aria-expanded={expanded}
          onMouseEnter={() => {
            setExpanded(true);
          }}
          onMouseLeave={() => {
            setExpanded(false);
          }}
          onFocus={() => {
            setExpanded(true);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setExpanded(false);
            }
          }}
        >
          <GenreBadge color={NEON_CYCLE[visible.length % NEON_CYCLE.length]} className="cursor-default select-none">
            +{rest.length}
          </GenreBadge>

          {rest.map((subgenre, index) => (
            <GenreBadge
              key={subgenre}
              color={NEON_CYCLE[(visible.length + 1 + index) % NEON_CYCLE.length]}
              className={expanded ? "inline-flex" : "hidden"}
            >
              {SUBGENRE_LABELS[subgenre]}
            </GenreBadge>
          ))}
        </div>
      )}
    </div>
  );
}

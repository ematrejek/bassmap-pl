import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { FanEventFilters } from "@/lib/events/fan-schema";
import { shellBtnOutline, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import { SUBGENRES, SUBGENRE_LABELS, type Subgenre } from "@/types";
import { useState } from "react";

const SUBGENRE_HINT = "Zaznacz kilka – pokażemy wydarzenia pasujące do dowolnego z nich.";

function sortSelected(subgenres: Iterable<Subgenre>): Subgenre[] {
  const set = new Set(subgenres);
  return SUBGENRES.filter((subgenre) => set.has(subgenre));
}

interface Props {
  currentFilters: FanEventFilters;
}

export default function SubgenreFilter({ currentFilters }: Props) {
  const [selected, setSelected] = useState<Set<Subgenre>>(() => new Set(currentFilters.subgenres));

  const selectedList = sortSelected(selected);

  const toggleSubgenre = (subgenre: Subgenre, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(subgenre);
      } else {
        next.delete(subgenre);
      }
      return next;
    });
  };

  return (
    <>
      {selectedList.map((subgenre) => (
        <input key={subgenre} type="hidden" name="subgenre" value={subgenre} />
      ))}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-foreground/90">Podgatunki</Label>
          {selectedList.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn("h-7 px-2 text-xs", shellBtnOutline)}
              onClick={() => {
                setSelected(new Set());
              }}
            >
              Wyczyść
            </Button>
          ) : null}
        </div>

        <div
          className="border-border bg-card/40 max-h-44 overflow-y-auto rounded-lg border p-2 sm:max-h-52"
          role="group"
          aria-label="Wybór podgatunków"
        >
          <div className="space-y-1">
            {SUBGENRES.map((subgenre) => (
              <label
                key={subgenre}
                className="text-foreground hover:bg-secondary flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <Checkbox
                  checked={selected.has(subgenre)}
                  onCheckedChange={(checked) => {
                    toggleSubgenre(subgenre, checked === true);
                  }}
                  className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <span>{SUBGENRE_LABELS[subgenre]}</span>
              </label>
            ))}
          </div>
        </div>

        <p className={cn("text-xs", shellTextMuted)}>{SUBGENRE_HINT}</p>
      </div>
    </>
  );
}

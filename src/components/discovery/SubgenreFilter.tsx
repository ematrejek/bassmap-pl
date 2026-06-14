import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FanEventFilters } from "@/lib/events/fan-schema";
import { cn } from "@/lib/utils";
import { SUBGENRES, SUBGENRE_LABELS, type Subgenre } from "@/types";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const SUBGENRE_HINT = "Zaznacz kilka — pokażemy wydarzenia pasujące do dowolnego z nich.";

function formatTriggerLabel(selected: Subgenre[]): string {
  if (selected.length === 0) {
    return "Wybierz podgatunki";
  }

  if (selected.length === 1) {
    return SUBGENRE_LABELS[selected[0]];
  }

  return `${String(selected.length)} podgatunki`;
}

function sortSelected(subgenres: Iterable<Subgenre>): Subgenre[] {
  const set = new Set(subgenres);
  return SUBGENRES.filter((subgenre) => set.has(subgenre));
}

interface Props {
  currentFilters: FanEventFilters;
}

export default function SubgenreFilter({ currentFilters }: Props) {
  const [selected, setSelected] = useState<Set<Subgenre>>(() => new Set(currentFilters.subgenres));
  const [open, setOpen] = useState(false);

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

      <div className="space-y-2 sm:hidden">
        <Label className="text-blue-100/80">Podgatunki</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-between border-white/20 bg-white/5 font-normal text-white hover:bg-white/10",
                selectedList.length === 0 && "text-blue-100/60",
              )}
            >
              <span className="truncate">{formatTriggerLabel(selectedList)}</span>
              <ChevronDown className="ml-2 size-4 shrink-0 text-purple-200" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="max-h-[min(60vh,320px)] w-[min(100vw-2rem,20rem)] overflow-y-auto border-white/10 bg-slate-950/95 p-2 text-white backdrop-blur-xl"
          >
            <div className="space-y-1">
              {SUBGENRES.map((subgenre) => (
                <label
                  key={subgenre}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-blue-100/90 hover:bg-white/10"
                >
                  <Checkbox
                    checked={selected.has(subgenre)}
                    onCheckedChange={(checked) => {
                      toggleSubgenre(subgenre, checked === true);
                    }}
                    className="border-white/30 data-[state=checked]:border-purple-500 data-[state=checked]:bg-purple-500"
                  />
                  <span>{SUBGENRE_LABELS[subgenre]}</span>
                </label>
              ))}
            </div>
            {selectedList.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 w-full border-white/20 bg-white/5 text-blue-100/80 hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setSelected(new Set());
                }}
              >
                Wyczyść podgatunki
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
        <p className="text-xs text-blue-100/50">{SUBGENRE_HINT}</p>
      </div>

      <fieldset className="hidden space-y-2 sm:block">
        <legend className="text-sm font-medium text-blue-100/80">Podgatunki</legend>
        <div className="grid grid-cols-2 gap-2">
          {SUBGENRES.map((subgenre) => (
            <label
              key={subgenre}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-blue-100/90 hover:bg-white/10"
            >
              <Checkbox
                checked={selected.has(subgenre)}
                onCheckedChange={(checked) => {
                  toggleSubgenre(subgenre, checked === true);
                }}
                className="border-white/30 data-[state=checked]:border-purple-500 data-[state=checked]:bg-purple-500"
              />
              <span>{SUBGENRE_LABELS[subgenre]}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-blue-100/50">{SUBGENRE_HINT}</p>
      </fieldset>
    </>
  );
}

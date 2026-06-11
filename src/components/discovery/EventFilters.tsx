import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { FanEventFilters } from "@/lib/events/fan-schema";
import { cn } from "@/lib/utils";
import { SUBGENRES, SUBGENRE_LABELS, type Subgenre } from "@/types";

interface Props {
  cities: string[];
  currentFilters: FanEventFilters;
}

export default function EventFilters({ cities, currentFilters }: Props) {
  const selectedSubgenres = new Set(currentFilters.subgenres);

  return (
    <form
      method="GET"
      action="/"
      className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
    >
      <div className="space-y-2">
        <Label htmlFor="city" className="text-blue-100/80">
          Miasto
        </Label>
        <select
          id="city"
          name="city"
          defaultValue={currentFilters.city ?? ""}
          className={cn(
            "h-9 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white",
            "focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-400/30 focus-visible:outline-none",
          )}
        >
          <option value="">Wszystkie miasta</option>
          {cities.map((city) => (
            <option key={city} value={city} className="bg-slate-900 text-white">
              {city}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-blue-100/80">Podgatunki</legend>
        <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {SUBGENRES.map((subgenre: Subgenre) => (
            <label
              key={subgenre}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-blue-100/90 hover:bg-white/10"
            >
              <input
                type="checkbox"
                name="subgenre"
                value={subgenre}
                defaultChecked={selectedSubgenres.has(subgenre)}
                className="size-4 rounded border-white/30 accent-purple-500"
              />
              <span>{SUBGENRE_LABELS[subgenre]}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-blue-100/50">Zaznacz kilka — pokażemy wydarzenia pasujące do dowolnego z nich.</p>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="border-white/20 bg-purple-600/80 text-white hover:bg-purple-500/90">
          Filtruj
        </Button>
        <Button
          asChild
          type="button"
          variant="outline"
          className="border-white/20 bg-white/5 text-purple-200 hover:bg-white/10 hover:text-white"
        >
          <a href="/">Wyczyść filtry</a>
        </Button>
      </div>
    </form>
  );
}

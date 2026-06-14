import DateRangeFilter from "@/components/discovery/DateRangeFilter";
import SubgenreFilter from "@/components/discovery/SubgenreFilter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { FanEventFilters } from "@/lib/events/fan-schema";
import { DISCOVERY_PATH } from "@/lib/routes";
import { shellBtnOutline, shellBtnPrimary, shellPanel, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";

interface Props {
  cities: string[];
  currentFilters: FanEventFilters;
}

export default function EventFilters({ cities, currentFilters }: Props) {
  return (
    <form method="GET" action={DISCOVERY_PATH} className={cn("space-y-4 p-4", shellPanel)}>
      <div className="space-y-2">
        <Label className="text-foreground/90">Data</Label>
        <DateRangeFilter currentFilters={currentFilters} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city" className="text-foreground/90">
          Miasto
        </Label>
        <select
          id="city"
          name="city"
          defaultValue={currentFilters.city ?? ""}
          className={cn(
            "border-border bg-card/60 text-foreground h-9 w-full rounded-md border px-3 text-sm",
            "focus-visible:border-primary/70 focus-visible:ring-ring/30 focus-visible:shadow-glow-violet focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          <option value="">Wszystkie miasta</option>
          {cities.map((city) => (
            <option key={city} value={city} className="bg-card text-foreground">
              {city}
            </option>
          ))}
        </select>
      </div>

      <SubgenreFilter currentFilters={currentFilters} />

      <div className="space-y-2">
        <label
          htmlFor="free"
          className="border-border bg-card/50 text-foreground hover:bg-secondary flex w-fit cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
        >
          <input
            id="free"
            type="checkbox"
            name="free"
            value="1"
            defaultChecked={currentFilters.freeOnly}
            className="border-border accent-primary size-4 rounded"
          />
          <span>Pokaż tylko darmowe</span>
        </label>
        <p className={cn("text-xs", shellTextMuted)}>Zostaw odznaczone, żeby zobaczyć też płatne wydarzenia.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className={shellBtnPrimary}>
          Filtruj
        </Button>
        <Button asChild type="button" variant="outline" className={shellBtnOutline}>
          <a href={DISCOVERY_PATH}>Wyczyść filtry</a>
        </Button>
      </div>
    </form>
  );
}

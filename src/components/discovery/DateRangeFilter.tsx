import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  calendarDateToLocalDate,
  getWarsawCalendarDate,
  getWarsawDatePresetRange,
  localDateToCalendarDate,
} from "@/lib/events/date-range";
import { buildFanFilterSearchParams, type FanEventFilters } from "@/lib/events/fan-schema";
import { cn } from "@/lib/utils";
import { SUBGENRES, type Subgenre } from "@/types";
import { CalendarIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";

interface Props {
  currentFilters: FanEventFilters;
}

type DatePreset = "today" | "week" | "month";

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Dziś",
  week: "W tym tygodniu",
  month: "W tym miesiącu",
};

const SUBGENRE_SET = new Set<string>(SUBGENRES);

function isSubgenre(value: string): value is Subgenre {
  return SUBGENRE_SET.has(value);
}

function readLiveFiltersFromForm(form: HTMLFormElement | null, fallback: FanEventFilters): FanEventFilters {
  if (!form) {
    return fallback;
  }

  const formData = new FormData(form);
  const cityEntry = formData.get("city");
  const cityRaw = (typeof cityEntry === "string" ? cityEntry : "").trim();
  const city = cityRaw.length > 0 ? cityRaw : null;

  const subgenres: Subgenre[] = [];
  for (const value of formData.getAll("subgenre")) {
    const trimmed = (typeof value === "string" ? value : "").trim();
    if (trimmed && isSubgenre(trimmed) && !subgenres.includes(trimmed)) {
      subgenres.push(trimmed);
    }
  }

  const freeOnly = formData.get("free") === "1";

  return {
    city,
    subgenres,
    dateFrom: fallback.dateFrom,
    dateTo: fallback.dateTo,
    freeOnly,
  };
}

function formatCalendarDateLabel(yyyyMmDd: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(calendarDateToLocalDate(yyyyMmDd));
}

function formatSelectedRangeLabel(dateFrom: string | null, dateTo: string | null): string {
  if (!dateFrom) {
    return "Wybierz datę";
  }

  const to = dateTo ?? dateFrom;
  if (dateFrom === to) {
    return formatCalendarDateLabel(dateFrom);
  }

  return `${formatCalendarDateLabel(dateFrom)} – ${formatCalendarDateLabel(to)}`;
}

function toSelectedRange(dateFrom: string | null, dateTo: string | null): DateRange | undefined {
  if (!dateFrom) {
    return undefined;
  }

  const to = dateTo ?? dateFrom;
  return {
    from: calendarDateToLocalDate(dateFrom),
    to: calendarDateToLocalDate(to),
  };
}

function buildFilterHref(baseFilters: FanEventFilters, next: Partial<FanEventFilters>): string {
  const params = buildFanFilterSearchParams({
    ...baseFilters,
    ...next,
  });
  const query = params.toString();
  return query.length > 0 ? `/?${query}` : "/";
}

export default function DateRangeFilter({ currentFilters }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fromValue, setFromValue] = useState(currentFilters.dateFrom ?? "");
  const [toValue, setToValue] = useState(currentFilters.dateTo ?? "");
  const [open, setOpen] = useState(false);

  const navigateWithFilters = (next: Partial<FanEventFilters>) => {
    const form = rootRef.current?.closest("form") ?? null;
    const base = readLiveFiltersFromForm(form, currentFilters);
    window.location.assign(buildFilterHref(base, next));
  };

  const handlePresetClick = (preset: DatePreset) => {
    const range = getWarsawDatePresetRange(preset);
    navigateWithFilters({ dateFrom: range.from, dateTo: range.to });
  };

  const handleClearDate = () => {
    navigateWithFilters({ dateFrom: null, dateTo: null });
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      setFromValue("");
      setToValue("");
      return;
    }

    const nextFrom = localDateToCalendarDate(range.from);
    const nextTo = localDateToCalendarDate(range.to ?? range.from);
    setFromValue(nextFrom);
    setToValue(nextTo);
  };

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESET_LABELS) as DatePreset[]).map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 bg-white/5 text-purple-100 hover:bg-white/10 hover:text-white"
            onClick={() => {
              handlePresetClick(preset);
            }}
          >
            {PRESET_LABELS[preset]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "min-w-[12rem] justify-start border-white/20 bg-white/5 text-left font-normal text-white hover:bg-white/10",
                !fromValue && "text-blue-100/60",
              )}
            >
              <CalendarIcon className="mr-2 size-4 text-purple-200" />
              {formatSelectedRangeLabel(fromValue || null, toValue || null)}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto border-white/10 bg-slate-950/95 p-0 text-white backdrop-blur-xl"
          >
            <Calendar
              mode="range"
              selected={toSelectedRange(fromValue || null, toValue || null)}
              onSelect={handleRangeSelect}
              disabled={{ before: calendarDateToLocalDate(getWarsawCalendarDate()) }}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>

        {fromValue ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 bg-white/5 text-blue-100/80 hover:bg-white/10 hover:text-white"
            onClick={handleClearDate}
          >
            Wyczyść datę
          </Button>
        ) : null}
      </div>

      {fromValue ? (
        <>
          <input type="hidden" name="from" value={fromValue} />
          <input type="hidden" name="to" value={toValue} />
        </>
      ) : null}
    </div>
  );
}

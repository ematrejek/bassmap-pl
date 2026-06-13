import { DayPicker, type DayPickerProps } from "react-day-picker";
import type { ChevronProps } from "react-day-picker";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={pl}
      showOutsideDays={showOutsideDays}
      className={cn("p-3 text-white", className)}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: "flex w-full flex-col gap-4",
        month_caption: "relative flex h-10 items-center justify-center",
        caption_label: "text-sm font-medium text-white",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute top-0 left-0 size-8 border-white/20 bg-transparent p-0 text-white hover:bg-white/10",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute top-0 right-0 size-8 border-white/20 bg-transparent p-0 text-white hover:bg-white/10",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-center text-xs font-normal text-blue-100/60",
        week: "mt-2 flex w-full",
        day: "relative p-0 text-center text-sm",
        day_button: cn(buttonVariants({ variant: "ghost" }), "size-9 p-0 font-normal text-white hover:bg-white/10"),
        selected: "rounded-md bg-purple-600 text-white hover:bg-purple-600 hover:text-white focus:bg-purple-600",
        today: "rounded-md bg-white/10 text-white",
        outside: "text-blue-100/30",
        disabled: "text-blue-100/30 opacity-50",
        range_middle: "rounded-none bg-purple-500/20",
        range_start: "rounded-l-md rounded-r-none bg-purple-600",
        range_end: "rounded-r-md rounded-l-none bg-purple-600",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }: ChevronProps) =>
          orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
      }}
      {...props}
    />
  );
}

export { Calendar };

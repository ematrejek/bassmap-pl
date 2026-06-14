import { DayPicker, type DayPickerProps } from "react-day-picker";
import type { ChevronProps } from "react-day-picker";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { shellBtnOutline } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={pl}
      showOutsideDays={showOutsideDays}
      className={cn("text-foreground p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: "flex w-full flex-col gap-4",
        month_caption: "relative flex h-10 items-center justify-center",
        caption_label: "text-foreground text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          shellBtnOutline,
          "absolute top-0 left-0 size-8 p-0",
        ),
        button_next: cn(buttonVariants({ variant: "outline" }), shellBtnOutline, "absolute top-0 right-0 size-8 p-0"),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-9 text-center text-xs font-normal",
        week: "mt-2 flex w-full",
        day: "relative p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "text-foreground hover:bg-secondary size-9 p-0 font-normal",
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary rounded-md",
        today: "bg-secondary text-foreground rounded-md",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/40 opacity-50",
        range_middle: "bg-primary/20 rounded-none",
        range_start: "bg-primary rounded-l-md rounded-r-none",
        range_end: "bg-primary rounded-r-md rounded-l-none",
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

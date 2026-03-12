import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const today = new Date();
  
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      startMonth={today}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center items-center h-10 relative mb-4",
        caption_label: "text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-tight z-20",
        nav: "flex items-center absolute inset-x-0 w-full justify-between z-10 h-10 px-1",
        button_previous: cn(
          "h-8 w-8 flex items-center justify-center rounded-full transition-all duration-200",
          "text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400",
          "hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 disabled:opacity-0 disabled:pointer-events-none"
        ),
        button_next: cn(
          "h-8 w-8 flex items-center justify-center rounded-full transition-all duration-200",
          "text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400",
          "hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90"
        ),
        month_grid: "w-full border-collapse select-none",
        weekdays: "flex justify-between mb-3",
        weekday: "text-slate-400 dark:text-slate-500 w-8 font-bold text-[9px] uppercase text-center",
        week: "flex w-full mt-1 justify-between",
        day: "h-8 w-8 text-center text-xs p-0",
        day_button: cn(
          "h-8 w-8 p-0 font-medium rounded-xl transition-all flex items-center justify-center relative",
          "hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400",
          "aria-selected:bg-indigo-600 aria-selected:text-white aria-selected:font-bold aria-selected:shadow-md aria-selected:shadow-indigo-500/30",
          "active:scale-90"
        ),
        today: "text-indigo-600 dark:text-indigo-400 font-black after:content-[''] after:absolute after:bottom-1 after:w-1 after:h-1 after:bg-indigo-500 after:rounded-full",
        outside: "text-slate-300 dark:text-slate-600 opacity-20 pointer-events-none",
        disabled: "text-slate-200 dark:text-slate-800 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => 
          orientation === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

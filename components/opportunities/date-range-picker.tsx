"use client";

import { useState } from "react";
import type { DateRange as PickerRange } from "react-day-picker";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { addDays, addMonths, dateToISO, formatSelectedRange, isoToLocalDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ISODate } from "@/types/domain";

interface DateRangePickerProps {
  from: ISODate | null;
  to: ISODate | null;
  today: ISODate;
  onChange: (from: ISODate | null, to: ISODate | null) => void;
  /** Visible label above the trigger. */
  label?: string;
  id?: string;
  className?: string;
}

export function DateRangePicker({ from, to, today, onChange, label = "Travel dates", id = "dates", className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const hasValue = Boolean(from || to);

  const shortcuts = [
    { label: "Any dates", from: null, to: null },
    { label: "Next 30 days", from: today, to: addDays(today, 30) },
    { label: "Next 3 months", from: today, to: addMonths(today, 3) },
    { label: "Next 6 months", from: today, to: addMonths(today, 6) },
  ];

  const selected: PickerRange | undefined = from
    ? { from: isoToLocalDate(from), to: to ? isoToLocalDate(to) : undefined }
    : undefined;

  const handleSelect = (range: PickerRange | undefined) => {
    onChange(range?.from ? dateToISO(range.from) : null, range?.to ? dateToISO(range.to) : null);
  };

  const triggerText = hasValue ? formatSelectedRange(from, to) : "Any dates";
  const trigger = (
    <span className="flex min-w-0 items-center gap-2.5">
      <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
      <span className={cn("truncate", !hasValue && "text-muted-foreground")}>{triggerText}</span>
    </span>
  );
  const triggerClass =
    "flex h-12 w-full items-center rounded-xl border border-input bg-card pr-10 pl-3.5 text-left text-[0.95rem] text-ink shadow-xs transition-colors hover:border-primary/40 focus-visible:border-primary";

  const body = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Date shortcuts">
        {shortcuts.map((s) => {
          const active = s.from === from && s.to === to;
          return (
            <button
              key={s.label}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onChange(s.from, s.to);
                setOpen(false);
              }}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
                active ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-ink hover:border-primary/40",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <Calendar
        mode="range"
        selected={selected}
        onSelect={handleSelect}
        resetOnSelect
        numberOfMonths={isDesktop ? 2 : 1}
        defaultMonth={from ? isoToLocalDate(from) : isoToLocalDate(today)}
        weekStartsOn={1}
        className={cn("mx-auto p-0", isDesktop ? "[--cell-size:--spacing(9)]" : "[--cell-size:--spacing(11)]")}
      />
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <p className="text-muted-foreground" aria-live="polite">
          {from && !to ? "Now pick the last day you could be there." : hasValue ? formatSelectedRange(from, to) : "Pick your first and last day."}
        </p>
        <div className="flex shrink-0 gap-2">
          {hasValue && (
            <button type="button" className="h-9 rounded-lg px-3 font-medium text-muted-foreground hover:bg-muted hover:text-ink" onClick={() => onChange(null, null)}>
              Clear
            </button>
          )}
          <button type="button" className="h-9 rounded-lg bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {isDesktop ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger id={id} className={triggerClass} aria-label={`${label}: ${triggerText}`}>
            {trigger}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto rounded-2xl p-4">
            {body}
          </PopoverContent>
        </Popover>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger id={id} className={triggerClass} aria-label={`${label}: ${triggerText}`}>
            {trigger}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-card px-4 pb-6">
            <SheetHeader className="px-0 pb-0">
              <SheetTitle className="font-heading text-lg">When could you be in Sri Lanka?</SheetTitle>
              <SheetDescription>We&rsquo;ll show opportunities with dates that overlap your period.</SheetDescription>
            </SheetHeader>
            {body}
          </SheetContent>
        </Sheet>
      )}
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="absolute right-1.5 bottom-1.5 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-ink"
          aria-label="Clear dates"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

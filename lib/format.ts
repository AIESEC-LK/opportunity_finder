import type { DateRange, ISODate } from "@/types/domain";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Date-only values are always handled in UTC so no timezone shifts the day. */
export function isoToUTCDate(iso: ISODate): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function dateToISO(date: Date): ISODate {
  // Calendar pickers hand back local-midnight Dates; read the local parts.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isoToLocalDate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Today's date in Sri Lanka, where every listed opportunity takes place. */
export function todayISO(now = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = isoToUTCDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

const fmt = (iso: ISODate, options: Intl.DateTimeFormatOptions) =>
  isoToUTCDate(iso).toLocaleDateString("en-GB", { timeZone: "UTC", ...options });

export function formatDate(iso: ISODate, withYear = true): string {
  return fmt(iso, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

export function formatRange(range: Pick<DateRange, "start" | "end" | "precision">): string {
  const sameYear = range.start.slice(0, 4) === range.end.slice(0, 4);
  if (range.precision === "month") {
    const sameMonth = range.start.slice(0, 7) === range.end.slice(0, 7);
    if (sameMonth) return fmt(range.start, { month: "long", year: "numeric" });
    return `${fmt(range.start, { month: "short", ...(sameYear ? {} : { year: "numeric" }) })} – ${fmt(range.end, { month: "short", year: "numeric" })}`;
  }
  return `${formatDate(range.start, !sameYear)} – ${formatDate(range.end)}`;
}

export function formatSelectedRange(from: ISODate | null, to: ISODate | null): string {
  if (from && to) return formatRange({ start: from, end: to, precision: "day" });
  if (from) return `From ${formatDate(from)}`;
  if (to) return `Until ${formatDate(to)}`;
  return "Any dates";
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count.toLocaleString("en-GB")} ${count === 1 ? singular : pluralForm}`;
}

import type { DateRange, ISODate } from "@/types/domain";

/**
 * Reads the free-text "Available Slots" cells of the sheet into date ranges.
 *
 * Cells look like "1 Jan - 12 Feb\n12 Feb - 26 Mar", "Jan 12-Feb 12",
 * "3rd Mar-14th Apr", "5 Jan, 2026 - 16 Feb, 2026", "Jan,Feb,Mar (Flexible)"
 * or "Dec-Jan", and usually omit the year. Year inference rules:
 *
 * 1. A year written in the text always wins.
 * 2. Otherwise the year comes from the column heading ("2025", "2026").
 * 3. An end month earlier than the start month rolls into the next year
 *    ("1 Dec - 12 Jan" ends in January of the following year).
 * 4. Once a start date in a cell carries an explicit year, later ranges in the
 *    same cell without a year use that year.
 * 5. A cell that opens with Oct–Dec ranges and then continues from Jan–Apr
 *    (e.g. "22 Dec - 2 Feb | 2 Feb - 16 Mar" under "2026") is a list that
 *    started late in the previous year, so those opening ranges use the
 *    previous year.
 *
 * Anything that cannot be read with confidence is returned in `unparsed`
 * and the original text is always kept for display.
 */

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** Misspellings seen in the sheet that are not prefixes of a month name. */
const MONTH_ALIASES: Record<string, number> = { mr: 3, agu: 8, agust: 8 };

export function monthFromWord(word: string): number | null {
  const w = word.toLowerCase();
  if (MONTH_ALIASES[w]) return MONTH_ALIASES[w];
  if (w.length < 3) return null;
  const index = MONTH_NAMES.findIndex((name) => name.startsWith(w));
  return index === -1 ? null : index + 1;
}

const FLEXIBLE_PATTERN =
  /fl[ei]x|flesx|year[\s-]*(round|around)|all year|throughout the year|per request|on request/i;

export function isFlexibleText(text: string): boolean {
  return FLEXIBLE_PATTERN.test(text);
}

type Token =
  | { kind: "num"; value: number; digits: number; start: number; end: number }
  | { kind: "month"; value: number; start: number; end: number }
  | { kind: "word"; text: string; start: number; end: number }
  | { kind: "dash"; start: number; end: number }
  | { kind: "comma"; start: number; end: number }
  | { kind: "sep"; start: number; end: number };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /(\d+)(?:st|nd|rd|th)?|([A-Za-z]+)|([-–—]+)|(,)|([\n|;/()]+)|([ \t ]+)|(.)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    if (match[1] !== undefined) {
      tokens.push({ kind: "num", value: Number(match[1]), digits: match[1].length, start, end });
    } else if (match[2] !== undefined) {
      const month = monthFromWord(match[2]);
      tokens.push(
        month ? { kind: "month", value: month, start, end } : { kind: "word", text: match[2], start, end },
      );
    } else if (match[3] !== undefined) {
      tokens.push({ kind: "dash", start, end });
    } else if (match[4] !== undefined) {
      tokens.push({ kind: "comma", start, end });
    } else if (match[5] !== undefined) {
      tokens.push({ kind: "sep", start, end });
    } else if (match[6] !== undefined) {
      // Runs of 3+ spaces separate ranges in some cells; single spaces do not.
      if (match[6].length >= 3) tokens.push({ kind: "sep", start, end });
    } else {
      tokens.push({ kind: "sep", start, end });
    }
  }
  return tokens;
}

interface PartialDate {
  day: number | null;
  month: number;
  year: number | null;
  first: number;
  last: number;
}

const isYear = (t: Token | undefined): t is Extract<Token, { kind: "num" }> =>
  t?.kind === "num" && t.digits === 4 && t.value >= 2000 && t.value <= 2100;

const isDay = (t: Token | undefined): t is Extract<Token, { kind: "num" }> =>
  t?.kind === "num" && t.digits <= 2 && t.value >= 1 && t.value <= 31;

/** Reads an optional year after a date: "5 Jan 2026" or "5 Jan, 2026". */
function readYear(tokens: Token[], i: number): { year: number | null; next: number } {
  if (isYear(tokens[i])) return { year: tokens[i].value, next: i + 1 };
  if (tokens[i]?.kind === "comma" && isYear(tokens[i + 1])) {
    return { year: (tokens[i + 1] as { value: number }).value, next: i + 2 };
  }
  return { year: null, next: i };
}

/** Reads a date starting at token i: "12 Feb", "Feb 12", "12 Feb, 2026" or a bare month. */
function readDate(tokens: Token[], i: number): { date: PartialDate; next: number } | null {
  const a = tokens[i];
  const b = tokens[i + 1];
  if (isDay(a) && b?.kind === "month") {
    const { year, next } = readYear(tokens, i + 2);
    return { date: { day: a.value, month: b.value, year, first: i, last: next - 1 }, next };
  }
  if (a?.kind === "month") {
    if (isDay(b)) {
      const { year, next } = readYear(tokens, i + 2);
      return { date: { day: b.value, month: a.value, year, first: i, last: next - 1 }, next };
    }
    const { year, next } = readYear(tokens, i + 1);
    return { date: { day: null, month: a.value, year, first: i, last: next - 1 }, next };
  }
  return null;
}

interface RawRange {
  from: PartialDate;
  to: PartialDate;
  text: string;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function toISO(year: number, month: number, day: number): ISODate {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Whole days between two ISO dates, computed in UTC to avoid DST/timezone drift. */
export function daysBetween(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

const MAX_RANGE_DAYS = 200;

export interface ParsedSlots {
  ranges: DateRange[];
  flexible: boolean;
  unparsed: string[];
}

export function parseSlotText(text: string, columnYear: number | null): ParsedSlots {
  const flexible = isFlexibleText(text);
  const tokens = tokenize(text);
  const consumed = new Set<number>();
  const dayRanges: RawRange[] = [];
  const monthOnly: { month: number; year: number | null; toMonth?: number; toYear?: number | null; text: string }[] = [];
  const unparsed: string[] = [];

  const slice = (first: number, last: number) => text.slice(tokens[first].start, tokens[last].end).trim();

  let i = 0;
  while (i < tokens.length) {
    const from = readDate(tokens, i);
    if (!from) {
      i++;
      continue;
    }

    let j = from.next;
    if (tokens[j]?.kind === "dash") {
      const to = readDate(tokens, j + 1);
      if (to) {
        const bothDays = from.date.day !== null && to.date.day !== null;
        const bothMonths = from.date.day === null && to.date.day === null;
        const span = slice(from.date.first, to.date.last);
        if (bothDays) {
          dayRanges.push({ from: from.date, to: to.date, text: span });
        } else if (bothMonths) {
          monthOnly.push({ month: from.date.month, year: from.date.year, toMonth: to.date.month, toYear: to.date.year, text: span });
        } else {
          unparsed.push(span);
        }
        for (let k = from.date.first; k <= to.date.last; k++) consumed.add(k);
        i = to.next;
        continue;
      }
      // "29 May - Jul" style fragments with a missing end.
      j = j + 1;
    }

    const prev = tokens[from.date.first - 1];
    const next = tokens[from.next];
    const openEnded =
      (prev?.kind === "word" && /^from$/i.test(prev.text)) ||
      (next?.kind === "word" && /^onwards?$/i.test(next.text));

    if (from.date.day === null && !openEnded && j === from.next) {
      monthOnly.push({ month: from.date.month, year: from.date.year, text: slice(from.date.first, from.date.last) });
    } else {
      unparsed.push(slice(from.date.first, Math.max(from.date.last, j - 1)));
    }
    for (let k = from.date.first; k < j; k++) consumed.add(k);
    i = j;
  }

  // Stray day numbers that are not part of a date ("4 weeks" and years are fine).
  tokens.forEach((token, index) => {
    if (consumed.has(index) || token.kind !== "num") return;
    const after = tokens[index + 1];
    if (token.digits === 4 || (after?.kind === "word" && /^weeks?$/i.test(after.text))) return;
    unparsed.push(text.slice(token.start, token.end));
  });

  const ranges: DateRange[] = [];

  // Rule 5: an opening run of Oct–Dec ranges followed by an early-year range.
  let shiftPrefix = 0;
  if (columnYear !== null) {
    let k = 0;
    while (k < dayRanges.length && dayRanges[k].from.year === null && dayRanges[k].to.year === null && dayRanges[k].from.month >= 10) k++;
    const following = dayRanges[k];
    if (k > 0 && following && following.from.year === null && following.from.month <= 4) shiftPrefix = k;
  }

  let cursor = columnYear;
  dayRanges.forEach((range, index) => {
    const { from, to } = range;
    let startYear: number | null;
    let endYear: number | null;
    const rolls = to.month < from.month || (to.month === from.month && (to.day ?? 0) < (from.day ?? 0));

    if (from.year !== null) {
      startYear = from.year;
      cursor = from.year;
      endYear = to.year ?? (rolls ? startYear + 1 : startYear);
    } else if (to.year !== null) {
      endYear = to.year;
      startYear = rolls ? endYear - 1 : endYear;
    } else if (cursor !== null) {
      startYear = index < shiftPrefix ? cursor - 1 : cursor;
      endYear = rolls ? startYear + 1 : startYear;
    } else {
      unparsed.push(range.text);
      return;
    }

    if (from.day! > daysInMonth(startYear, from.month) || to.day! > daysInMonth(endYear, to.month)) {
      unparsed.push(range.text);
      return;
    }
    const start = toISO(startYear, from.month, from.day!);
    const end = toISO(endYear, to.month, to.day!);
    const length = daysBetween(start, end);
    if (length <= 0 || length > MAX_RANGE_DAYS) {
      unparsed.push(range.text);
      return;
    }
    ranges.push({
      start,
      end,
      precision: "day",
      yearInferred: from.year === null || to.year === null,
      raw: range.text,
      weeks: Math.round(length / 7),
    });
  });

  // Month-only windows ("Jan,Feb,Mar", "Dec-Jan"); consecutive months are joined.
  const windows: { startY: number; startM: number; endY: number; endM: number; raw: string[]; inferred: boolean }[] = [];
  for (const item of monthOnly) {
    const startY = item.year ?? cursor;
    if (startY === null) {
      unparsed.push(item.text);
      continue;
    }
    const endM = item.toMonth ?? item.month;
    let endY = item.toYear ?? startY;
    if (item.toMonth !== undefined && item.toYear == null && item.toMonth < item.month) endY = startY + 1;
    if (endY < startY || (endY === startY && endM < item.month)) {
      unparsed.push(item.text);
      continue;
    }
    const last = windows[windows.length - 1];
    const nextOfLast = last ? (last.endM === 12 ? { y: last.endY + 1, m: 1 } : { y: last.endY, m: last.endM + 1 }) : null;
    if (last && nextOfLast && nextOfLast.y === startY && nextOfLast.m === item.month) {
      last.endY = endY;
      last.endM = endM;
      last.raw.push(item.text);
      last.inferred = last.inferred || item.year === null;
    } else {
      windows.push({ startY, startM: item.month, endY, endM, raw: [item.text], inferred: item.year === null });
    }
  }
  for (const w of windows) {
    ranges.push({
      start: toISO(w.startY, w.startM, 1),
      end: toISO(w.endY, w.endM, daysInMonth(w.endY, w.endM)),
      precision: "month",
      yearInferred: w.inferred,
      raw: w.raw.join(", "),
      weeks: null,
    });
  }

  return { ranges, flexible, unparsed: [...new Set(unparsed)] };
}

/** Removes ranges with the same start, end and precision, keeping the first. */
export function dedupeRanges(ranges: DateRange[]): DateRange[] {
  const seen = new Set<string>();
  const result: DateRange[] = [];
  for (const range of ranges) {
    const key = `${range.start}|${range.end}|${range.precision}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(range);
  }
  return result.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

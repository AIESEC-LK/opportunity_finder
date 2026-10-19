import { CalendarClock } from "lucide-react";
import { upcomingRanges } from "@/lib/filters";
import { formatRange } from "@/lib/format";
import type { DateRange, ISODate, OpportunityDates } from "@/types/domain";

function RangeRow({ range, today }: { range: DateRange; today: ISODate }) {
  const running = range.start <= today && range.end >= today;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
      <span className="font-semibold text-ink">
        {range.precision === "month" ? "Flexible within " : ""}
        {formatRange(range)}
      </span>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {running && <span className="rounded-md bg-included-soft px-2 py-0.5 text-xs font-semibold text-included">Running now</span>}
        {range.weeks !== null ? `About ${range.weeks} weeks` : "Exact days not listed"}
      </span>
    </li>
  );
}

export function DatesSection({ dates, today }: { dates: OpportunityDates; today: ISODate }) {
  const upcoming = upcomingRanges({ dates }, today);
  const past = dates.ranges.filter((r) => r.end < today);

  return (
    <div className="space-y-4">
      {dates.flexible && (
        <p className="flex gap-2.5 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
          <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Flexible dates — ask the host team.
        </p>
      )}

      {upcoming.length > 0 ? (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card px-4 sm:px-5">
          {upcoming.map((r) => (
            <RangeRow key={`${r.start}${r.end}${r.precision}`} range={r} today={today} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-input bg-card/60 px-4 py-4 text-sm text-muted-foreground">
          {dates.ranges.length
            ? "All listed dates have passed. Ask the host team about new ones."
            : dates.flexible
              ? "No fixed dates — the host team will arrange them with you."
              : "No dates are listed yet. Ask the host team."}
        </p>
      )}

      {past.length > 0 && (
        <details className="group rounded-2xl border border-border bg-card px-4 sm:px-5">
          <summary className="cursor-pointer py-3 text-sm font-semibold text-ink">
            {past.length} past {past.length === 1 ? "date" : "dates"}
          </summary>
          <ul className="divide-y divide-border border-t border-border text-muted-foreground">
            {past.map((r) => (
              <li key={`${r.start}${r.end}`} className="flex justify-between gap-4 py-2.5 text-sm">
                <span>{formatRange(r)}</span>
                {r.weeks !== null && <span>{r.weeks} weeks</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

    </div>
  );
}

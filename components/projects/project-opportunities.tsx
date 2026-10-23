"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarSearch, SearchX } from "lucide-react";
import { DateRangePicker } from "@/components/opportunities/date-range-picker";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { StatusPill } from "@/components/logistics/status";
import {
  applyFilters,
  DEFAULT_FILTERS,
  type Filters,
  hasDateCriteria,
  matchingRanges,
  toSearchParams,
} from "@/lib/filters";
import { formatRange, plural } from "@/lib/format";
import type { OpportunitySummary } from "@/lib/summary";
import type { ISODate } from "@/types/domain";

interface ProjectOpportunitiesProps {
  opportunities: OpportunitySummary[];
  projectName: string;
  today: ISODate;
  initialFilters: Pick<Filters, "from" | "to" | "flexible">;
}

export function ProjectOpportunities({ opportunities, projectName, today, initialFilters }: ProjectOpportunitiesProps) {
  const [from, setFrom] = useState<ISODate | null>(initialFilters.from);
  const [to, setTo] = useState<ISODate | null>(initialFilters.to);
  const [flexible, setFlexible] = useState(initialFilters.flexible);

  const filters = useMemo<Filters>(
    () => ({ ...DEFAULT_FILTERS, from, to, flexible }),
    [from, to, flexible],
  );

  useEffect(() => {
    const params = toSearchParams(filters).toString();
    const next = `${window.location.pathname}${params ? `?${params}` : ""}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [filters]);

  const { results, unknownDates } = useMemo(() => applyFilters(opportunities, filters, today), [opportunities, filters, today]);
  const searching = hasDateCriteria(filters);
  const dateFilters = { from, to, weeks: [] as number[] };

  const updateDates = (nextFrom: ISODate | null, nextTo: ISODate | null) => {
    setFrom(nextFrom);
    setTo(nextTo);
    if (!nextFrom && !nextTo) setFlexible(false);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-sans text-xl font-semibold text-ink">Compare the opportunities</h2>
        <DateRangePicker
          id="project-dates"
          className="w-full sm:max-w-sm"
          label="Search by your dates"
          from={from}
          to={to}
          today={today}
          onChange={updateDates}
        />
      </div>

      {searching && (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {results.length === 1 ? "1 opportunity matches your dates" : `${plural(results.length, "opportunity", "opportunities")} match your dates`}
        </p>
      )}

      {searching && !flexible && unknownDates.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#e9d9b4] bg-[#fbf6ea] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2.5 text-sm text-ink">
            <CalendarSearch className="mt-0.5 size-4 shrink-0 text-[#8a6417]" aria-hidden />
            <span>
              {plural(unknownDates.length, "more listing")} {unknownDates.length === 1 ? "has" : "have"} flexible or unlisted dates,
              so we can&rsquo;t tell whether {unknownDates.length === 1 ? "it fits" : "they fit"} your dates.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setFlexible(true)}
            className="h-10 shrink-0 rounded-xl border border-[#d8c08a] bg-card px-4 text-sm font-semibold text-ink hover:border-[#8a6417]"
          >
            Show them too
          </button>
        </div>
      )}

      {results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-input bg-card/60 px-6 py-14 text-center">
          <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-heading text-xl font-semibold text-ink">No opportunities match those dates</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Try a wider range.
            {searching && unknownDates.length > 0 && " Some listings with flexible dates might still fit."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => updateDates(null, null)}
              className="h-10 rounded-xl border border-input bg-card px-4 text-sm font-semibold text-ink"
            >
              Any dates
            </button>
            {searching && unknownDates.length > 0 && (
              <button
                type="button"
                onClick={() => setFlexible(true)}
                className="h-10 rounded-xl border border-input bg-card px-4 text-sm font-semibold text-ink"
              >
                Include flexible dates
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                {plural(results.length, "opportunity", "opportunities")} in the {projectName} project
                {searching ? " matching your dates" : ""}
              </caption>
              <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Opportunity</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{searching ? "Matching dates" : "Upcoming dates"}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Length</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Meals</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Accommodation</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((o) => {
                  const next = matchingRanges(o, dateFilters, today);
                  const weeks = [...new Set(o.dates.ranges.map((r) => r.weeks).filter((w): w is number => w !== null))];
                  return (
                    <tr key={o.id} className="align-top hover:bg-muted/30">
                      <th scope="row" className="px-4 py-3.5 font-normal">
                        <Link href={`/opportunities/${o.id}`} className="font-semibold text-ink hover:text-primary hover:underline">
                          {o.title}
                        </Link>
                        <span className="block text-muted-foreground">{o.hostTeam?.name ?? "Entity not specified"}</span>
                      </th>
                      <td className="px-4 py-3.5 text-ink">
                        {next.length ? (
                          <>
                            {next.slice(0, 2).map((r) => (
                              <span key={r.start + r.end} className="block whitespace-nowrap">
                                {r.precision === "month" ? "Within " : ""}
                                {formatRange(r)}
                              </span>
                            ))}
                            {next.length > 2 && <span className="text-muted-foreground">+{next.length - 2} more</span>}
                          </>
                        ) : (
                          <span className="text-muted-foreground">{o.dates.flexible ? "Flexible" : o.dates.ranges.length ? "Listed dates have passed" : "Not listed"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink">{weeks.length ? weeks.map((w) => `${w} wk`).join(", ") : "—"}</td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={o.provisions.meals.status} />
                        {o.provisions.meals.detail && <span className="mt-1 block text-xs text-muted-foreground">{o.provisions.meals.detail}</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={o.provisions.accommodation.status} />
                        {o.provisions.accommodation.hasPhotos && <span className="mt-1 block text-xs text-muted-foreground">Photos shared</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/opportunities/${o.id}`} className="inline-flex items-center gap-1 font-semibold whitespace-nowrap text-primary hover:underline" aria-label={`View details for ${o.title}`}>
                          Details
                          <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {results.map((o) => (
              <li key={o.id}>
                <OpportunityCard opportunity={o} today={today} filters={dateFilters} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

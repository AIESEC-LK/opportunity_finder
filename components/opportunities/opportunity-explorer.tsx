"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarSearch, SlidersHorizontal, SearchX, Search, X } from "lucide-react";
import { DateRangePicker } from "@/components/opportunities/date-range-picker";
import { FilterPanel, type FilterOptions } from "@/components/opportunities/filter-panel";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  applyFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  facetCounts,
  type Filters,
  hasDateCriteria,
  type SortKey,
  toSearchParams,
} from "@/lib/filters";
import { formatSelectedRange, plural } from "@/lib/format";
import { getSdg } from "@/lib/sdgs";
import type { OpportunitySummary } from "@/lib/summary";
import type { ISODate } from "@/types/domain";

const PAGE_SIZE = 24;

const SORTS: { value: SortKey; label: string }[] = [
  { value: "soonest", label: "Soonest dates" },
  { value: "title", label: "Name (A–Z)" },
  { value: "project", label: "Project" },
  { value: "host", label: "Entity" },
];

interface ExplorerProps {
  opportunities: OpportunitySummary[];
  options: FilterOptions;
  initialFilters: Filters;
  today: ISODate;
}

export function OpportunityExplorer({ opportunities, options, initialFilters, today }: ExplorerProps) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [query, setQuery] = useState(initialFilters.q);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const resultsRef = useRef<HTMLHeadingElement>(null);

  // Typing filters immediately; the URL catches up after a short pause.
  useEffect(() => {
    const handle = setTimeout(() => setFilters((f) => (f.q === query ? f : { ...f, q: query })), 200);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const params = toSearchParams(filters).toString();
    const next = `${window.location.pathname}${params ? `?${params}` : ""}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [filters]);

  const live = useMemo(() => ({ ...filters, q: query }), [filters, query]);
  const { results, unknownDates } = useMemo(() => applyFilters(opportunities, live, today), [opportunities, live, today]);
  const counts = useMemo(() => facetCounts(opportunities, live), [opportunities, live]);
  const activeCount = countActiveFilters(live);
  const returnTo = toSearchParams(live).toString();

  const update = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setLimit(PAGE_SIZE);
  };
  const clearAll = () => {
    setQuery("");
    setFilters({ ...DEFAULT_FILTERS, sort: filters.sort });
    setLimit(PAGE_SIZE);
  };

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (query.trim()) chips.push({ key: "q", label: `“${query.trim()}”`, remove: () => setQuery("") });
  if (filters.from || filters.to)
    chips.push({ key: "dates", label: formatSelectedRange(filters.from, filters.to), remove: () => update({ from: null, to: null }) });
  for (const g of filters.goals)
    chips.push({ key: `g${g}`, label: `SDG ${g} · ${getSdg(g)?.name}`, remove: () => update({ goals: filters.goals.filter((x) => x !== g) }) });
  for (const slug of filters.projects)
    chips.push({
      key: `p${slug}`,
      label: options.projects.find((p) => p.slug === slug)?.name ?? slug,
      remove: () => update({ projects: filters.projects.filter((x) => x !== slug) }),
    });
  for (const slug of filters.hosts)
    chips.push({
      key: `h${slug}`,
      label: options.hostTeams.find((h) => h.slug === slug)?.name ?? slug,
      remove: () => update({ hosts: filters.hosts.filter((x) => x !== slug) }),
    });
  for (const w of filters.weeks)
    chips.push({ key: `w${w}`, label: `About ${w} weeks`, remove: () => update({ weeks: filters.weeks.filter((x) => x !== w) }) });
  if (filters.meals) chips.push({ key: "meals", label: "Meals confirmed", remove: () => update({ meals: false }) });

  const panel = <FilterPanel filters={live} options={options} counts={counts} onChange={update} />;

  return (
    <div>
      <div id="search" className="scroll-mt-24 rounded-3xl border border-border bg-card p-4 shadow-[0_8px_30px_-20px_rgba(27,36,48,0.35)] sm:p-5">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters((f) => ({ ...f, q: query }));
            resultsRef.current?.focus();
          }}
          className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto] md:items-end"
        >
          <div>
            <label htmlFor="keyword" className="mb-1.5 block text-sm font-semibold text-ink">
              What are you looking for?
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                id="keyword"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(PAGE_SIZE);
                }}
                placeholder="Try “turtles”, “teaching”, Kandy or a project"
                className="h-12 w-full rounded-xl border border-input bg-card pr-3 pl-10 text-[0.95rem] text-ink shadow-xs placeholder:text-subtle focus-visible:border-primary"
              />
            </div>
          </div>
          <DateRangePicker
            id="travel-dates"
            label="When can you go?"
            from={filters.from}
            to={filters.to}
            today={today}
            onChange={(from, to) => update({ from, to })}
          />
          <button type="submit" className="hidden h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 md:inline-flex">
            Search
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[18.5rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2 pb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-base font-semibold text-ink">Filters</h2>
              {activeCount > 0 && (
                <button type="button" onClick={clearAll} className="text-sm font-semibold text-primary hover:underline">
                  Clear all
                </button>
              )}
            </div>
            {panel}
          </div>
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="results-heading" ref={resultsRef} tabIndex={-1} className="font-sans text-lg font-semibold text-ink outline-none" aria-live="polite">
                {plural(results.length, "opportunity", "opportunities")}
                {activeCount === 0 ? "" : " match"}
              </h2>
              {results.length > 0 && results.length > limit && (
                <p className="text-sm text-muted-foreground">Showing the first {Math.min(limit, results.length)}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger className="inline-flex h-11 items-center gap-2 rounded-xl border border-input bg-card px-4 text-sm font-semibold text-ink shadow-xs lg:hidden">
                  <SlidersHorizontal className="size-4" aria-hidden />
                  Filters
                  {activeCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground">{activeCount}</span>
                  )}
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[88dvh] rounded-t-3xl bg-card" showCloseButton>
                  <SheetHeader className="border-b border-border">
                    <SheetTitle className="font-heading text-lg">Filters</SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto px-4 pb-2">{panel}</div>
                  <SheetFooter className="flex-row border-t border-border">
                    <button type="button" onClick={clearAll} className="h-12 flex-1 rounded-xl border border-input font-semibold text-ink">
                      Clear all
                    </button>
                    <SheetClose className="h-12 flex-[1.4] rounded-xl bg-primary font-semibold text-primary-foreground">
                      Show {plural(results.length, "result")}
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
              <label htmlFor="sort" className="sr-only">
                Sort by
              </label>
              <select
                id="sort"
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value as SortKey })}
                className="h-11 rounded-xl border border-input bg-card px-3 text-sm font-medium text-ink shadow-xs"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    onClick={chip.remove}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card pr-2 pl-3 text-sm text-ink hover:border-primary/40"
                    aria-label={`Remove filter: ${chip.label}`}
                  >
                    {chip.label}
                    <X className="size-3.5 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={clearAll} className="h-8 px-2 text-sm font-semibold text-primary hover:underline">
                  Clear all
                </button>
              </li>
            </ul>
          )}

          {hasDateCriteria(live) && !filters.flexible && unknownDates.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#e9d9b4] bg-[#fbf6ea] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex gap-2.5 text-sm text-ink">
                <CalendarSearch className="mt-0.5 size-4 shrink-0 text-[#8a6417]" aria-hidden />
                <span>
                  {plural(unknownDates.length, "more listing")} {unknownDates.length === 1 ? "has" : "have"} flexible or unlisted dates,
                  so we can&rsquo;t tell whether {unknownDates.length === 1 ? "it fits" : "they fit"} your dates.
                </span>
              </p>
              <button
                type="button"
                onClick={() => update({ flexible: true })}
                className="h-10 shrink-0 rounded-xl border border-[#d8c08a] bg-card px-4 text-sm font-semibold text-ink hover:border-[#8a6417]"
              >
                Show them too
              </button>
            </div>
          )}

          {results.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-input bg-card/60 px-6 py-14 text-center">
              <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 font-heading text-xl font-semibold text-ink">No opportunities match all of that</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Try a wider date range, fewer filters or a different word.
                {hasDateCriteria(live) && unknownDates.length > 0 && " Some listings with flexible dates might still fit."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {(filters.from || filters.to) && (
                  <button type="button" onClick={() => update({ from: null, to: null })} className="h-10 rounded-xl border border-input bg-card px-4 text-sm font-semibold text-ink">
                    Any dates
                  </button>
                )}
                {hasDateCriteria(live) && unknownDates.length > 0 && (
                  <button type="button" onClick={() => update({ flexible: true })} className="h-10 rounded-xl border border-input bg-card px-4 text-sm font-semibold text-ink">
                    Include flexible dates
                  </button>
                )}
                <button type="button" onClick={clearAll} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
                  Clear all filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {results.slice(0, limit).map((o) => (
                  <li key={o.id}>
                    <OpportunityCard opportunity={o} today={today} filters={live} returnTo={returnTo} />
                  </li>
                ))}
              </ul>
              {results.length > limit && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                    className="h-12 rounded-xl border border-input bg-card px-6 font-semibold text-ink shadow-xs hover:border-primary/40"
                  >
                    Show {Math.min(PAGE_SIZE, results.length - limit)} more
                  </button>
                  <p className="text-sm text-muted-foreground">
                    {Math.min(limit, results.length)} of {results.length} shown
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}


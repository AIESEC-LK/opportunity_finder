"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { SdgIcon } from "@/components/sdgs/sdg-icon";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface GoalTile {
  number: number;
  slug: string;
  name: string;
  statement: string;
  color: string;
  projectCount: number;
  opportunityCount: number;
}

interface SdgGridProps {
  goals: GoalTile[];
  totalOpportunities: number;
  /** Show the search box and "only goals with projects" toggle. */
  searchable?: boolean;
  headingLevel?: "h2" | "h3";
}

export function SdgGrid({ goals, totalOpportunities, searchable = true, headingLevel: Heading = "h3" }: SdgGridProps) {
  const [query, setQuery] = useState("");
  const [onlyListed, setOnlyListed] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return goals.filter((g) => {
      if (onlyListed && g.projectCount === 0) return false;
      if (!q) return true;
      return `${g.number} sdg ${g.number} ${g.name} ${g.statement}`.toLowerCase().includes(q);
    });
  }, [goals, query, onlyListed]);

  const listed = goals.filter((g) => g.projectCount > 0).length;

  return (
    <div className="space-y-5">
      {searchable && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="goal-search" className="sr-only">
              Search the goals by name
            </label>
            <input
              id="goal-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search goals, e.g. education, ocean, climate"
              className="h-11 w-full rounded-xl border border-input bg-card pr-3 pl-10 text-[0.95rem] shadow-xs placeholder:text-subtle focus-visible:border-primary"
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink select-none">
            <input
              type="checkbox"
              checked={onlyListed}
              onChange={(e) => setOnlyListed(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Only goals with projects ({listed} of 17)
          </label>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {plural(visible.length, "goal")} shown
      </p>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-input bg-card/60 px-6 py-10 text-center">
          <p className="font-medium text-ink">No goals match &ldquo;{query}&rdquo;.</p>
          <button type="button" onClick={() => setQuery("")} className="mt-2 text-sm font-semibold text-primary hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {visible.map((goal) => {
            const empty = goal.projectCount === 0;
            return (
              <li key={goal.number}>
                <Link
                  href={`/sdgs/${goal.slug}`}
                  className={cn(
                    "group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(27,36,48,0.25)]",
                    empty ? "border-dashed border-input bg-card/50" : "border-border",
                  )}
                >
                  <SdgIcon goal={goal.number} size={200} className="aspect-square h-auto w-full rounded-none" />
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <Heading className="font-sans text-[0.8rem] leading-snug font-semibold text-ink">
                      <span className="sr-only">Goal {goal.number}: </span>
                      {goal.name}
                    </Heading>
                    {empty ? (
                      <p className="mt-auto text-xs text-muted-foreground">No projects listed</p>
                    ) : (
                      <p className="mt-auto flex items-end gap-1.5 text-xs text-muted-foreground">
                        <span className="mb-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: goal.color }} aria-hidden />
                        <span>
                          <span className="block font-semibold text-ink">{plural(goal.opportunityCount, "opportunity", "opportunities")}</span>
                          {plural(goal.projectCount, "project")}
                        </span>
                        <ArrowRight className="mb-0.5 ml-auto size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
          {!query && !onlyListed && (
            <li>
              <Link
                href="/opportunities"
                className="group flex h-full min-h-40 flex-col justify-between rounded-2xl bg-ink p-4 text-white transition-colors hover:bg-[#25313f]"
              >
                <span className="font-heading text-lg leading-tight font-semibold">Browse every opportunity</span>
                <span className="flex items-center justify-between text-sm text-white/80">
                  {plural(totalOpportunities, "listing")}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

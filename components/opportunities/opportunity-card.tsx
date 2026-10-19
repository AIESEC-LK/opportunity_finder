import Link from "next/link";
import { ArrowRight, BedDouble, CalendarDays, MapPin, UtensilsCrossed } from "lucide-react";
import { SdgIcon } from "@/components/sdgs/sdg-icon";
import { type Filters, matchingRanges } from "@/lib/filters";
import { formatRange } from "@/lib/format";
import { getSdg } from "@/lib/sdgs";
import type { OpportunitySummary } from "@/lib/summary";
import type { ISODate } from "@/types/domain";

export const TYPE_LABEL = { IGV: "Global Volunteer", IGT: "Global Talent" } as const;

interface OpportunityCardProps {
  opportunity: OpportunitySummary;
  today: ISODate;
  filters?: Pick<Filters, "from" | "to" | "weeks">;
  /** Query string to carry back from the detail page. */
  returnTo?: string;
  headingLevel?: "h2" | "h3";
  /** Show only ranges starting on or after this date, labelled "Starts". */
  startsFrom?: ISODate;
}

function DateLine({ opportunity, today, filters, startsFrom }: Pick<OpportunityCardProps, "opportunity" | "today" | "filters" | "startsFrom">) {
  const criteria = filters ?? { from: null, to: null, weeks: [] };
  const ranges = startsFrom ? opportunity.dates.ranges.filter((r) => r.start >= startsFrom) : matchingRanges(opportunity, criteria, today);
  const searching = Boolean(criteria.from || criteria.to || criteria.weeks.length);

  if (ranges.length) {
    const first = ranges[0];
    const label = startsFrom ? "Starts" : searching ? "Matches" : first.start <= today ? "Running" : "Next";
    return (
      <p className="flex items-start gap-2 text-sm text-ink">
        <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          <span className="text-muted-foreground">{label}: </span>
          <span className="font-semibold">
            {first.precision === "month" ? "Within " : ""}
            {formatRange(first)}
          </span>
          {ranges.length > 1 && <span className="text-muted-foreground"> · +{ranges.length - 1} more</span>}
        </span>
      </p>
    );
  }

  const message = opportunity.dates.flexible
    ? "Flexible dates — ask the host team"
    : opportunity.dates.ranges.length
      ? "Listed dates have passed"
      : "Dates not listed";
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function OpportunityCard({ opportunity, today, filters, returnTo, startsFrom, headingLevel: Heading = "h3" }: OpportunityCardProps) {
  const goal = opportunity.goals[0];
  const sdg = goal ? getSdg(goal) : undefined;
  const weeks = [...new Set(opportunity.dates.ranges.map((r) => r.weeks).filter((w): w is number => w !== null))];
  const { meals, accommodation } = opportunity.provisions;
  const href = `/opportunities/${opportunity.id}${returnTo ? `?back=${encodeURIComponent(returnTo)}` : ""}`;

  return (
    <article
      className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-[box-shadow,border-color] duration-200 focus-within:border-primary/50 hover:border-[color-mix(in_oklab,var(--border),var(--ink)_15%)] hover:shadow-[0_12px_32px_-16px_rgba(27,36,48,0.3)]"
    >
      {sdg && <span aria-hidden className="absolute inset-x-5 top-0 h-[3px] rounded-b-full" style={{ backgroundColor: sdg.color }} />}
      <div className="flex items-start gap-3">
        {goal && <SdgIcon goal={goal} size={40} decorative className="mt-0.5" />}
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {opportunity.projectName}
            {sdg && <span className="font-medium normal-case"> · SDG {opportunity.sdgTarget ?? sdg.number}</span>}
          </p>
          <Heading className="mt-1 text-lg leading-snug font-semibold text-ink">
            <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring">
              {opportunity.title}
            </Link>
          </Heading>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="flex items-start gap-2 text-sm text-ink">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            {opportunity.country}
            {opportunity.hostTeam && <span className="text-muted-foreground"> · {opportunity.hostTeam.name}</span>}
          </span>
        </p>
        <DateLine opportunity={opportunity} today={today} filters={filters} startsFrom={startsFrom} />
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5 text-xs" aria-label="Key facts">
        <li className="rounded-md bg-accent px-2 py-1 font-semibold text-accent-foreground">{TYPE_LABEL[opportunity.type]}</li>
        {weeks.length > 0 && (
          <li className="rounded-md bg-muted px-2 py-1 font-medium text-ink">
            {weeks.length === 1 ? `${weeks[0]} weeks` : `${Math.min(...weeks)}–${Math.max(...weeks)} weeks`}
          </li>
        )}
        {meals.status === "included" && (
          <li className="inline-flex items-center gap-1 rounded-md bg-included-soft px-2 py-1 font-medium text-included">
            <UtensilsCrossed className="size-3.5" aria-hidden />
            {meals.detail ? meals.detail.replace(/^./, (c) => c.toUpperCase()) : "Meals provided"}
          </li>
        )}
        {meals.status === "not_included" && (
          <li className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground">
            <UtensilsCrossed className="size-3.5" aria-hidden />
            Meals not included
          </li>
        )}
        {accommodation.status === "included" ? (
          <li className="inline-flex items-center gap-1 rounded-md bg-included-soft px-2 py-1 font-medium text-included">
            <BedDouble className="size-3.5" aria-hidden />
            Accommodation provided
          </li>
        ) : (
          accommodation.hasPhotos && (
            <li className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium text-ink">
              <BedDouble className="size-3.5 text-muted-foreground" aria-hidden />
              Accommodation photos
            </li>
          )
        )}
      </ul>

      <p className="mt-auto flex items-center gap-1 pt-5 text-sm font-semibold text-primary" aria-hidden>
        View details
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </p>
    </article>
  );
}

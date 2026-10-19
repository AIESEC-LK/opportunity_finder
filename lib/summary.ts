import type { DateRange, Opportunity, ProvisionStatus } from "@/types/domain";
import type { Filterable } from "@/lib/filters";

/** What a card and the search page need; full records stay on the server. */
export interface OpportunitySummary extends Filterable {
  dates: { ranges: Pick<DateRange, "start" | "end" | "weeks" | "precision">[]; flexible: boolean };
  provisions: {
    meals: { status: ProvisionStatus; detail?: string };
    accommodation: { status: ProvisionStatus; hasPhotos: boolean };
  };
}

export function toSummary(o: Opportunity): OpportunitySummary {
  return {
    id: o.id,
    expaId: o.expaId,
    title: o.title,
    type: o.type,
    projectName: o.projectName,
    projectSlug: o.projectSlug,
    sdgTarget: o.sdgTarget,
    goals: o.goals,
    hostTeam: o.hostTeam,
    country: o.country,
    booklet: o.booklet ? { label: o.booklet.label } : null,
    dates: {
      ranges: o.dates.ranges.map(({ start, end, weeks, precision }) => ({ start, end, weeks, precision })),
      flexible: o.dates.flexible,
    },
    provisions: {
      meals: { status: o.provisions.meals.status, detail: o.provisions.meals.detail },
      accommodation: { status: o.provisions.accommodation.status, hasPhotos: Boolean(o.provisions.accommodation.link) },
    },
  };
}

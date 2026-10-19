import type { Contact, Dataset, ISODate, Opportunity, Project } from "@/types/domain";
import { SDGS, type Sdg } from "@/lib/sdgs";
import { upcomingRanges } from "@/lib/filters";

/** Read-only lookups over a loaded dataset. Counts are always computed from records. */

export interface GoalSummary {
  goal: Sdg;
  projects: Project[];
  opportunityCount: number;
}

export function projectsForGoal(dataset: Dataset, goal: number): Project[] {
  return dataset.projects.filter((p) => p.goals.includes(goal));
}

export function goalSummaries(dataset: Dataset): GoalSummary[] {
  return SDGS.map((goal) => {
    const projects = projectsForGoal(dataset, goal.number);
    const ids = new Set(projects.flatMap((p) => p.opportunityIds));
    return { goal, projects, opportunityCount: ids.size };
  });
}

export function findOpportunity(dataset: Dataset, id: string): Opportunity | undefined {
  return dataset.opportunities.find((o) => o.id === id);
}

export function findProject(dataset: Dataset, slug: string): Project | undefined {
  return dataset.projects.find((p) => p.slug === slug);
}

export function opportunitiesForProject(dataset: Dataset, project: Project): Opportunity[] {
  const ids = new Set(project.opportunityIds);
  return dataset.opportunities.filter((o) => ids.has(o.id));
}

export function contactFor(dataset: Dataset, hostTeamCode: string | undefined): Contact | undefined {
  if (!hostTeamCode) return undefined;
  return dataset.contacts.find((c) => c.hostTeamCode.toLowerCase() === hostTeamCode.toLowerCase());
}

/** Distinct upcoming start dates across a set of opportunities. */
export function upcomingCount(opportunities: Opportunity[], today: ISODate): number {
  return opportunities.filter((o) => upcomingRanges(o, today).length > 0).length;
}

export function soonestStart(opportunities: Opportunity[], today: ISODate): ISODate | null {
  let best: ISODate | null = null;
  for (const o of opportunities) {
    for (const r of upcomingRanges(o, today)) {
      const start = r.start < today ? today : r.start;
      if (!best || start < best) best = start;
    }
  }
  return best;
}

/** Opportunities with a listed date that starts on or after today, soonest first. */
export function startingSoon(dataset: Dataset, today: ISODate, limit: number): { opportunity: Opportunity; start: ISODate }[] {
  return dataset.opportunities
    .map((opportunity) => ({ opportunity, start: opportunity.dates.ranges.find((r) => r.start >= today)?.start }))
    .filter((x): x is { opportunity: Opportunity; start: ISODate } => Boolean(x.start))
    .sort((a, b) => a.start.localeCompare(b.start) || a.opportunity.title.localeCompare(b.opportunity.title))
    .slice(0, limit);
}

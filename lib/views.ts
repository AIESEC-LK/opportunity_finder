import type { FilterOptions } from "@/components/opportunities/filter-panel";
import type { ProjectCardModel } from "@/components/projects/project-card";
import type { GoalTile } from "@/components/sdgs/sdg-grid";
import { goalSummaries, opportunitiesForProject, soonestStart, upcomingCount } from "@/lib/catalog";
import { durationOptions } from "@/lib/filters";
import type { Dataset, ISODate, Project } from "@/types/domain";

export function projectCard(dataset: Dataset, project: Project, today: ISODate): ProjectCardModel {
  const opportunities = opportunitiesForProject(dataset, project);
  return {
    slug: project.slug,
    name: project.name,
    goals: project.goals,
    targets: project.targets,
    opportunityCount: opportunities.length,
    hostTeamCount: project.hostTeamCodes.length,
    upcomingCount: upcomingCount(opportunities, today),
    soonestStart: soonestStart(opportunities, today),
    flexibleCount: opportunities.filter((o) => o.dates.flexible).length,
  };
}

export function goalTiles(dataset: Dataset): GoalTile[] {
  return goalSummaries(dataset).map(({ goal, projects, opportunityCount }) => ({
    number: goal.number,
    slug: goal.slug,
    name: goal.name,
    statement: goal.statement,
    color: goal.color,
    projectCount: projects.length,
    opportunityCount,
  }));
}

export function filterOptions(dataset: Dataset): FilterOptions {
  return {
    goals: [...new Set(dataset.opportunities.flatMap((o) => o.goals))].sort((a, b) => a - b),
    projects: dataset.projects.map((p) => ({ slug: p.slug, name: p.name })),
    hostTeams: dataset.hostTeams,
    durations: durationOptions(dataset.opportunities),
    types: [...new Set(dataset.opportunities.map((o) => o.type))].sort(),
  };
}

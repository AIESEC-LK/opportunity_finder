import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectOpportunities } from "@/components/projects/project-opportunities";
import { SdgIcon } from "@/components/sdgs/sdg-icon";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SourceUnavailable } from "@/components/states/source-unavailable";
import { findProject, opportunitiesForProject } from "@/lib/catalog";
import { loadDataset } from "@/lib/data/load";
import { DEFAULT_FILTERS, parseFilters, sortOpportunities, upcomingRanges } from "@/lib/filters";
import { todayISO } from "@/lib/format";
import { getSdg } from "@/lib/sdgs";
import { toSummary } from "@/lib/summary";

export async function generateMetadata({ params }: PageProps<"/projects/[projectSlug]">): Promise<Metadata> {
  const result = await loadDataset();
  const project = result.ok ? findProject(result.dataset, (await params).projectSlug) : undefined;
  return { title: project ? `${project.name} project` : "Project" };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[projectSlug]">) {
  const { projectSlug } = await params;
  const dateFilters = parseFilters(await searchParams);
  const result = await loadDataset();
  if (!result.ok) return <SourceUnavailable />;
  const { dataset } = result;
  const project = findProject(dataset, projectSlug);
  if (!project) notFound();

  const today = todayISO();
  const opportunities = sortOpportunities(opportunitiesForProject(dataset, project).map(toSummary), DEFAULT_FILTERS, today);
  const upcoming = opportunities.filter((o) => upcomingRanges(o, today).length > 0).length;
  const firstGoal = project.goals[0] ? getSdg(project.goals[0]) : undefined;

  return (
    <div>
      <div className="border-b border-border" style={firstGoal ? { backgroundColor: `color-mix(in oklab, ${firstGoal.color} 8%, var(--paper))` } : undefined}>
        <div className="container-page py-8 sm:py-12">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              ...(firstGoal ? [{ label: `SDG ${firstGoal.number}`, href: `/sdgs/${firstGoal.slug}` }] : [{ label: "SDGs", href: "/sdgs" }]),
              { label: project.name },
            ]}
          />
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Project</p>
              <h1 className="mt-1 text-4xl font-semibold text-ink sm:text-5xl">{project.name}</h1>
              <ul className="mt-4 flex flex-wrap gap-3">
                {project.goals.map((g) => {
                  const sdg = getSdg(g)!;
                  const target = project.targets.find((t) => t.startsWith(`${g}.`));
                  return (
                    <li key={g}>
                      <Link href={`/sdgs/${sdg.slug}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2 pr-4 hover:border-ink/25">
                        <SdgIcon goal={g} size={44} decorative />
                        <span className="text-sm">
                          <span className="block font-semibold text-ink">
                            SDG {g}
                            {target && <span className="font-normal text-muted-foreground"> · Target {target}</span>}
                          </span>
                          <span className="text-muted-foreground">{sdg.name}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {project.goals.length === 0 && <li className="text-sm text-muted-foreground">No SDG is listed for this project.</li>}
              </ul>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-center lg:min-w-96">
              {[
                ["Opportunities", opportunities.length],
                ["Entities", project.hostTeamCodes.length],
                ["With upcoming dates", upcoming],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse rounded-2xl border border-border bg-card px-3 py-4">
                  <dt className="mt-1 text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-heading text-3xl font-semibold text-ink tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <div className="container-page py-10">
        <ProjectOpportunities
          opportunities={opportunities}
          projectName={project.name}
          today={today}
          initialFilters={{ from: dateFilters.from, to: dateFilters.to, flexible: dateFilters.flexible }}
        />
      </div>
    </div>
  );
}

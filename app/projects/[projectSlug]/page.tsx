import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarSearch } from "lucide-react";
import { StatusPill } from "@/components/logistics/status";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { SdgIcon } from "@/components/sdgs/sdg-icon";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SourceUnavailable } from "@/components/states/source-unavailable";
import { findProject, opportunitiesForProject } from "@/lib/catalog";
import { loadDataset } from "@/lib/data/load";
import { DEFAULT_FILTERS, sortOpportunities, upcomingRanges } from "@/lib/filters";
import { formatRange, plural, todayISO } from "@/lib/format";
import { getSdg } from "@/lib/sdgs";
import { toSummary } from "@/lib/summary";

export async function generateMetadata({ params }: PageProps<"/projects/[projectSlug]">): Promise<Metadata> {
  const result = await loadDataset();
  const project = result.ok ? findProject(result.dataset, (await params).projectSlug) : undefined;
  return { title: project ? `${project.name} project` : "Project" };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[projectSlug]">) {
  const { projectSlug } = await params;
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
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-sans text-xl font-semibold text-ink">Compare the opportunities</h2>
          <Link
            href={`/opportunities?project=${project.slug}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <CalendarSearch className="size-4" aria-hidden />
            Search by your dates
          </Link>
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              {plural(opportunities.length, "opportunity", "opportunities")} in the {project.name} project
            </caption>
            <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Opportunity</th>
                <th scope="col" className="px-4 py-3 font-semibold">Upcoming dates</th>
                <th scope="col" className="px-4 py-3 font-semibold">Length</th>
                <th scope="col" className="px-4 py-3 font-semibold">Meals</th>
                <th scope="col" className="px-4 py-3 font-semibold">Accommodation</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {opportunities.map((o) => {
                const next = upcomingRanges(o, today);
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
          {opportunities.map((o) => (
            <li key={o.id}>
              <OpportunityCard opportunity={o} today={today} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ProjectList } from "@/components/projects/project-list";
import { SdgIcon } from "@/components/sdgs/sdg-icon";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SourceUnavailable } from "@/components/states/source-unavailable";
import { projectsForGoal } from "@/lib/catalog";
import { loadDataset } from "@/lib/data/load";
import { plural, todayISO } from "@/lib/format";
import { getSdg, getSdgBySlug } from "@/lib/sdgs";
import { goalTiles, projectCard } from "@/lib/views";

export async function generateMetadata({ params }: PageProps<"/sdgs/[sdgSlug]">): Promise<Metadata> {
  const goal = getSdgBySlug((await params).sdgSlug);
  return goal ? { title: `SDG ${goal.number}: ${goal.name}`, description: goal.statement } : { title: "Goal not found" };
}

export default async function SdgPage({ params }: PageProps<"/sdgs/[sdgSlug]">) {
  const goal = getSdgBySlug((await params).sdgSlug);
  if (!goal) notFound();

  const result = await loadDataset();
  if (!result.ok) return <SourceUnavailable />;
  const { dataset } = result;
  const today = todayISO();
  const projects = projectsForGoal(dataset, goal.number).map((p) => projectCard(dataset, p, today));
  const opportunityCount = new Set(projectsForGoal(dataset, goal.number).flatMap((p) => p.opportunityIds)).size;
  const otherGoals = goalTiles(dataset).filter((t) => t.projectCount > 0 && t.number !== goal.number);
  const prev = getSdg(goal.number - 1);
  const next = getSdg(goal.number + 1);

  return (
    <div>
      <div className="border-b border-border" style={{ backgroundColor: `color-mix(in oklab, ${goal.color} 9%, var(--paper))` }}>
        <div className="container-page py-8 sm:py-12">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "SDGs", href: "/sdgs" }, { label: `Goal ${goal.number}` }]} />
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <SdgIcon goal={goal.number} size={132} priority className="shadow-sm" />
            <div className="max-w-2xl">
              <p className="text-sm font-semibold" style={{ color: `color-mix(in oklab, ${goal.color} 75%, black)` }}>
                Sustainable Development Goal {goal.number}
              </p>
              <h1 className="mt-1 text-4xl font-semibold text-ink sm:text-5xl">{goal.name}</h1>
              <p className="mt-3 text-lg text-muted-foreground">{goal.statement}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-10">
        {projects.length > 0 ? (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-sans text-xl font-semibold text-ink">
                  {plural(projects.length, "project")} · {plural(opportunityCount, "opportunity", "opportunities")}
                </h2>
              </div>
              <Link
                href={`/opportunities?sdg=${goal.number}`}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Search these opportunities by date
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ProjectList projects={projects} />
          </>
        ) : (
          <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-input bg-card/60 px-6 py-12 text-center">
            <h2 className="text-2xl font-semibold text-ink">No projects are listed for this goal yet</h2>
            <p className="mt-2 text-muted-foreground">Try one of these goals instead.</p>
            <ul className="mt-6 flex flex-wrap justify-center gap-2">
              {otherGoals.map((g) => (
                <li key={g.number}>
                  <Link href={`/sdgs/${g.slug}`} title={`SDG ${g.number}: ${g.name}`} className="block rounded-lg transition-transform hover:-translate-y-0.5">
                    <SdgIcon goal={g.number} size={56} />
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/opportunities" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Browse all opportunities
            </Link>
          </div>
        )}

        <nav aria-label="Other goals" className="mt-14 flex items-center justify-between gap-4 border-t border-border pt-6 text-sm">
          {prev ? (
            <Link href={`/sdgs/${prev.slug}`} className="font-semibold text-ink hover:text-primary">
              ← Goal {prev.number}: {prev.name}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/sdgs/${next.slug}`} className="text-right font-semibold text-ink hover:text-primary">
              Goal {next.number}: {next.name} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </div>
  );
}

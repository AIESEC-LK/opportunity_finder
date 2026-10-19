import Link from "next/link";
import { ArrowRight, CalendarDays, Users } from "lucide-react";
import { SdgIcon } from "@/components/sdgs/sdg-icon";
import { formatDate, plural } from "@/lib/format";
import { getSdg } from "@/lib/sdgs";

export interface ProjectCardModel {
  slug: string;
  name: string;
  goals: number[];
  targets: string[];
  opportunityCount: number;
  hostTeamCount: number;
  upcomingCount: number;
  soonestStart: string | null;
  flexibleCount: number;
}

export function ProjectCard({ project, headingLevel: Heading = "h3" }: { project: ProjectCardModel; headingLevel?: "h2" | "h3" }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(27,36,48,0.3)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading className="text-xl font-semibold text-ink">
            <Link href={`/projects/${project.slug}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-ring">
              {project.name}
            </Link>
          </Heading>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.goals.map((g) => `SDG ${project.targets.find((t) => t.startsWith(`${g}.`)) ?? g} · ${getSdg(g)?.name}`).join(", ") ||
              "SDG not specified"}
          </p>
        </div>
        <div className="flex shrink-0 -space-x-2">
          {project.goals.map((g) => (
            <SdgIcon key={g} goal={g} size={44} decorative className="ring-2 ring-card" />
          ))}
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-muted/70 p-3">
          <dt className="text-xs text-muted-foreground">Opportunities</dt>
          <dd className="mt-0.5 text-lg font-semibold text-ink tabular-nums">{project.opportunityCount}</dd>
        </div>
        <div className="rounded-xl bg-muted/70 p-3">
          <dt className="text-xs text-muted-foreground">Entities</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold text-ink tabular-nums">
            <Users className="size-4 text-muted-foreground" aria-hidden />
            {project.hostTeamCount}
          </dd>
        </div>
      </dl>
      <p className="mt-4 flex items-start gap-2 text-sm text-ink">
        <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        {project.soonestStart ? (
          <span>
            {plural(project.upcomingCount, "opportunity", "opportunities")} with upcoming dates · earliest{" "}
            <span className="font-semibold">{formatDate(project.soonestStart)}</span>
          </span>
        ) : project.flexibleCount ? (
          <span className="text-muted-foreground">{plural(project.flexibleCount, "listing")} with flexible dates</span>
        ) : (
          <span className="text-muted-foreground">No upcoming dates listed</span>
        )}
      </p>
      <p className="mt-auto flex items-center gap-1 pt-5 text-sm font-semibold text-primary" aria-hidden>
        See opportunities
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </p>
    </article>
  );
}

import Link from "next/link";
import { ArrowRight, ExternalLink, FileText } from "lucide-react";
import { HeroSearch } from "@/components/opportunities/hero-search";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { SdgGrid } from "@/components/sdgs/sdg-grid";
import { EntityLogoPanel } from "@/components/entities/entity-logo";
import { SdgIcon } from "@/components/sdgs/sdg-icon";
import { SourceUnavailable } from "@/components/states/source-unavailable";
import { startingSoon } from "@/lib/catalog";
import { loadDataset } from "@/lib/data/load";
import { plural, todayISO } from "@/lib/format";
import { toSummary } from "@/lib/summary";
import { goalTiles } from "@/lib/views";

export default async function HomePage() {
  const result = await loadDataset();
  if (!result.ok) return <SourceUnavailable />;
  const { dataset } = result;
  const today = todayISO();
  const tiles = goalTiles(dataset);
  const listedGoals = tiles.filter((t) => t.projectCount > 0);
  const soon = startingSoon(dataset, today, 6);
  const resources = dataset.resources.filter((r) => !/^contacts?$/i.test(r.label));
  const entities = dataset.hostTeams
    .map((team) => ({ team, count: dataset.opportunities.filter((o) => o.hostTeam?.slug === team.slug).length }))
    .sort((a, b) => a.team.name.localeCompare(b.team.name));
  const applyOnAiesec = dataset.opportunities.every((o) => !o.applicationUrl || new URL(o.applicationUrl).hostname.endsWith("aiesec.org"));

  return (
    <>
      <section className="border-b border-border">
        <div className="container-page grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <h1 className="text-[2.4rem] leading-[1.08] font-semibold text-ink sm:text-5xl lg:text-[3.5rem]">
              Find an opportunity that makes a difference.
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">Volunteer across Sri Lanka for the Global Goals.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/opportunities" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-white hover:bg-[#0757a8]">
                Explore opportunities
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="#goals" className="inline-flex h-12 items-center rounded-xl border border-input bg-card px-6 font-semibold text-ink hover:border-ink/30">
                Browse the SDGs
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <HeroSearch today={today} />
            {listedGoals.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Goals with projects">
                {listedGoals.map((g) => (
                  <li key={g.number}>
                    <Link href={`/sdgs/${g.slug}`} className="block rounded-lg transition-transform hover:-translate-y-0.5" title={`SDG ${g.number}: ${g.name}`}>
                      <SdgIcon goal={g.number} size={48} priority />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <Section id="goals" title="Start with a goal">
        <SdgGrid goals={tiles} totalOpportunities={dataset.opportunities.length} />
      </Section>

      {soon.length > 0 && (
        <Section
          id="soon"
          title="Starting soon"
          tinted
          action={
            <Link href={`/opportunities?from=${today}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              See all
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        >
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {soon.map(({ opportunity }) => (
              <li key={opportunity.id}>
                <OpportunityCard opportunity={toSummary(opportunity)} today={today} startsFrom={today} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="projects" title="Browse by project">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dataset.projects.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/projects/${p.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-3.5 pr-5 transition-colors hover:border-brand/40"
              >
                {p.goals[0] ? <SdgIcon goal={p.goals[0]} size={44} decorative /> : <span className="size-11 rounded-md bg-muted" />}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{p.name}</span>
                  <span className="block text-sm text-muted-foreground">{plural(p.opportunityIds.length, "opportunity", "opportunities")}</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="entities" title="Browse by entity" tinted>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {entities.map(({ team, count }) => (
            <li key={team.slug}>
              <Link
                href={`/opportunities?host=${team.slug}`}
                className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-3 pb-4 transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-[0_10px_30px_-18px_rgba(3,126,243,0.45)]"
              >
                <EntityLogoPanel team={team} />
                <span className="flex items-end justify-between gap-2 px-1">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink group-hover:text-primary">{team.name.replace(/^AIESEC in /, "")}</span>
                    <span className="block text-sm text-muted-foreground">{plural(count, "opportunity", "opportunities")}</span>
                  </span>
                  <ArrowRight className="mb-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <section className="container-page pt-20" aria-labelledby="before-heading">
        <div className="grid gap-10 rounded-3xl bg-gradient-to-br from-[#037ef3] to-[#0757a8] p-8 text-white sm:p-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 id="before-heading" className="text-3xl font-semibold">
              Before you apply
            </h2>
            <ol className="mt-6 space-y-4">
              {["Pick an opportunity", "Read the project booklet", applyOnAiesec ? "Apply on aiesec.org" : "Apply through the listing"].map(
                (step, i) => (
                  <li key={step} className="flex items-center gap-4 font-medium">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">{i + 1}</span>
                    {step}
                  </li>
                ),
              )}
            </ol>
          </div>
          {resources.length > 0 && (
            <ul className="grid content-start gap-2">
              {resources.map((r) => (
                <li key={r.url}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 font-medium text-white transition-colors hover:bg-white/20"
                  >
                    <FileText className="size-4 text-white/70" aria-hidden />
                    <span className="flex-1">{r.label}</span>
                    <ExternalLink className="size-4 text-white/60" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function Section({
  id,
  title,
  tinted,
  action,
  children,
}: {
  id: string;
  title: string;
  tinted?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`scroll-mt-20 py-20 ${tinted ? "border-y border-border bg-paper" : ""}`}>
      <div className="container-page">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
          <h2 id={`${id}-heading`} className="text-3xl font-semibold text-ink">
            {title}
          </h2>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

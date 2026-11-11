import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AtSign, BedDouble, BookOpen, CalendarDays, ExternalLink, FileText, Mail, MapPin, MessageCircle, UtensilsCrossed } from "lucide-react";
import { LogisticsPanel } from "@/components/logistics/logistics-panel";
import { StatusPill } from "@/components/logistics/status";
import { DatesSection } from "@/components/opportunities/dates-section";
import { TYPE_LABEL } from "@/components/opportunities/opportunity-card";
import { EntityMark } from "@/components/entities/entity-logo";
import { SdgIcon } from "@/components/sdgs/sdg-icon";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SourceUnavailable } from "@/components/states/source-unavailable";
import { contactFor, findOpportunity, findProject } from "@/lib/catalog";
import { loadDataset } from "@/lib/data/load";
import { parseFilters, toSearchParams, upcomingRanges } from "@/lib/filters";
import { formatRange, plural, todayISO } from "@/lib/format";
import { getSdg } from "@/lib/sdgs";
import type { Opportunity } from "@/types/domain";

export async function generateMetadata({ params }: PageProps<"/opportunities/[opportunityId]">): Promise<Metadata> {
  const result = await loadDataset();
  const opportunity = result.ok ? findOpportunity(result.dataset, (await params).opportunityId) : undefined;
  return opportunity
    ? { title: opportunity.title, description: `${opportunity.projectName} · ${opportunity.hostTeam?.name ?? opportunity.country}` }
    : { title: "Opportunity not found" };
}

function ApplyButton({ opportunity, className }: { opportunity: Opportunity; className?: string }) {
  if (!opportunity.applicationUrl) return null;
  const onAiesec = new URL(opportunity.applicationUrl).hostname.endsWith("aiesec.org");
  return (
    <a
      href={opportunity.applicationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 ${className ?? ""}`}
    >
      {onAiesec ? "Apply on aiesec.org" : "Open the opportunity"}
      <ExternalLink className="size-4" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <h2 id={id} className="mb-4 text-2xl font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function OpportunityPage({ params, searchParams }: PageProps<"/opportunities/[opportunityId]">) {
  const [{ opportunityId }, query, result] = await Promise.all([params, searchParams, loadDataset()]);
  if (!result.ok) return <SourceUnavailable />;
  const { dataset } = result;
  const opportunity = findOpportunity(dataset, opportunityId);
  if (!opportunity) notFound();

  const today = todayISO();
  const back = typeof query.back === "string" ? toSearchParams(parseFilters(new URLSearchParams(query.back))).toString() : null;
  const resultsHref = `/opportunities${back ? `?${back}` : ""}`;
  const project = findProject(dataset, opportunity.projectSlug);
  const siblings = project ? project.opportunityIds.length - 1 : 0;
  const contact = contactFor(dataset, opportunity.hostTeam?.code);
  const upcoming = upcomingRanges(opportunity, today);
  const resource = (pattern: RegExp) => dataset.resources.find((r) => pattern.test(r.label));
  const budget = resource(/budget/i);
  const planning = [resource(/visa/i), resource(/country booklet/i), resource(/country content/i)].filter((r) => r !== undefined);
  const { meals, accommodation } = opportunity.provisions;

  return (
    <div className="pb-24 lg:pb-0">
      <div className="border-b border-border bg-paper">
        <div className="container-page py-6 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Opportunities", href: resultsHref }, { label: opportunity.title }]} />
            {back !== null && (
              <Link href={resultsHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <ArrowLeft className="size-4" aria-hidden />
                Back to your results
              </Link>
            )}
          </div>
          <div className="mt-6 flex items-start gap-4">
            {opportunity.goals[0] && <SdgIcon goal={opportunity.goals[0]} size={64} className="hidden sm:block" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted-foreground">
                <Link href={`/projects/${opportunity.projectSlug}`} className="text-primary hover:underline">
                  {opportunity.projectName}
                </Link>{" "}
                · {TYPE_LABEL[opportunity.type]} ({opportunity.type === "IGV" ? "iGV" : "iGT"})
              </p>
              <h1 className="mt-1 text-3xl leading-tight font-semibold text-ink sm:text-[2.6rem]">{opportunity.title}</h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden />
                  {opportunity.location ?? opportunity.country}
                </span>
                {opportunity.hostTeam && <span>Hosted by {opportunity.hostTeam.name}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div className="min-w-0 space-y-16">
          <Section id="dates" title="Dates">
            <DatesSection dates={opportunity.dates} today={today} />
          </Section>

          <Section id="included" title="What's included?">
            <LogisticsPanel provisions={opportunity.provisions} budget={budget} />
          </Section>

          <Section id="project" title="About the project">
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-ink">{opportunity.projectName}</p>
                  <p className="text-sm text-muted-foreground">
                    {project ? `${plural(project.opportunityIds.length, "opportunity", "opportunities")} with ${plural(project.hostTeamCodes.length, "entity", "entities")}` : ""}
                  </p>
                </div>
                {siblings > 0 && (
                  <Link href={`/projects/${opportunity.projectSlug}`} className="text-sm font-semibold text-primary hover:underline">
                    Compare all {project!.opportunityIds.length} →
                  </Link>
                )}
              </div>
              {opportunity.description && (
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink">{opportunity.description}</p>
              )}
              {opportunity.goals.map((g) => {
                const sdg = getSdg(g)!;
                const target = opportunity.sdgTarget?.startsWith(`${g}.`) ? opportunity.sdgTarget : null;
                return (
                  <Link key={g} href={`/sdgs/${sdg.slug}`} className="flex items-center gap-4 rounded-xl bg-muted/60 p-3 hover:bg-muted">
                    <SdgIcon goal={g} size={56} decorative />
                    <span className="text-sm">
                      <span className="block font-semibold text-ink">
                        Goal {g}: {sdg.name}
                        {target && <span className="font-normal text-muted-foreground"> · Target {target}</span>}
                      </span>
                      <span className="text-muted-foreground">{sdg.statement}</span>
                    </span>
                  </Link>
                );
              })}
              {opportunity.booklet && (
                <div className="flex items-start gap-3 border-t border-border pt-4">
                  <BookOpen className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold text-ink">Project booklet</p>
                    {opportunity.booklet.url ? (
                      <a href={opportunity.booklet.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1.5 font-semibold text-primary hover:underline">
                        <span>Open the project booklet</span>
                        <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <p className="mt-1 text-muted-foreground">Ask the host team for a copy.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section id="before" title="Before you apply">
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                {opportunity.booklet
                  ? "Check the booklet for requirements, and confirm dates and costs with the host team."
                  : "Confirm requirements, dates and costs with the host team before you apply."}
              </p>
              {planning.length > 0 && (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {planning.map((r) => (
                    <li key={r.url}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 font-medium text-ink hover:border-ink/25">
                        <FileText className="size-4 text-muted-foreground" aria-hidden />
                        <span className="flex-1">{r.label}</span>
                        <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
        </div>

        <aside className="order-first lg:sticky lg:top-24 lg:order-none lg:self-start" aria-label="Summary">
          <div className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-[0_18px_50px_-34px_rgba(27,36,48,0.5)]">
            <dl className="space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-muted-foreground">Destination</dt>
                  <dd className="font-semibold text-ink">{opportunity.country}</dd>
                  {opportunity.hostTeam && (
                    <dd className="mt-2 flex items-center gap-2.5 text-muted-foreground">
                      <EntityMark team={opportunity.hostTeam} size={40} />
                      {opportunity.hostTeam.name}
                    </dd>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-muted-foreground">Next dates</dt>
                  <dd className="font-semibold text-ink">
                    {upcoming[0] ? `${upcoming[0].precision === "month" ? "Within " : ""}${formatRange(upcoming[0])}` : opportunity.dates.flexible ? "Flexible" : "None upcoming"}
                  </dd>
                  {upcoming.length > 1 && (
                    <dd>
                      <a href="#dates" className="text-primary hover:underline">
                        +{upcoming.length - 1} more {upcoming.length - 1 === 1 ? "date" : "dates"}
                      </a>
                    </dd>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <UtensilsCrossed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex flex-1 items-start justify-between gap-2">
                  <div>
                    <dt className="text-muted-foreground">Meals</dt>
                    {meals.detail && <dd className="font-semibold text-ink">{meals.detail}</dd>}
                  </div>
                  <dd>
                    <StatusPill status={meals.status} />
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <BedDouble className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex flex-1 items-start justify-between gap-2">
                  <div>
                    <dt className="text-muted-foreground">Accommodation</dt>
                    {accommodation.link && (
                      <dd>
                        <a href={accommodation.link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          See photos<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </dd>
                    )}
                  </div>
                  <dd>
                    <StatusPill status={accommodation.status} />
                  </dd>
                </div>
              </div>
            </dl>

            <div className="space-y-2 border-t border-border pt-5">
              {opportunity.applicationUrl ? (
                <ApplyButton opportunity={opportunity} className="w-full" />
              ) : (
                <p role="note" className="rounded-xl bg-muted px-4 py-3 text-sm text-ink">
                  <span className="font-semibold">No application link yet.</span> Contact the host team to apply.
                </p>
              )}
              {opportunity.booklet?.url && (
                <a
                  href={opportunity.booklet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-input font-semibold text-ink hover:border-ink/30"
                >
                  <BookOpen className="size-4" aria-hidden />
                  Read the booklet
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>

            {contact && (contact.email || contact.whatsapp || contact.instagram) && (
              <div className="space-y-2 border-t border-border pt-5 text-sm">
                <p className="font-semibold text-ink">Questions? Ask {opportunity.hostTeam?.name ?? "the host team"}</p>
                {contact.person && <p className="text-muted-foreground">{contact.person}</p>}
                <ul className="space-y-1.5">
                  {contact.email && (
                    <li>
                      <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 text-primary hover:underline">
                        <Mail className="size-4" aria-hidden />
                        {contact.email}
                      </a>
                    </li>
                  )}
                  {contact.whatsapp && (
                    <li className="inline-flex items-center gap-2 text-ink">
                      <MessageCircle className="size-4 text-muted-foreground" aria-hidden />
                      WhatsApp {contact.whatsapp}
                    </li>
                  )}
                  {contact.instagram?.url && (
                    <li>
                      <a href={contact.instagram.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                        <AtSign className="size-4" aria-hidden />
                        Instagram<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {opportunity.applicationUrl && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-paper/95 p-3 backdrop-blur lg:hidden">
          <div className="container-page flex items-center gap-3 px-0">
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-semibold text-ink">{opportunity.title}</p>
              <p className="truncate text-muted-foreground">{upcoming[0] ? formatRange(upcoming[0]) : opportunity.dates.flexible ? "Flexible dates" : opportunity.projectName}</p>
            </div>
            <ApplyButton opportunity={opportunity} className="shrink-0 px-5" />
          </div>
        </div>
      )}
    </div>
  );
}

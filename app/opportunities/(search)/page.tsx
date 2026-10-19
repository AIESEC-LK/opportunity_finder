import type { Metadata } from "next";
import { OpportunityExplorer } from "@/components/opportunities/opportunity-explorer";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SourceUnavailable } from "@/components/states/source-unavailable";
import { loadDataset } from "@/lib/data/load";
import { parseFilters } from "@/lib/filters";
import { todayISO } from "@/lib/format";
import { toSummary } from "@/lib/summary";
import { filterOptions } from "@/lib/views";

export const metadata: Metadata = {
  title: "Explore opportunities",
  description: "Search volunteer opportunities in Sri Lanka by dates, Sustainable Development Goal, project and host team.",
};

export default async function OpportunitiesPage({ searchParams }: PageProps<"/opportunities">) {
  const [result, params] = await Promise.all([loadDataset(), searchParams]);
  if (!result.ok) return <SourceUnavailable />;
  const { dataset } = result;

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Opportunities" }]} />
      <h1 className="mt-6 mb-8 text-4xl font-semibold text-ink">Explore opportunities</h1>
      <OpportunityExplorer
        opportunities={dataset.opportunities.map(toSummary)}
        options={filterOptions(dataset)}
        initialFilters={parseFilters(params)}
        today={todayISO()}
      />
    </div>
  );
}

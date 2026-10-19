import type { Metadata } from "next";
import { SdgGrid } from "@/components/sdgs/sdg-grid";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { SourceUnavailable } from "@/components/states/source-unavailable";
import { loadDataset } from "@/lib/data/load";
import { goalTiles } from "@/lib/views";

export const metadata: Metadata = {
  title: "Sustainable Development Goals",
  description: "Browse volunteer projects in Sri Lanka by the UN Sustainable Development Goal they support.",
};

export default async function SdgsPage() {
  const result = await loadDataset();
  if (!result.ok) return <SourceUnavailable />;
  const tiles = goalTiles(result.dataset);

  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Sustainable Development Goals" }]} />
      <h1 className="mt-6 mb-10 text-4xl font-semibold text-ink">The 17 Global Goals</h1>
      <SdgGrid goals={tiles} totalOpportunities={result.dataset.opportunities.length} headingLevel="h2" />
    </div>
  );
}

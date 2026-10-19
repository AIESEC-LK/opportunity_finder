/**
 * Fetches the live sheet and prints how it was normalised.
 * Run with: npm run inspect:source [-- --json]
 */
import { fetchDataset } from "@/lib/data/source";

async function main() {
  const dataset = await fetchDataset();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(dataset, null, 2));
    return;
  }

  const { opportunities, projects, diagnostics } = dataset;
  console.log(`Opportunities: ${opportunities.length}   Projects: ${projects.length}   Host teams: ${dataset.hostTeams.length}`);
  console.log("Tabs:", diagnostics.tabsRead.map((t) => `${t.name} (${t.role})`).join("; "));
  console.log(`Rows read: ${diagnostics.recordsRead}, duplicates merged: ${diagnostics.duplicatesMerged}`);
  console.log(`Skipped rows: ${diagnostics.skippedRows.length}, invalid URLs: ${diagnostics.invalidUrls.length}`);
  console.log(`Unparsed date fragments: ${diagnostics.unparsedDateFragments}`);
  console.log(`Meal rows not matched: ${diagnostics.supplementaryUnmatched.length}`);
  console.log("\nProjects:");
  for (const p of projects) {
    console.log(`  ${p.name.padEnd(18)} goals=${p.goals.join(",") || "-"} targets=${p.targets.join(",") || "-"} opps=${p.opportunityIds.length}`);
  }
  const count = (fn: (o: (typeof opportunities)[number]) => boolean) => opportunities.filter(fn).length;
  console.log("\nDates: with ranges", count((o) => o.dates.ranges.length > 0), "flexible", count((o) => o.dates.flexible), "none", count((o) => !o.dates.ranges.length && !o.dates.flexible));
  console.log("Titles:", ["link-text", "booklet", "fallback"].map((s) => `${s}=${count((o) => o.titleSource === s)}`).join(" "));
  console.log("Apply link:", count((o) => Boolean(o.applicationUrl)), "of", opportunities.length);
  for (const key of ["accommodation", "meals"] as const) {
    console.log(`${key}:`, ["included", "not_included", "not_specified"].map((s) => `${s}=${count((o) => o.provisions[key].status === s)}`).join(" "));
  }
  if (process.argv.includes("--verbose")) {
    for (const o of opportunities) {
      console.log(`\n[${o.id}] ${o.title}  (${o.titleSource}) | ${o.projectName} | ${o.hostTeam?.code ?? "-"} | SDG ${o.sdgTarget ?? "-"}`);
      console.log(`   meals=${o.provisions.meals.status}${o.provisions.meals.detail ? ` (${o.provisions.meals.detail})` : ""} accommodation=${o.provisions.accommodation.status}`);
      for (const s of o.dates.slotTexts) console.log(`   ${s.label}: ${s.text.replace(/\s+/g, " ").slice(0, 160)}`);
      console.log(`   -> ${o.dates.ranges.map((r) => `${r.start}..${r.end}${r.precision === "month" ? "(m)" : ""}`).join("  ") || "(no ranges)"}${o.dates.flexible ? "  [flexible]" : ""}`);
      if (o.dates.unparsed.length) console.log(`   ?? ${o.dates.unparsed.join(" / ")}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

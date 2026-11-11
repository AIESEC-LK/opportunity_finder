/**
 * Saves the data only the Google Sheet has, so it survives the move to EXPA.
 * Run with: npm run archive:sheet
 *
 * - content/sheet-archive/opportunity-extras.json (committed): booklet and
 *   accommodation-photo links, flexible-dates notes, the sheet's own title and
 *   SDG target, keyed by opportunity id. Public links only, no personal data.
 * - .plans/expa-v2/contacts-archive.json (local only, git-ignored): the
 *   Contact Sheet tab. It holds members' names and numbers, and the repo is
 *   public, so it must never be committed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Opportunity } from "@/types/domain";
import { fetchDataset, sourceConfig } from "@/lib/data/source";

const EXTRAS_PATH = "content/sheet-archive/opportunity-extras.json";
const CONTACTS_PATH = ".plans/expa-v2/contacts-archive.json";

/** Google adds the sharer's account id (ouid) and tracking flags; the link works without them. */
const TRACKING_PARAMS = ["ouid", "usp", "rtpof", "sd"];

function cleanLink(url: string | null | undefined): string | null {
  if (!url) return null;
  const parsed = new URL(url);
  for (const param of TRACKING_PARAMS) parsed.searchParams.delete(param);
  return parsed.toString();
}

function extrasOf(o: Opportunity) {
  return {
    title: o.title,
    project: o.projectName,
    hostTeam: o.hostTeam?.code ?? null,
    sdgTarget: o.sdgTarget,
    booklet: o.booklet ? { label: o.booklet.label, url: cleanLink(o.booklet.url) } : null,
    accommodationPhotos: cleanLink(o.provisions.accommodation.link?.url),
    flexibleDates: o.dates.flexible,
    slotText: o.dates.slotTexts,
  };
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  process.env.DATA_SOURCE = "sheet";
  const dataset = await fetchDataset();
  const archivedAt = new Date().toISOString().slice(0, 10);
  const opportunities = Object.fromEntries(
    [...dataset.opportunities].sort((a, b) => a.id.localeCompare(b.id)).map((o) => [o.id, extrasOf(o)]),
  );

  writeJson(EXTRAS_PATH, { source: sourceConfig().viewUrl, archivedAt, opportunities });
  writeJson(CONTACTS_PATH, { archivedAt, contacts: dataset.contacts });

  const withBooklet = dataset.opportunities.filter((o) => o.booklet?.url).length;
  const withPhotos = dataset.opportunities.filter((o) => o.provisions.accommodation.link).length;
  console.log(`Saved ${dataset.opportunities.length} opportunities (${withBooklet} booklets, ${withPhotos} photo links) to ${EXTRAS_PATH}`);
  console.log(`Saved ${dataset.contacts.length} host-team contacts to ${CONTACTS_PATH} (local only, not committed)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

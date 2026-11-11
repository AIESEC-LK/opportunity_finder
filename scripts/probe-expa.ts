/**
 * Read-only probe of EXPA's GraphQL API, for the EXPA data-source spike.
 * Answers: which opportunity fields exist, how many open Sri Lankan
 * opportunities there are, and how they line up with the Google Sheet.
 *
 * Run with: npm run probe:expa [-- --findings path/to/FINDINGS.md]
 * Needs EXPA_TOKEN in .env.local (never printed). Optional EXPA_COMMITTEE_ID
 * (default 1623) and EXPA_GRAPHQL_URL.
 */
import { appendFileSync } from "node:fs";
import { fetchDataset } from "@/lib/data/source";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on variables already set in the terminal.
}

const ENDPOINT = process.env.EXPA_GRAPHQL_URL?.trim() || "https://gis-api.aiesec.org/graphql";
const TOKEN = process.env.EXPA_TOKEN?.trim() ?? "";
const COMMITTEE = Number(process.env.EXPA_COMMITTEE_ID ?? 1623);
const GV = 7;

/** Fields worth checking by hand if introspection is switched off. */
const CANDIDATES = [
  "id", "title", "status", "openings", "description", "duration", "earliest_start_date",
  "latest_end_date", "applications_close_date", "programmes { short_name_display }",
  "home_lc { id name }", "host_lc { id name }", "home_mc { id name }", "organisation { name }",
  "slots { title start_date end_date openings }", "sdg_info { sdg_target { id goal_index target_index } }",
  "project { id title }", "project_name", "sub_product { name }", "logistics_info { accommodation_provided food_covered }",
  "role_info { city }", "location", "cover_photo { url }", "specifics_info { salary }",
];

const redact = (text: string) => (TOKEN ? text.split(TOKEN).join("[token]") : text);
const lines: string[] = [];
function out(line = "") {
  const safe = redact(line);
  lines.push(safe);
  console.log(safe);
}

interface GqlResult<T> {
  data?: T;
  errors?: { message: string }[];
  status: number;
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<GqlResult<T>> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: TOKEN },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  try {
    return { ...(JSON.parse(text) as object), status: response.status } as GqlResult<T>;
  } catch {
    return { status: response.status, errors: [{ message: `Not JSON (HTTP ${response.status})` }] };
  }
}

const errorText = (r: GqlResult<unknown>) => r.errors?.map((e) => e.message).join("; ") ?? `HTTP ${r.status}`;

interface TypeRef { name: string | null; kind: string; ofType?: TypeRef | null }
const baseName = (t: TypeRef | null | undefined): string | null => (t ? t.name ?? baseName(t.ofType) : null);

async function introspect(name: string) {
  const r = await gql<{ __type: { fields: { name: string; type: TypeRef }[] } | null }>(
    `query($name: String!) { __type(name: $name) { fields { name type { name kind ofType { name kind ofType { name kind ofType { name kind } } } } } } }`,
    { name },
  );
  return r.data?.__type?.fields ?? null;
}

async function stepA() {
  out("## Fields available");
  const root = await gql<{ __schema: { queryType: { fields: { name: string; type: TypeRef }[] } } }>(
    `{ __schema { queryType { fields { name type { name kind ofType { name kind } } } } } }`,
  );
  const listType = baseName(root.data?.__schema.queryType.fields.find((f) => f.name === "opportunities")?.type);
  const listFields = listType ? await introspect(listType) : null;
  const itemType = baseName(listFields?.find((f) => f.name === "data")?.type);
  const fields = itemType ? await introspect(itemType) : null;

  if (fields) {
    out(`Introspection works. Opportunity type: ${itemType} (${fields.length} fields)`);
    out(fields.map((f) => `${f.name}: ${baseName(f.type)}`).sort().join(", "));
    const interesting = /project|sdg|logistic|accommodation|food|meal|booklet|city|location|slot|contact|description/i;
    for (const f of fields.filter((f) => interesting.test(f.name))) {
      const type = baseName(f.type);
      const sub = type && !/^(String|Int|Float|Boolean|ID|Date|DateTime|JSON)$/.test(type) ? await introspect(type) : null;
      out(`  - ${f.name} (${type})${sub ? `: ${sub.map((s) => s.name).join(", ")}` : ""}`);
    }
    return;
  }

  out(`Introspection unavailable (${errorText(root)}). Trying candidate fields one by one:`);
  for (const field of CANDIDATES) {
    const r = await gql(`query($f: OpportunityFilter) { opportunities(per_page: 1, filters: $f) { data { ${field} } } }`, {
      f: { committee: COMMITTEE, programmes: [GV] },
    });
    out(`  ${r.errors ? "✗" : "✓"} ${field}${r.errors ? `  (${errorText(r).slice(0, 120)})` : ""}`);
  }
}

async function fetchExpaIds(status?: string): Promise<{ ids: Set<string>; total: number }> {
  const ids = new Set<string>();
  let page = 1;
  let total = 0;
  for (;;) {
    const r = await gql<{ opportunities: { data: { id: string }[]; paging: { total_pages: number; total_items: number } } }>(
      `query($p: Int, $f: OpportunityFilter) { opportunities(page: $p, per_page: 500, filters: $f) { data { id } paging { total_pages total_items } } }`,
      { p: page, f: { committee: COMMITTEE, programmes: [GV], ...(status ? { status } : {}) } },
    );
    if (!r.data) throw new Error(`Listing failed: ${errorText(r)}`);
    r.data.opportunities.data.forEach((o) => ids.add(String(o.id)));
    total = r.data.opportunities.paging.total_items;
    if (page >= r.data.opportunities.paging.total_pages) break;
    page += 1;
  }
  return { ids, total };
}

async function main() {
  const findingsArg = process.argv.indexOf("--findings");
  const findingsPath = findingsArg > 0 ? process.argv[findingsArg + 1] : ".plans/expa-spike/FINDINGS.md";

  out(`\n# Probe run ${new Date().toISOString()}`);
  out(`Endpoint: ${ENDPOINT}   token: ${TOKEN ? "set" : "NOT SET"}   committee: ${COMMITTEE}`);
  if (!TOKEN) {
    out("EXPA_TOKEN is not set in .env.local — stopping.");
    process.exitCode = 1;
    return;
  }

  await stepA();

  out("\n## Counts");
  const committee = await gql<{ committee: { name: string; tag: string | null } | null }>(
    `query($id: ID!) { committee(id: $id) { name tag } }`,
    { id: String(COMMITTEE) },
  );
  out(`Committee ${COMMITTEE}: ${committee.data?.committee ? `${committee.data.committee.name} (${committee.data.committee.tag ?? "-"})` : `lookup failed (${errorText(committee)})`}`);
  const open = await fetchExpaIds("open");
  const all = await fetchExpaIds();
  out(`GV opportunities — open: ${open.total}, any status: ${all.total}`);

  out("\n## Sheet vs EXPA");
  const sheet = await fetchDataset("sheet");
  const sheetIds = new Set(sheet.opportunities.map((o) => o.expaId).filter((id): id is string => Boolean(id)));
  const noLink = sheet.opportunities.length - sheetIds.size;
  const inOpen = [...sheetIds].filter((id) => open.ids.has(id));
  const inAny = [...sheetIds].filter((id) => all.ids.has(id));
  const expaOnly = [...open.ids].filter((id) => !sheetIds.has(id));
  out(`Sheet opportunities: ${sheet.opportunities.length} (${sheetIds.size} with an EXPA id, ${noLink} without)`);
  out(`Sheet ids found in EXPA open list: ${inOpen.length}; in EXPA (any status): ${inAny.length}; not in EXPA: ${sheetIds.size - inAny.length}`);
  out(`Open in EXPA but missing from sheet: ${expaOnly.length}${expaOnly.length ? ` (first ids: ${expaOnly.slice(0, 10).join(", ")})` : ""}`);

  try {
    appendFileSync(findingsPath, `\n${lines.join("\n")}\n`);
    console.log(`\nAppended to ${findingsPath}`);
  } catch (error) {
    console.log(`\nCould not write ${findingsPath}: ${String(error)}`);
  }
}

main().catch((error) => {
  console.error(redact(String(error)));
  process.exitCode = 1;
});

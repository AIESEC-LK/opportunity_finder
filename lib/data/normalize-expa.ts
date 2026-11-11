/**
 * Turns EXPA opportunities into the same Dataset the sheet produces, so every
 * page works unchanged (spike).
 */
import type { Dataset, DateRange, HostTeam, Opportunity, Project, Provision } from "@/types/domain";
import { SOURCE_COUNTRY } from "./config";
import { daysBetween } from "./dates";
import type { ExpaOpportunity } from "./expa";
import { normalizeHostTeam } from "./normalize";
import { clean, keyOf, slugify } from "./text";

/** EXPA local committee id -> the entity code used across the app (HOST_TEAMS). */
export const LC_CODES: Record<string, string> = {
  "222": "CC",
  "872": "CN",
  "1340": "CS",
  "2204": "KANDY",
  "4535": "NIBM",
  "2186": "NSBM",
  "5490": "RAJARATA",
  "2175": "RUHUNA",
  "2188": "SLIIT",
  "221": "USJ",
  "6710": "WAYAMBA",
};

/** "Heartbeat [6 weeks]" -> "Heartbeat"; "Raise Your Voice - women/…" -> "Raise Your Voice". */
export function projectNameOf(title: string | null | undefined): string {
  const name = clean(String(title ?? "").replace(/\[[^\]]*\]/g, "").split(/\s[-–]\s/)[0]);
  return name || "Other";
}

function hostTeamOf(lc: ExpaOpportunity["host_lc"]): HostTeam | null {
  if (!lc) return null;
  return normalizeHostTeam(LC_CODES[String(lc.id)] ?? lc.name);
}

function provisionOf(provided: string | null | undefined, covered: string | null | undefined, meals?: string | null): Provision {
  const p = clean(provided).toLowerCase();
  const sourceText = [`EXPA: ${p || "blank"}${covered ? `, ${covered}` : ""}${meals ? `, ${meals} meals` : ""}`];
  if (p === "provided") {
    return {
      status: "included",
      ...(meals && Number(meals) > 0 ? { detail: `${meals} meals per day` } : {}),
      note: covered === "covered" ? "Provided and covered by the host (EXPA)." : "Provided by the host (EXPA).",
      sourceText,
    };
  }
  if (p === "not_provided" || p === "not provided") return { status: "not_included", note: "Not provided (EXPA).", sourceText };
  return { status: "not_specified", note: "EXPA doesn't say.", sourceText };
}

function rangesOf(slots: ExpaOpportunity["available_slots"]): DateRange[] {
  const ranges: DateRange[] = [];
  for (const slot of slots ?? []) {
    const start = slot.start_date?.slice(0, 10);
    const end = slot.end_date?.slice(0, 10);
    if (!start || !end || start >= end) continue;
    if (slot.available_openings !== null && slot.available_openings <= 0) continue;
    const weeks = Math.max(1, Math.round(daysBetween(start, end) / 7));
    ranges.push({ start, end, precision: "day", yearInferred: false, raw: `${start} – ${end} (${slot.available_openings ?? "?"} open)`, weeks });
  }
  return ranges.sort((a, b) => a.start.localeCompare(b.start));
}

export function buildExpaOpportunity(o: ExpaOpportunity): Opportunity {
  const projectName = projectNameOf(o.project?.title ?? o.title);
  const target = o.sdg_info?.sdg_target;
  const goal = target?.goal_index && target.goal_index >= 1 && target.goal_index <= 17 ? target.goal_index : null;
  const ranges = rangesOf(o.available_slots);
  const title = clean(o.organisation?.name) || clean(o.title) || `Opportunity ${o.id}`;
  return {
    id: String(o.id),
    expaId: String(o.id),
    title,
    titleSource: "expa",
    type: "IGV",
    typeSource: "expa",
    projectKey: keyOf(projectName),
    projectName,
    projectSlug: slugify(projectName),
    sdgTarget: goal ? `${goal}${target?.target_index ? `.${target.target_index}` : ""}` : null,
    goals: goal ? [goal] : [],
    hostTeam: hostTeamOf(o.host_lc),
    country: SOURCE_COUNTRY,
    applicationUrl: `https://aiesec.org/opportunity/global-volunteer/${o.id}`,
    applicationUrlIssue: null,
    booklet: null,
    provisions: {
      accommodation: provisionOf(o.logistics_info?.accommodation_provided, o.logistics_info?.accommodation_covered),
      meals: provisionOf(o.logistics_info?.food_provided, o.logistics_info?.food_covered, o.logistics_info?.no_of_meals),
    },
    dates: {
      ranges,
      flexible: false,
      slotTexts: ranges.length ? [] : [{ label: "EXPA", text: "No open slots listed" }],
      unparsed: [],
    },
    sources: [{ tab: "EXPA", row: 1 }],
  };
}

export function normalizeExpa(records: ExpaOpportunity[], sourceUrl: string, fetchedAt = new Date()): Dataset {
  const opportunities = records.filter((r) => r.programme?.short_name_display !== "GTa" && r.programme?.short_name_display !== "GTe").map(buildExpaOpportunity);

  const projects = new Map<string, Project>();
  for (const o of opportunities) {
    const p = projects.get(o.projectKey) ?? { key: o.projectKey, slug: o.projectSlug, name: o.projectName, goals: [], targets: [], opportunityIds: [], hostTeamCodes: [] };
    p.opportunityIds.push(o.id);
    for (const g of o.goals) if (!p.goals.includes(g)) p.goals.push(g);
    if (o.sdgTarget && !p.targets.includes(o.sdgTarget)) p.targets.push(o.sdgTarget);
    if (o.hostTeam && !p.hostTeamCodes.includes(o.hostTeam.code)) p.hostTeamCodes.push(o.hostTeam.code);
    projects.set(o.projectKey, p);
  }
  for (const p of projects.values()) p.goals.sort((a, b) => a - b);

  const hostTeams = new Map<string, HostTeam>();
  for (const o of opportunities) if (o.hostTeam) hostTeams.set(o.hostTeam.code, o.hostTeam);

  return {
    opportunities,
    projects: [...projects.values()].sort((a, b) => a.name.localeCompare(b.name)),
    hostTeams: [...hostTeams.values()].sort((a, b) => a.name.localeCompare(b.name)),
    contacts: [],
    resources: [],
    diagnostics: {
      tabsRead: [{ name: "EXPA", role: "listing", rows: records.length }],
      recordsRead: records.length,
      duplicatesMerged: 0,
      skippedRows: [],
      invalidUrls: [],
      unparsedDateFragments: 0,
      supplementaryUnmatched: [],
    },
    fetchedAt: fetchedAt.toISOString(),
    sourceUrl,
  };
}

/**
 * Turns EXPA opportunities into the same Dataset the sheet produces, so every
 * page works unchanged (spike).
 */
import type { ContactLevel, Dataset, DateRange, HostTeam, ISODate, Opportunity, OpportunityContact, Project, Provision } from "@/types/domain";
import { SOURCE_COUNTRY } from "./config";
import { daysBetween } from "./dates";
import { todayISO } from "@/lib/format";
import type { ExpaExtras, ExpaManager, ExpaOpportunity, ExpaPosition } from "./expa";
import { normalizeHostTeam } from "./normalize";
import { PLANNING_LINKS } from "./planning-links";
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
      ...(meals && Number(meals) > 0 ? { detail: `${Number(meals)} ${Number(meals) === 1 ? "meal" : "meals"} per day` } : {}),
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


/** Non-national, non-LCVP managers are only added until this many contacts are shown. */
export const MIN_CONTACTS_BEFORE_FILLING = 2;

const NATIONAL_ROLES = new Set(["MCVP", "ESTL"]);
/** Roles counted as "team leader or above". TM (team member) is not. */
const TEAM_LEAD_ROLES = new Set(["TL", "ESTL", "LCVP", "LCP", "MCVP", "MCP"]);
const IGV_FUNCTION = /^ICX\b/i;

function isCurrent(p: ExpaPosition, today: ISODate): boolean {
  if (p.status && p.status !== "active") return false;
  const start = p.start_date?.slice(0, 10);
  const end = p.end_date?.slice(0, 10);
  return (!start || start <= today) && (!end || end >= today);
}

const roleOf = (p: ExpaPosition) => clean(p.role?.name).toUpperCase();
const isIgv = (p: ExpaPosition) => IGV_FUNCTION.test(clean(p.function?.name));
const isNational = (p: ExpaPosition) => NATIONAL_ROLES.has(roleOf(p)) && p.office?.tag === "MC";
const isHostLcvp = (p: ExpaPosition, hostLcId: string) => roleOf(p) === "LCVP" && isIgv(p) && String(p.office?.id) === hostLcId;
const isIgvTeamLead = (p: ExpaPosition) => TEAM_LEAD_ROLES.has(roleOf(p)) && isIgv(p);

/** "+94 771234567" from EXPA's separate country code and number; drops a local leading 0. */
export function formatPhone(phone: string | null | undefined, countryCode: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const code = String(countryCode ?? "").replace(/\D/g, "");
  return code ? `+${code} ${digits.replace(/^0+/, "")}` : digits;
}

/** Adds https:// when missing; null for anything that isn't a usable web address. */
export function normalizeWebsite(value: string | null | undefined): string | null {
  const raw = clean(value);
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}

function toContact(m: ExpaManager, position: ExpaPosition, level: ContactLevel): OpportunityContact | null {
  const name = clean(m.full_name);
  if (!name) return null;
  const email = clean(m.aiesec_email).toLowerCase();
  return {
    name,
    title: clean(position.title) || roleOf(position) || null,
    phone: formatPhone(m.contact_detail?.phone, m.contact_detail?.country_code),
    email: email.endsWith("@aiesec.net") ? email : null,
    level,
  };
}

/**
 * Picks who to show, keeping EXPA's order inside each group. Only managers
 * with a current role count:
 *  1. national team (MCVP or ESTL at the MC): always shown;
 *  2. the host LC's iGV LCVPs: always shown;
 *  3. if that's fewer than two people, other iGV team leads (TL or above)
 *     fill up to two. Nobody else is ever added.
 */
export function pickContacts(managers: ExpaManager[], hostLcId: string | undefined, today: ISODate = todayISO()): OpportunityContact[] {
  const people = managers.map((m) => ({ m, positions: (m.current_positions ?? []).filter((p) => isCurrent(p, today)) }));
  const used = new Set<string>();
  const picked: OpportunityContact[] = [];
  const take = (level: ContactLevel, matches: (p: ExpaPosition) => boolean, limit = Infinity) => {
    for (const { m, positions } of people) {
      if (picked.length >= limit) return;
      const position = positions.find(matches);
      if (!position || used.has(m.id)) continue;
      const contact = toContact(m, position, level);
      if (!contact) continue;
      used.add(m.id);
      picked.push(contact);
    }
  };
  take("national", isNational);
  if (hostLcId) take("lcvp", (p) => isHostLcvp(p, hostLcId));
  take("team", isIgvTeamLead, MIN_CONTACTS_BEFORE_FILLING);
  return picked;
}

export function buildExpaOpportunity(o: ExpaOpportunity, extras?: ExpaExtras): Opportunity {
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
    description: o.description?.trim() || null,
    location: clean(o.location) || null,
    contacts: extras ? pickContacts(extras.managers, o.host_lc ? String(o.host_lc.id) : undefined) : [],
    partnerWebsite: normalizeWebsite(extras?.website),
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

export function normalizeExpa(
  records: ExpaOpportunity[],
  sourceUrl: string,
  fetchedAt = new Date(),
  extras: Map<string, ExpaExtras> = new Map(),
): Dataset {
  const opportunities = records.filter((r) => r.programme?.short_name_display !== "GTa" && r.programme?.short_name_display !== "GTe").map((r) => buildExpaOpportunity(r, extras.get(String(r.id))));

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
    resources: PLANNING_LINKS,
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

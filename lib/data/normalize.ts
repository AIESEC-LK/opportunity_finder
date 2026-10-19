import type {
  Contact,
  Dataset,
  Diagnostics,
  HostTeam,
  Opportunity,
  OpportunityType,
  Project,
  ResourceLink,
  SlotText,
  SourceRef,
} from "@/types/domain";
import { goalFromTarget } from "@/lib/sdgs";
import { CONTACTS_TAB, HOST_TEAMS, MEALS_TAB, SOURCE_COUNTRY, WELCOME_TAB } from "./config";
import { dedupeRanges, isFlexibleText, parseSlotText } from "./dates";
import { accommodationProvision, mealsProvision } from "./provisions";
import { clean, hash, keyOf, looksLikeUrl, safeUrl, slugify } from "./text";
import { titleFromBooklet, titleFromLinkText } from "./titles";
import type { Cell, Sheet, Workbook } from "./xlsx";

/** One spreadsheet row that describes an opportunity, before merging duplicates. */
export interface RawRecord {
  tab: string;
  row: number;
  project: string;
  sdgTarget: string | null;
  hostTeam: string | null;
  linkText: string;
  linkUrl: string | null;
  bookletLabel: string;
  bookletUrl: string | null;
  accommodationText: string;
  accommodationUrl: string | null;
  food: Cell | undefined;
  slots: SlotText[];
}

interface Columns {
  headerRow: number;
  firstDataRow: number;
  sdg?: number;
  project: number;
  hostTeam?: number;
  link?: number;
  booklet?: number;
  accommodation?: number;
  food?: number;
  slots: { col: number; label: string; year: number | null }[];
}

const text = (cell: Cell | undefined) => (cell && cell.kind !== "boolean" ? clean(cell.text) : "");

/** Finds the header row ("Project Name", "Entity", ...) and the sub-header below it. */
export function detectColumns(sheet: Sheet): Columns | null {
  for (let r = 1; r <= Math.min(sheet.maxRow, 6); r++) {
    let project: number | undefined;
    for (let c = 1; c <= sheet.maxCol; c++) {
      if (/project\s*name/i.test(text(sheet.own(r, c)))) project = c;
    }
    if (!project) continue;

    const columns: Columns = { headerRow: r, firstDataRow: r + 2, project, slots: [] };
    for (let c = 1; c <= sheet.maxCol; c++) {
      const head = text(sheet.get(r, c));
      const sub = text(sheet.get(r + 1, c));
      if (/sdg/i.test(head)) columns.sdg = c;
      else if (/entity|host|committee/i.test(head)) columns.hostTeam = c;
      else if (/available\s*slots/i.test(head)) {
        // Year sub-headers are numeric cells, read as "2025" or "2025.0".
        const year = /^(20\d\d)(\.0+)?$/.test(sub) ? Number(sub.slice(0, 4)) : null;
        columns.slots.push({ col: c, label: year ? String(year) : sub || head, year });
      } else if (/project\s*link/i.test(sub)) columns.link = c;
      else if (/booklet/i.test(sub)) columns.booklet = c;
      else if (/accommodation/i.test(head)) columns.accommodation = c;
      else if (/food|meal/i.test(head)) columns.food = c;
    }
    // Without a sub-header row the data starts straight after the header.
    if (!columns.slots.some((s) => s.year !== null) && columns.link === undefined) columns.firstDataRow = r + 1;
    return columns;
  }
  return null;
}

function isMergeContinuation(sheet: Sheet, row: number, col: number): boolean {
  return sheet.merges.some((m) => col >= m.c1 && col <= m.c2 && row > m.r1 && row <= m.r2);
}

export interface TabRead {
  records: RawRecord[];
  skipped: { tab: string; row: number; reason: string }[];
  rows: number;
}

/**
 * Reads opportunity rows from a tab. SDG, project and host-team cells are
 * merged down across the rows they group; blank cells below them continue
 * the group above, which is how the sheet is laid out visually.
 */
export function readListingTab(sheet: Sheet): TabRead | null {
  const columns = detectColumns(sheet);
  if (!columns) return null;
  const records: RawRecord[] = [];
  const skipped: TabRead["skipped"] = [];

  let project = "";
  let sdgTarget: string | null = null;
  let hostTeam: string | null = null;

  const contentCols = [
    ...columns.slots.map((s) => s.col),
    columns.link,
    columns.booklet,
    columns.accommodation,
    columns.food,
  ].filter((c): c is number => c !== undefined);

  for (let r = columns.firstDataRow; r <= sheet.maxRow; r++) {
    const projectCell = sheet.get(r, columns.project);
    const projectOwn = sheet.own(r, columns.project);
    const startsBlock = Boolean(projectOwn && text(projectOwn)) && !isMergeContinuation(sheet, r, columns.project);

    if (startsBlock) {
      project = text(projectCell);
      sdgTarget = null;
      hostTeam = null;
    }
    if (columns.sdg !== undefined) {
      const sdg = text(sheet.get(r, columns.sdg));
      if (sdg) sdgTarget = sdg;
    }
    if (columns.hostTeam !== undefined) {
      const team = text(sheet.get(r, columns.hostTeam));
      if (team) hostTeam = team;
    }

    // A row only counts if it has its own content. Rows that are covered by a
    // merged range above (or hold only an unticked checkbox) are layout.
    const hasOwnContent = contentCols.some((c) => {
      const cell = sheet.own(r, c);
      if (!cell || cell.kind === "boolean") return false;
      return Boolean(text(cell) || cell.link);
    });
    const ownFoodTicked = columns.food !== undefined && sheet.own(r, columns.food)?.bool === true;
    if (!hasOwnContent && !ownFoodTicked) {
      const hasAnyText = Array.from({ length: sheet.maxCol }, (_, i) => sheet.own(r, i + 1)).some(
        (cell) => cell && cell.kind !== "boolean" && text(cell),
      );
      if (hasAnyText) skipped.push({ tab: sheet.name, row: r, reason: "Row has no opportunity link, booklet or dates." });
      continue;
    }

    const linkCell = columns.link !== undefined ? sheet.get(r, columns.link) : undefined;
    const bookletCell = columns.booklet !== undefined ? sheet.get(r, columns.booklet) : undefined;
    const linkText = text(linkCell);
    const linkUrl = linkCell?.link ?? (looksLikeUrl(linkText) ? linkText : null);
    const bookletLabel = text(bookletCell);
    const bookletUrl = bookletCell?.link ?? null;

    if (!linkUrl && !linkText && !bookletLabel && !bookletUrl) {
      skipped.push({ tab: sheet.name, row: r, reason: "Row has dates or logistics but no opportunity link or booklet." });
      continue;
    }
    if (!project) {
      skipped.push({ tab: sheet.name, row: r, reason: "Row is not under a project name." });
      continue;
    }

    const accommodationCell = columns.accommodation !== undefined ? sheet.get(r, columns.accommodation) : undefined;
    records.push({
      tab: sheet.name,
      row: r,
      project,
      sdgTarget,
      hostTeam,
      linkText,
      linkUrl,
      bookletLabel,
      bookletUrl,
      accommodationText: text(accommodationCell),
      accommodationUrl: accommodationCell?.link ?? null,
      food: columns.food !== undefined ? sheet.get(r, columns.food) : undefined,
      slots: columns.slots
        .map((s) => ({ label: s.label, text: String(sheet.get(r, s.col)?.text ?? "").trim() }))
        .filter((s) => s.text),
    });
  }

  return { records, skipped, rows: sheet.maxRow };
}

const EXPA_ID = /aiesec\.org\/opportunit(?:y|ies)\/(?:([a-z-]+)\/)?(\d{3,10})(?!\d)/i;

export function readOpportunityLink(url: string | null): {
  url: string | null;
  expaId: string | null;
  type: OpportunityType | null;
} {
  const valid = safeUrl(url);
  if (!valid) return { url: null, expaId: null, type: null };
  const match = valid.match(EXPA_ID);
  const product = match?.[1]?.toLowerCase();
  const type: OpportunityType | null =
    product === "global-volunteer" ? "IGV" : product === "global-talent" || product === "global-teacher" ? "IGT" : null;
  return { url: valid, expaId: match?.[2] ?? null, type };
}

export function normalizeHostTeam(value: string | null): HostTeam | null {
  // "CN (flexible slots)" -> "CN"; "RUHUNA" and "Ruhuna" are the same entity.
  const raw = clean(String(value ?? "").replace(/\(.*?\)/g, ""));
  if (!raw) return null;
  const known = HOST_TEAMS[raw.toUpperCase()];
  if (known) return { code: known.code, name: known.name, slug: slugify(known.code) };
  const code = /^[A-Z]{2,6}$/.test(raw) ? raw : raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return { code, name: `AIESEC in ${code}`, slug: slugify(code) };
}

/** Dedupe key: the EXPA opportunity id, or the row's identifying content. */
export function recordKey(record: RawRecord): string {
  const { expaId } = readOpportunityLink(record.linkUrl);
  if (expaId) return expaId;
  const fingerprint = [
    keyOf(record.project),
    keyOf(normalizeHostTeam(record.hostTeam)?.code ?? ""),
    keyOf(record.linkText),
    record.linkUrl ?? "",
    keyOf(record.bookletLabel),
    record.bookletUrl ?? "",
    record.accommodationUrl ?? "",
  ].join("|");
  return `r${hash(fingerprint)}`;
}

function yearFor(label: string): number | null {
  return /^20\d\d$/.test(label) ? Number(label) : null;
}

export interface BuildOptions {
  /** Food text from the "Food Provided" tab, by EXPA id or booklet URL. */
  mealsLookup?: Map<string, string[]>;
}

export function buildOpportunity(key: string, group: RawRecord[], options: BuildOptions = {}): Opportunity {
  const first = group[0];
  const link = group.map((r) => readOpportunityLink(r.linkUrl)).find((l) => l.url) ?? readOpportunityLink(null);
  const hostTeam = normalizeHostTeam(group.map((r) => r.hostTeam).find(Boolean) ?? null);
  const projectName = first.project;
  const sdgTarget = group.map((r) => r.sdgTarget).find(Boolean) ?? null;
  const goal = goalFromTarget(sdgTarget);

  const bookletRecord = group.find((r) => r.bookletLabel || r.bookletUrl);
  const booklet = bookletRecord
    ? { label: bookletRecord.bookletLabel || "Project booklet", url: safeUrl(bookletRecord.bookletUrl) }
    : null;

  let title: string | null = null;
  let titleSource: Opportunity["titleSource"] = "fallback";
  for (const record of group) {
    title = titleFromLinkText(record.linkText, hostTeam?.code ?? null);
    if (title) {
      titleSource = "link-text";
      break;
    }
  }
  if (!title) {
    for (const record of group) {
      title = record.bookletLabel ? titleFromBooklet(record.bookletLabel, projectName, hostTeam?.code ?? null) : null;
      if (title) {
        titleSource = "booklet";
        break;
      }
    }
  }
  if (!title) title = `${projectName} · ${hostTeam ? hostTeam.name.replace(/^AIESEC in /, "") : SOURCE_COUNTRY}`;

  const slotTexts: SlotText[] = [];
  for (const record of group) {
    for (const slot of record.slots) {
      if (!slotTexts.some((s) => s.label === slot.label && s.text === slot.text)) slotTexts.push(slot);
    }
  }
  const parsed = slotTexts.map((slot) => parseSlotText(slot.text, yearFor(slot.label)));
  const entityNote = group.map((r) => r.hostTeam ?? "").join(" ");

  const mealsTexts = [
    ...group.map((r) => (r.food && r.food.kind !== "boolean" ? r.food.text : "")).filter(Boolean),
    ...(link.expaId ? (options.mealsLookup?.get(link.expaId) ?? []) : []),
    ...(booklet?.url ? (options.mealsLookup?.get(booklet.url) ?? []) : []),
  ];

  let applicationUrlIssue: string | null = null;
  if (!link.url) {
    const rawLink = group.map((r) => r.linkUrl).find(Boolean);
    applicationUrlIssue = rawLink
      ? "The sheet's link for this opportunity is not a valid web address."
      : "The sheet doesn't include an application link for this opportunity.";
  }

  return {
    id: key,
    expaId: link.expaId,
    title,
    titleSource,
    type: link.type ?? "IGV",
    typeSource: link.type ? "url" : "sheet",
    projectKey: keyOf(projectName),
    projectName,
    projectSlug: slugify(projectName),
    sdgTarget,
    goals: goal ? [goal] : [],
    hostTeam,
    country: SOURCE_COUNTRY,
    applicationUrl: link.url,
    applicationUrlIssue,
    booklet,
    provisions: {
      accommodation: accommodationProvision({
        texts: group.map((r) => r.accommodationText),
        urls: group.map((r) => r.accommodationUrl ?? ""),
      }),
      meals: mealsProvision({
        checkbox: group.map((r) => r.food).filter((c): c is Cell => c?.kind === "boolean").map((c) => Boolean(c.bool)),
        texts: mealsTexts,
      }),
    },
    dates: {
      ranges: dedupeRanges(parsed.flatMap((p) => p.ranges)),
      flexible: parsed.some((p) => p.flexible) || isFlexibleText(entityNote),
      slotTexts,
      unparsed: [...new Set(parsed.flatMap((p) => p.unparsed))],
    },
    sources: group.map<SourceRef>((r) => ({ tab: r.tab, row: r.row })),
  };
}

function readContacts(sheet: Sheet): Contact[] {
  const headers = new Map<string, number>();
  for (let c = 1; c <= sheet.maxCol; c++) headers.set(text(sheet.own(1, c)).toLowerCase(), c);
  const col = (pattern: RegExp) => [...headers.entries()].find(([h]) => pattern.test(h))?.[1];
  const team = col(/^lc$|entity|committee/);
  const person = col(/vp|contact|name/);
  const whatsapp = col(/whatsapp/);
  const email = col(/e-?mail/);
  const instagram = col(/instagram/);
  if (!team) return [];

  const contacts: Contact[] = [];
  for (let r = 2; r <= sheet.maxRow; r++) {
    const host = normalizeHostTeam(text(sheet.own(r, team)));
    if (!host) continue;
    const emailValue = email ? text(sheet.own(r, email)) : "";
    const insta = instagram ? text(sheet.own(r, instagram)) : "";
    const instaUrl = safeUrl(insta) ?? (/^@[\w.]+$/.test(insta) ? `https://www.instagram.com/${insta.slice(1)}/` : null);
    contacts.push({
      hostTeamCode: host.code,
      person: person ? text(sheet.own(r, person)) || null : null,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) ? emailValue : null,
      whatsapp: whatsapp ? text(sheet.own(r, whatsapp)) || null : null,
      instagram: insta ? { label: insta.startsWith("@") ? insta : "Instagram", url: instaUrl } : null,
    });
  }
  return contacts;
}

/** Labelled links on the Welcome tab (Budget, Visa Guidelines, Country Booklet, ...). */
function readResources(sheet: Sheet): ResourceLink[] {
  const resources: ResourceLink[] = [];
  for (let r = 1; r <= sheet.maxRow; r++) {
    for (let c = 2; c <= sheet.maxCol; c++) {
      const url = safeUrl(sheet.own(r, c)?.link);
      const label = text(sheet.own(r, c - 1));
      if (url && label && !resources.some((x) => x.url === url)) resources.push({ label, url });
    }
  }
  return resources;
}

export function normalizeWorkbook(workbook: Workbook, sourceUrl: string, fetchedAt = new Date()): Dataset {
  const diagnostics: Diagnostics = {
    tabsRead: [],
    recordsRead: 0,
    duplicatesMerged: 0,
    skippedRows: [],
    invalidUrls: [],
    unparsedDateFragments: 0,
    supplementaryUnmatched: [],
  };

  const listingRecords: RawRecord[] = [];
  const mealsRecords: RawRecord[] = [];
  let contacts: Contact[] = [];
  let resources: ResourceLink[] = [];

  for (const sheet of workbook.sheets) {
    if (sheet.hidden) continue;
    if (WELCOME_TAB.test(sheet.name)) {
      resources = readResources(sheet);
      diagnostics.tabsRead.push({ name: sheet.name, role: "Resource links", rows: sheet.maxRow });
      continue;
    }
    if (CONTACTS_TAB.test(sheet.name)) {
      contacts = readContacts(sheet);
      diagnostics.tabsRead.push({ name: sheet.name, role: "Host team contacts", rows: sheet.maxRow });
      continue;
    }
    const read = readListingTab(sheet);
    if (!read) continue;
    if (MEALS_TAB.test(sheet.name)) {
      mealsRecords.push(...read.records);
      diagnostics.tabsRead.push({ name: sheet.name, role: "Meal details for listed opportunities", rows: read.rows });
    } else {
      listingRecords.push(...read.records);
      diagnostics.skippedRows.push(...read.skipped);
      diagnostics.tabsRead.push({ name: sheet.name, role: "Opportunity listings", rows: read.rows });
    }
  }

  for (const record of [...listingRecords, ...mealsRecords]) {
    const raw = record.linkUrl;
    if (raw && !safeUrl(raw)) diagnostics.invalidUrls.push({ tab: record.tab, row: record.row, value: raw });
  }

  diagnostics.recordsRead = listingRecords.length;
  const groups = new Map<string, RawRecord[]>();
  for (const record of listingRecords) {
    const key = recordKey(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  diagnostics.duplicatesMerged = listingRecords.length - groups.size;

  // Meal details from the supplementary tab, matched by EXPA id or booklet URL.
  const listedIds = new Set(groups.keys());
  const listedBooklets = new Set(listingRecords.map((r) => safeUrl(r.bookletUrl)).filter(Boolean));
  const mealsLookup = new Map<string, string[]>();
  for (const record of mealsRecords) {
    const foodText = record.food && record.food.kind !== "boolean" ? clean(record.food.text) : "";
    if (!foodText) continue;
    const { expaId } = readOpportunityLink(record.linkUrl);
    const bookletUrl = safeUrl(record.bookletUrl);
    const key = expaId && listedIds.has(expaId) ? expaId : bookletUrl && listedBooklets.has(bookletUrl) ? bookletUrl : null;
    if (!key) {
      diagnostics.supplementaryUnmatched.push({
        tab: record.tab,
        row: record.row,
        reason: "Meal details for an opportunity that isn't in the listing tabs.",
      });
      continue;
    }
    mealsLookup.set(key, [...(mealsLookup.get(key) ?? []), foodText]);
  }

  const opportunities = [...groups.entries()].map(([key, group]) => buildOpportunity(key, group, { mealsLookup }));

  // Projects: unique by name; SDG associations come from the listing tabs, and
  // from the meals tab only for projects the listing tabs give no goal for.
  const projectMap = new Map<string, Project>();
  const nameVotes = new Map<string, Map<string, number>>();
  for (const opportunity of opportunities) {
    const project =
      projectMap.get(opportunity.projectKey) ??
      ({
        key: opportunity.projectKey,
        slug: opportunity.projectSlug,
        name: opportunity.projectName,
        goals: [],
        targets: [],
        opportunityIds: [],
        hostTeamCodes: [],
      } satisfies Project);
    project.opportunityIds.push(opportunity.id);
    if (opportunity.sdgTarget && !project.targets.includes(opportunity.sdgTarget)) project.targets.push(opportunity.sdgTarget);
    for (const goal of opportunity.goals) if (!project.goals.includes(goal)) project.goals.push(goal);
    if (opportunity.hostTeam && !project.hostTeamCodes.includes(opportunity.hostTeam.code)) {
      project.hostTeamCodes.push(opportunity.hostTeam.code);
    }
    projectMap.set(opportunity.projectKey, project);
    const votes = nameVotes.get(opportunity.projectKey) ?? new Map<string, number>();
    votes.set(opportunity.projectName, (votes.get(opportunity.projectName) ?? 0) + 1);
    nameVotes.set(opportunity.projectKey, votes);
  }
  for (const record of mealsRecords) {
    const project = projectMap.get(keyOf(record.project));
    const goal = goalFromTarget(record.sdgTarget);
    if (project && goal && project.goals.length === 0) {
      project.goals.push(goal);
      project.targets.push(record.sdgTarget!);
    }
  }
  for (const project of projectMap.values()) {
    const votes = [...(nameVotes.get(project.key) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]);
    project.name = votes[0]?.[0] ?? project.name;
    project.slug = slugify(project.name);
    project.goals.sort((a, b) => a - b);
  }
  for (const opportunity of opportunities) {
    const project = projectMap.get(opportunity.projectKey)!;
    opportunity.projectName = project.name;
    opportunity.projectSlug = project.slug;
    if (opportunity.goals.length === 0) opportunity.goals = [...project.goals];
  }

  diagnostics.unparsedDateFragments = opportunities.reduce((n, o) => n + o.dates.unparsed.length, 0);

  const hostTeams = new Map<string, HostTeam>();
  for (const o of opportunities) if (o.hostTeam) hostTeams.set(o.hostTeam.code, o.hostTeam);

  return {
    opportunities,
    projects: [...projectMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    hostTeams: [...hostTeams.values()].sort((a, b) => a.name.localeCompare(b.name)),
    contacts,
    resources,
    diagnostics,
    fetchedAt: fetchedAt.toISOString(),
    sourceUrl,
  };
}

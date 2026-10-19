import type { DateRange, ISODate, Opportunity, OpportunityType } from "@/types/domain";

type Range = Pick<DateRange, "start" | "end" | "weeks" | "precision">;

/** The fields filtering needs, so the client can work on slim card models. */
export interface Filterable {
  id: string;
  expaId: string | null;
  title: string;
  type: OpportunityType;
  projectName: string;
  projectSlug: string;
  sdgTarget: string | null;
  goals: number[];
  hostTeam: Opportunity["hostTeam"];
  country: string;
  booklet: { label: string } | null;
  dates: { ranges: Range[]; flexible: boolean };
  provisions: { meals: { status: Opportunity["provisions"]["meals"]["status"] } };
}
import { getSdg } from "@/lib/sdgs";
import { isISODate } from "@/lib/format";

export type SortKey = "soonest" | "title" | "project" | "host";

export interface Filters {
  q: string;
  from: ISODate | null;
  to: ISODate | null;
  goals: number[];
  projects: string[];
  hosts: string[];
  types: OpportunityType[];
  weeks: number[];
  /** Only opportunities where the sheet confirms meals are provided. */
  meals: boolean;
  /** When dates or a duration are chosen, also include listings whose dates can't be checked. */
  flexible: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  from: null,
  to: null,
  goals: [],
  projects: [],
  hosts: [],
  types: [],
  weeks: [],
  meals: false,
  flexible: false,
  sort: "soonest",
};

const SORT_KEYS: SortKey[] = ["soonest", "title", "project", "host"];

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function values(source: ParamSource, key: string): string[] {
  const raw = source instanceof URLSearchParams ? source.getAll(key) : ([] as string[]).concat(source[key] ?? []);
  return raw.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}

export function parseFilters(source: ParamSource): Filters {
  const one = (key: string) => values(source, key)[0] ?? "";
  let from = isISODate(one("from")) ? one("from") : null;
  let to = isISODate(one("to")) ? one("to") : null;
  if (from && to && from > to) [from, to] = [to, from];
  const ints = (key: string, min: number, max: number) =>
    [...new Set(values(source, key).map(Number).filter((n) => Number.isInteger(n) && n >= min && n <= max))].sort((a, b) => a - b);
  const sort = one("sort") as SortKey;

  return {
    q: one("q").slice(0, 120),
    from,
    to,
    goals: ints("sdg", 1, 17),
    projects: [...new Set(values(source, "project"))],
    hosts: [...new Set(values(source, "host"))],
    types: [...new Set(values(source, "type").map((t) => t.toUpperCase()))].filter(
      (t): t is OpportunityType => t === "IGV" || t === "IGT",
    ),
    weeks: ints("weeks", 1, 52),
    meals: one("meals") === "1",
    flexible: one("flexible") === "1",
    sort: SORT_KEYS.includes(sort) ? sort : "soonest",
  };
}

export function toSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.goals.length) params.set("sdg", filters.goals.join(","));
  if (filters.projects.length) params.set("project", filters.projects.join(","));
  if (filters.hosts.length) params.set("host", filters.hosts.join(","));
  if (filters.types.length) params.set("type", filters.types.join(","));
  if (filters.weeks.length) params.set("weeks", filters.weeks.join(","));
  if (filters.meals) params.set("meals", "1");
  if (filters.flexible) params.set("flexible", "1");
  if (filters.sort !== "soonest") params.set("sort", filters.sort);
  return params;
}

export function hasDateCriteria(filters: Pick<Filters, "from" | "to" | "weeks">): boolean {
  return Boolean(filters.from || filters.to || filters.weeks.length);
}

export function countActiveFilters(filters: Filters): number {
  return (
    (filters.q.trim() ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    filters.goals.length +
    filters.projects.length +
    filters.hosts.length +
    filters.types.length +
    filters.weeks.length +
    (filters.meals ? 1 : 0)
  );
}

/**
 * Inclusive interval overlap: a range matches a chosen period when
 * rangeStart <= periodEnd and rangeEnd >= periodStart. An open end of the
 * chosen period is unbounded. ISO date strings compare correctly as text.
 */
export function overlaps(range: Pick<DateRange, "start" | "end">, from: ISODate | null, to: ISODate | null): boolean {
  return (!to || range.start <= to) && (!from || range.end >= from);
}

export function rangeMatches(range: Range, filters: Pick<Filters, "from" | "to" | "weeks">): boolean {
  if (!overlaps(range, filters.from, filters.to)) return false;
  if (filters.weeks.length && (range.weeks === null || !filters.weeks.includes(range.weeks))) return false;
  return true;
}

export type DateMatch = "match" | "unknown" | "no";

/**
 * "unknown" means the listing can't be checked against the chosen dates:
 * it has no readable dates, or its dates are described as flexible.
 */
export function dateMatch(opportunity: Filterable, filters: Pick<Filters, "from" | "to" | "weeks">): DateMatch {
  if (!hasDateCriteria(filters)) return "match";
  if (opportunity.dates.ranges.some((r) => rangeMatches(r, filters))) return "match";
  if (opportunity.dates.flexible || opportunity.dates.ranges.length === 0) return "unknown";
  return "no";
}

export function matchingRanges<R extends Range>(
  opportunity: { dates: { ranges: R[] } },
  filters: Pick<Filters, "from" | "to" | "weeks">,
  today: ISODate,
): R[] {
  if (hasDateCriteria(filters)) return opportunity.dates.ranges.filter((r) => rangeMatches(r, filters));
  return upcomingRanges(opportunity, today);
}

export function upcomingRanges<R extends Range>(opportunity: { dates: { ranges: R[] } }, today: ISODate): R[] {
  return opportunity.dates.ranges.filter((r) => r.end >= today);
}

export function searchText(opportunity: Filterable): string {
  return [
    opportunity.title,
    opportunity.projectName,
    opportunity.hostTeam?.name,
    opportunity.hostTeam?.code,
    opportunity.booklet?.label,
    opportunity.sdgTarget ? `SDG ${opportunity.sdgTarget}` : "",
    ...opportunity.goals.map((g) => `SDG ${g} ${getSdg(g)?.name ?? ""}`),
    opportunity.country,
    opportunity.type === "IGV" ? "global volunteer volunteering" : "global talent internship",
    opportunity.expaId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesQuery(opportunity: Filterable, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = searchText(opportunity);
  return words.every((word) => haystack.includes(word));
}

type Facet = "goals" | "projects" | "hosts" | "types" | "weeks" | "meals" | "dates";

function passes(opportunity: Filterable, filters: Filters, skip?: Facet): boolean {
  if (!matchesQuery(opportunity, filters.q)) return false;
  if (skip !== "goals" && filters.goals.length && !opportunity.goals.some((g) => filters.goals.includes(g))) return false;
  if (skip !== "projects" && filters.projects.length && !filters.projects.includes(opportunity.projectSlug)) return false;
  if (skip !== "hosts" && filters.hosts.length && !(opportunity.hostTeam && filters.hosts.includes(opportunity.hostTeam.slug))) return false;
  if (skip !== "types" && filters.types.length && !filters.types.includes(opportunity.type)) return false;
  if (skip !== "meals" && filters.meals && opportunity.provisions.meals.status !== "included") return false;
  if (skip !== "dates") {
    const match = dateMatch(opportunity, skip === "weeks" ? { ...filters, weeks: [] } : filters);
    if (match === "no" || (match === "unknown" && !filters.flexible)) return false;
  }
  return true;
}

export interface FilterResult<T extends Filterable> {
  results: T[];
  /** Listings that match everything except that their dates can't be checked. */
  unknownDates: T[];
}

export function applyFilters<T extends Filterable>(opportunities: T[], filters: Filters, today: ISODate): FilterResult<T> {
  const results = opportunities.filter((o) => passes(o, filters));
  const unknownDates =
    hasDateCriteria(filters) && !filters.flexible
      ? opportunities.filter((o) => passes(o, filters, "dates") && dateMatch(o, filters) === "unknown")
      : [];
  return { results: sortOpportunities(results, filters, today), unknownDates };
}

export interface FacetCounts {
  goals: Map<number, number>;
  projects: Map<string, number>;
  hosts: Map<string, number>;
  types: Map<OpportunityType, number>;
  weeks: Map<number, number>;
  meals: number;
}

/** Counts for each filter option given every other active filter. */
export function facetCounts(opportunities: Filterable[], filters: Filters): FacetCounts {
  const counts: FacetCounts = {
    goals: new Map(),
    projects: new Map(),
    hosts: new Map(),
    types: new Map(),
    weeks: new Map(),
    meals: 0,
  };
  const bump = <K>(map: Map<K, number>, key: K) => map.set(key, (map.get(key) ?? 0) + 1);
  for (const o of opportunities) {
    if (passes(o, filters, "goals")) for (const g of new Set(o.goals)) bump(counts.goals, g);
    if (passes(o, filters, "projects")) bump(counts.projects, o.projectSlug);
    if (passes(o, filters, "hosts") && o.hostTeam) bump(counts.hosts, o.hostTeam.slug);
    if (passes(o, filters, "types")) bump(counts.types, o.type);
    if (passes(o, filters, "meals") && o.provisions.meals.status === "included") counts.meals++;
    if (passes(o, filters, "weeks")) {
      const weeks = new Set(
        o.dates.ranges.filter((r) => r.weeks !== null && overlaps(r, filters.from, filters.to)).map((r) => r.weeks as number),
      );
      for (const w of weeks) bump(counts.weeks, w);
    }
  }
  return counts;
}

/** Durations that appear in the data often enough to be a useful filter option. */
export function durationOptions(opportunities: Filterable[], minimum = 3): number[] {
  const tally = new Map<number, number>();
  for (const o of opportunities) {
    for (const w of new Set(o.dates.ranges.map((r) => r.weeks).filter((w): w is number => w !== null))) {
      tally.set(w, (tally.get(w) ?? 0) + 1);
    }
  }
  return [...tally.entries()].filter(([, n]) => n >= minimum).map(([w]) => w).sort((a, b) => a - b);
}

/** Next relevant start date: first matching range for a date search, else first upcoming range. */
export function nextStart(opportunity: Filterable, filters: Pick<Filters, "from" | "to" | "weeks">, today: ISODate): ISODate | null {
  return matchingRanges(opportunity, filters, today)[0]?.start ?? null;
}

function soonestRank(o: Filterable, filters: Filters, today: ISODate): [number, string] {
  const start = nextStart(o, filters, today);
  if (start) return [0, start];
  if (o.dates.flexible) return [1, ""];
  if (o.dates.ranges.length) return [2, o.dates.ranges[o.dates.ranges.length - 1].start];
  return [3, ""];
}

export function sortOpportunities<T extends Filterable>(list: T[], filters: Filters, today: ISODate): T[] {
  const byTitle = (a: T, b: T) => a.title.localeCompare(b.title);
  const sorted = [...list];
  switch (filters.sort) {
    case "title":
      return sorted.sort(byTitle);
    case "project":
      return sorted.sort((a, b) => a.projectName.localeCompare(b.projectName) || byTitle(a, b));
    case "host":
      return sorted.sort((a, b) => (a.hostTeam?.name ?? "~").localeCompare(b.hostTeam?.name ?? "~") || byTitle(a, b));
    default:
      return sorted.sort((a, b) => {
        const [ra, ka] = soonestRank(a, filters, today);
        const [rb, kb] = soonestRank(b, filters, today);
        if (ra !== rb) return ra - rb;
        // Past-only listings show the most recent first.
        if (ka !== kb) return ra === 2 ? kb.localeCompare(ka) : ka.localeCompare(kb);
        return byTitle(a, b);
      });
  }
}

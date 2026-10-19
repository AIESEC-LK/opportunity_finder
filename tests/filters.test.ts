import { describe, expect, it } from "vitest";
import {
  applyFilters,
  DEFAULT_FILTERS,
  dateMatch,
  facetCounts,
  type Filters,
  overlaps,
  parseFilters,
  toSearchParams,
} from "@/lib/filters";
import type { DateRange, Opportunity } from "@/types/domain";

const TODAY = "2026-10-19";

const range = (start: string, end: string, weeks: number | null = 6, precision: DateRange["precision"] = "day"): DateRange => ({
  start,
  end,
  precision,
  weeks,
  yearInferred: false,
  raw: `${start}-${end}`,
});

function make(id: string, overrides: Partial<Opportunity> & { ranges?: DateRange[]; flexible?: boolean } = {}): Opportunity {
  const { ranges = [], flexible = false, ...rest } = overrides;
  return {
    id,
    expaId: id,
    title: `Opportunity ${id}`,
    titleSource: "booklet",
    type: "IGV",
    typeSource: "url",
    projectKey: "heartbeat",
    projectName: "HeartBeat",
    projectSlug: "heartbeat",
    sdgTarget: "3.4",
    goals: [3],
    hostTeam: { code: "CC", name: "AIESEC in Colombo Central", slug: "cc" },
    country: "Sri Lanka",
    applicationUrl: `https://aiesec.org/opportunity/global-volunteer/${id}`,
    applicationUrlIssue: null,
    booklet: null,
    provisions: { accommodation: { status: "not_specified" }, meals: { status: "not_specified" } },
    dates: { ranges, flexible, slotTexts: [], unparsed: [] },
    sources: [{ tab: "Projects", row: 3 }],
    ...rest,
  };
}

const filters = (patch: Partial<Filters>): Filters => ({ ...DEFAULT_FILTERS, ...patch });

const novemberSix = make("1", { ranges: [range("2026-11-02", "2026-12-14")], provisions: { accommodation: { status: "not_specified" }, meals: { status: "included" } } });
const januaryFour = make("2", {
  ranges: [range("2027-01-01", "2027-01-29", 4)],
  projectName: "Global Classroom",
  projectSlug: "global-classroom",
  projectKey: "globalclassroom",
  goals: [4],
  hostTeam: { code: "Kandy", name: "AIESEC in Kandy", slug: "kandy" },
});
const pastOnly = make("3", { ranges: [range("2025-01-01", "2025-02-12")] });
const flexibleOnly = make("4", { flexible: true });
const monthWindow = make("5", { ranges: [range("2026-12-01", "2026-12-31", null, "month")], flexible: true });
const all = [novemberSix, januaryFour, pastOnly, flexibleOnly, monthWindow];

describe("overlaps", () => {
  it("matches intervals that intersect, inclusive of the edges", () => {
    const r = range("2026-11-02", "2026-12-14");
    expect(overlaps(r, "2026-12-14", "2026-12-20")).toBe(true);
    expect(overlaps(r, "2026-10-01", "2026-11-02")).toBe(true);
    expect(overlaps(r, "2026-12-15", "2026-12-20")).toBe(false);
    expect(overlaps(r, "2026-10-01", "2026-11-01")).toBe(false);
  });

  it("treats a missing end of the chosen period as open", () => {
    const r = range("2026-11-02", "2026-12-14");
    expect(overlaps(r, "2026-12-01", null)).toBe(true);
    expect(overlaps(r, null, "2026-11-02")).toBe(true);
    expect(overlaps(r, null, "2026-11-01")).toBe(false);
  });
});

describe("dateMatch", () => {
  it("separates listings whose dates can't be checked", () => {
    const f = { from: "2026-11-10", to: "2026-11-20", weeks: [] };
    expect(dateMatch(novemberSix, f)).toBe("match");
    expect(dateMatch(pastOnly, f)).toBe("no");
    expect(dateMatch(flexibleOnly, f)).toBe("unknown");
    expect(dateMatch(make("x"), f)).toBe("unknown");
  });

  it("matches a month window by overlap", () => {
    expect(dateMatch(monthWindow, { from: "2026-12-20", to: "2026-12-24", weeks: [] })).toBe("match");
  });
});

describe("applyFilters", () => {
  it("returns everything with no filters, soonest upcoming first and past-only last", () => {
    const { results } = applyFilters(all, DEFAULT_FILTERS, TODAY);
    expect(results.map((o) => o.id)).toEqual(["1", "5", "2", "4", "3"]);
  });

  it("combines a date range with SDG, project, host team and meals filters", () => {
    expect(applyFilters(all, filters({ from: "2026-11-01", to: "2027-01-31" }), TODAY).results.map((o) => o.id)).toEqual(["1", "5", "2"]);
    expect(applyFilters(all, filters({ from: "2026-11-01", to: "2027-01-31", goals: [4] }), TODAY).results.map((o) => o.id)).toEqual(["2"]);
    expect(applyFilters(all, filters({ hosts: ["kandy"] }), TODAY).results.map((o) => o.id)).toEqual(["2"]);
    expect(applyFilters(all, filters({ projects: ["heartbeat"], meals: true }), TODAY).results.map((o) => o.id)).toEqual(["1"]);
  });

  it("filters by duration on the same range that matches the dates", () => {
    expect(applyFilters(all, filters({ weeks: [4] }), TODAY).results.map((o) => o.id)).toEqual(["2"]);
    expect(applyFilters(all, filters({ weeks: [4], from: "2026-11-01", to: "2026-11-30" }), TODAY).results).toEqual([]);
  });

  it("reports flexible listings separately and includes them on request", () => {
    const strict = applyFilters(all, filters({ from: "2026-11-10", to: "2026-11-20" }), TODAY);
    expect(strict.results.map((o) => o.id)).toEqual(["1"]);
    expect(strict.unknownDates.map((o) => o.id)).toEqual(["4", "5"]);
    const loose = applyFilters(all, filters({ from: "2026-11-10", to: "2026-11-20", flexible: true }), TODAY);
    expect(loose.results.map((o) => o.id).sort()).toEqual(["1", "4", "5"]);
    expect(loose.unknownDates).toEqual([]);
  });

  it("returns an empty result when nothing matches", () => {
    const { results, unknownDates } = applyFilters(all, filters({ q: "no such placement anywhere" }), TODAY);
    expect(results).toEqual([]);
    expect(unknownDates).toEqual([]);
  });

  it("searches titles, projects, host teams and SDG names with every word required", () => {
    expect(applyFilters(all, filters({ q: "kandy classroom" }), TODAY).results.map((o) => o.id)).toEqual(["2"]);
    expect(applyFilters(all, filters({ q: "quality education" }), TODAY).results.map((o) => o.id)).toEqual(["2"]);
  });

  it("counts an opportunity once per goal even if it lists the goal twice", () => {
    const twice = make("9", { goals: [3, 3] });
    expect(facetCounts([twice], DEFAULT_FILTERS).goals.get(3)).toBe(1);
  });
});

describe("facetCounts", () => {
  it("counts each option against the other active filters", () => {
    const counts = facetCounts(all, filters({ goals: [4] }));
    expect(counts.goals.get(3)).toBe(4);
    expect(counts.goals.get(4)).toBe(1);
    expect(counts.projects.get("heartbeat")).toBeUndefined();
    expect(counts.projects.get("global-classroom")).toBe(1);
  });
});

describe("URL parameters", () => {
  it("round-trips filters", () => {
    const f = filters({ q: "turtles", from: "2026-11-01", to: "2026-12-01", goals: [14, 4], hosts: ["usj"], weeks: [6], meals: true, sort: "title" });
    const parsed = parseFilters(new URLSearchParams(toSearchParams(f).toString()));
    expect(parsed).toEqual({ ...f, goals: [4, 14] });
  });

  it("rejects invalid values instead of guessing", () => {
    const parsed = parseFilters({ from: "2026-02-30", to: "tomorrow", sdg: "0,4,99,x", type: "igv,abc", sort: "random" });
    expect(parsed).toMatchObject({ from: null, to: null, goals: [4], types: ["IGV"], sort: "soonest" });
  });

  it("swaps a reversed date range", () => {
    expect(parseFilters({ from: "2026-12-01", to: "2026-11-01" })).toMatchObject({ from: "2026-11-01", to: "2026-12-01" });
  });
});

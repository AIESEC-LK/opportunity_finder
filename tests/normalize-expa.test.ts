import { describe, expect, it } from "vitest";
import type { ExpaOpportunity } from "@/lib/data/expa";
import { buildExpaOpportunity, normalizeExpa, projectNameOf } from "@/lib/data/normalize-expa";
import { datasetSchema } from "@/lib/data/schema";

const ENDPOINT = "https://gis-api.aiesec.org/graphql";

/** A record shaped like EXPA's GraphQL response (fields trimmed to what we read). */
function expa(overrides: Partial<ExpaOpportunity> = {}): ExpaOpportunity {
  return {
    id: "1329320",
    title: "Heartbeat [4 weeks]",
    status: "open",
    location: "Colombo, Sri Lanka",
    programme: { short_name_display: "GV" },
    project: { id: "1328900", title: "Heartbeat [4 weeks]" },
    organisation: { name: "Ceylon Crystal House" },
    host_lc: { id: "221", name: "USJ" },
    sdg_info: { sdg_target: { goal_index: 3, target_index: 1 } },
    logistics_info: {
      food_provided: "provided",
      food_covered: "covered",
      no_of_meals: "3",
      accommodation_provided: "provided",
      accommodation_covered: "covered",
    },
    available_slots: [
      { id: "2", start_date: "2027-01-01", end_date: "2027-01-29", available_openings: 4, status: "open" },
      { id: "1", start_date: "2026-12-01", end_date: "2026-12-29", available_openings: 2, status: "open" },
    ],
    description: "  Run health awareness sessions in the community.  ",
    ...overrides,
  };
}

describe("projectNameOf", () => {
  it("drops duration tags and taglines", () => {
    expect(projectNameOf("Heartbeat [6 weeks]")).toBe("Heartbeat");
    expect(projectNameOf("Raise Your Voice - women/ gender non-conforming support centers")).toBe("Raise Your Voice");
    expect(projectNameOf("Skill Up! [6 weeks]")).toBe("Skill Up!");
  });

  it("falls back when there is no project title", () => {
    expect(projectNameOf(null)).toBe("Other");
    expect(projectNameOf("  ")).toBe("Other");
  });
});

describe("buildExpaOpportunity", () => {
  it("maps the core fields", () => {
    const o = buildExpaOpportunity(expa());
    expect(o).toMatchObject({
      id: "1329320",
      expaId: "1329320",
      title: "Ceylon Crystal House",
      titleSource: "expa",
      type: "IGV",
      projectName: "Heartbeat",
      projectSlug: "heartbeat",
      sdgTarget: "3.1",
      goals: [3],
      country: "Sri Lanka",
      applicationUrl: "https://aiesec.org/opportunity/global-volunteer/1329320",
      booklet: null,
    });
  });

  it("keeps EXPA's description and location, trimmed", () => {
    const o = buildExpaOpportunity(expa());
    expect(o.description).toBe("Run health awareness sessions in the community.");
    expect(o.location).toBe("Colombo, Sri Lanka");
    const empty = buildExpaOpportunity(expa({ description: "   ", location: null }));
    expect(empty.description).toBeNull();
    expect(empty.location).toBeNull();
  });

  it("maps EXPA committee ids to the app's host teams", () => {
    expect(buildExpaOpportunity(expa()).hostTeam).toEqual({ code: "USJ", name: "AIESEC in USJ", slug: "usj" });
    expect(buildExpaOpportunity(expa({ host_lc: { id: "1340", name: "COLOMBO SOUTH" } })).hostTeam?.code).toBe("CS");
    expect(buildExpaOpportunity(expa({ host_lc: null })).hostTeam).toBeNull();
  });

  it("turns slots into exact, sorted date ranges", () => {
    const { dates } = buildExpaOpportunity(expa());
    expect(dates.ranges.map((r) => [r.start, r.end, r.weeks, r.precision, r.yearInferred])).toEqual([
      ["2026-12-01", "2026-12-29", 4, "day", false],
      ["2027-01-01", "2027-01-29", 4, "day", false],
    ]);
    expect(dates.flexible).toBe(false);
  });

  it("skips full, undated and back-to-front slots", () => {
    const { dates } = buildExpaOpportunity(
      expa({
        available_slots: [
          { id: "a", start_date: "2027-02-01", end_date: "2027-03-01", available_openings: 0, status: "open" },
          { id: "b", start_date: null, end_date: "2027-03-01", available_openings: 3, status: "open" },
          { id: "c", start_date: "2027-04-01", end_date: "2027-03-01", available_openings: 3, status: "open" },
        ],
      }),
    );
    expect(dates.ranges).toEqual([]);
    expect(dates.slotTexts).toEqual([{ label: "EXPA", text: "No open slots listed" }]);
  });

  it("reads meals and accommodation from logistics_info", () => {
    const { provisions } = buildExpaOpportunity(expa());
    expect(provisions.meals).toMatchObject({ status: "included", detail: "3 meals per day" });
    expect(provisions.accommodation.status).toBe("included");
  });

  it("says 1 meal, not 1 meals", () => {
    const { provisions } = buildExpaOpportunity(expa({ logistics_info: { ...expa().logistics_info!, no_of_meals: "1" } }));
    expect(provisions.meals.detail).toBe("1 meal per day");
  });

  it("marks missing or negative logistics honestly", () => {
    const { provisions } = buildExpaOpportunity(
      expa({ logistics_info: { food_provided: "not_provided", food_covered: null, no_of_meals: null, accommodation_provided: null, accommodation_covered: null } }),
    );
    expect(provisions.meals.status).toBe("not_included");
    expect(provisions.accommodation.status).toBe("not_specified");
  });

  it("leaves goals empty when EXPA has no SDG", () => {
    const o = buildExpaOpportunity(expa({ sdg_info: null }));
    expect(o.goals).toEqual([]);
    expect(o.sdgTarget).toBeNull();
  });
});

describe("normalizeExpa", () => {
  const records = [
    expa(),
    expa({ id: "1298368", host_lc: { id: "222", name: "COLOMBO CENTRAL" }, organisation: { name: "Suwa Sahana" } }),
    expa({ id: "1286870", project: { id: "1", title: "Explorer" }, title: "Explorer", sdg_info: { sdg_target: { goal_index: 8, target_index: 9 } } }),
    expa({ id: "999", programme: { short_name_display: "GTa" } }),
  ];
  const dataset = normalizeExpa(records, ENDPOINT, new Date("2026-11-11T00:00:00Z"));

  it("produces a dataset the site's schema accepts", () => {
    expect(datasetSchema.safeParse(dataset).success).toBe(true);
  });

  it("keeps only Global Volunteer opportunities", () => {
    expect(dataset.opportunities.map((o) => o.id)).toEqual(["1329320", "1298368", "1286870"]);
  });

  it("groups opportunities into projects with their goals and host teams", () => {
    const heartbeat = dataset.projects.find((p) => p.slug === "heartbeat");
    expect(heartbeat).toMatchObject({ name: "Heartbeat", goals: [3], targets: ["3.1"], opportunityIds: ["1329320", "1298368"] });
    expect(heartbeat?.hostTeamCodes.sort()).toEqual(["CC", "USJ"]);
    expect(dataset.projects.map((p) => p.name)).toEqual(["Explorer", "Heartbeat"]);
  });

  it("takes planning links from the data file and has no sheet contacts", () => {
    expect(dataset.resources.map((r) => r.label)).toEqual(
      expect.arrayContaining(["Visa Guidelines", "Budget", "Country Booklet", "Country Content", "Testimonials"]),
    );
    expect(dataset.contacts).toEqual([]);
    expect(dataset.sourceUrl).toBe(ENDPOINT);
  });
});

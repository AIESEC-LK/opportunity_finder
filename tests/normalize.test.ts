import { describe, expect, it } from "vitest";
import { normalizeHostTeam, normalizeWorkbook } from "@/lib/data/normalize";
import { datasetSchema } from "@/lib/data/schema";
import { readWorkbook } from "@/lib/data/xlsx";
import { buildXlsx, LISTING_HEADER, opp, type TestSheet } from "./helpers/xlsx";

const VIEW_URL = "https://docs.google.com/spreadsheets/d/test/edit";

function load(sheets: TestSheet[]) {
  return normalizeWorkbook(readWorkbook(buildXlsx(sheets)), VIEW_URL, new Date("2026-10-19T00:00:00Z"));
}

const booklet = (label: string, id: string) => ({ text: label, link: `https://drive.google.com/file/d/${id}/view` });
const photos = (id: string) => ({ text: "Accommodation", link: `https://drive.google.com/drive/folders/${id}` });

const projectsTab: TestSheet = {
  name: "Projects",
  rows: [
    ...LISTING_HEADER,
    // row 3-5: HeartBeat block (SDG + project merged down), CC has two opportunities
    ["3.4", "HeartBeat", "CC", "1 Jan - 12 Feb", "Flexible slots", opp(1001), booklet("Heartbeat - Suwa Sahana.pdf", "a"), photos("p1"), true],
    [null, null, null, "12 Feb - 26 Mar", null, opp(1002), booklet("Heartbeat - Pahan Piyasa.pdf", "b"), photos("p2"), false],
    [null, null, "USJ", null, "22 Dec - 2 Feb\n2 Feb - 16 Mar", opp(1003), booklet("USJ iGV Project Booklet - Heartbeat Ceylon Crystal House.pdf", "c"), null, null],
    // row 6: merged-filler row under the USJ entry: no content of its own
    [null, null, null, null, null, null, null, null, false],
    // row 7: a new project with no SDG cell
    [null, "Raise\nYour\nVoice", "Kandy", null, "Flexible Slots", opp(1004), booklet("Raise your voice", "d"), photos("p4"), true],
    // row 8: a project heading with nothing listed under it
    [null, "Eco City", null, null, null, null, null, null, false],
    // row 9: invalid link, link text names the placement
    ["4.6", "Global\n Classroom", "Ruhuna", null, "Flexible", { text: "Sri Bodhiraja College", link: "javascript:alert(1)" }, null, { text: "provided", link: "" }, "3 Meals"],
    // row 10: a duplicate of opportunity 1001 elsewhere in the tab
    ["3.4", "Heartbeat", "CC", null, "2 Sep, 2026 - 14 Oct, 2026", opp(1001), null, null, true],
  ],
  merges: ["A3:A6", "B3:B6", "C3:C4", "C5:C6"],
};

const fourWeekTab: TestSheet = {
  name: "4 Week GV Projects",
  rows: [
    ...LISTING_HEADER,
    // The same Global Classroom project under a second SDG target.
    ["4.7", "Global Classroom", "CN", null, "1 Jan - 29 Jan", opp(2001), booklet("GC-Aiko Child Care (1).pdf", "e"), photos("p5"), true],
  ],
};

const mealsTab: TestSheet = {
  name: "Food Provided",
  rows: [
    ["#SDG", "Project Name", "Entity", "Available Slots", "Available Slots", "Available Slots", "Details", null, "Accommodation", "Food"],
    [null, null, null, 2024, 2025, 2026, "Project Link", "Project Booklet", null, null],
    ["3.4", "HeartBeat", "CC", null, null, null, opp(1002), null, null, "1 meal per day"],
    ["5.1", "Raise Your Voice", "Kandy", null, null, null, opp(1004), null, null, "3 meals per day provided\n(not covered)"],
    [null, null, null, null, null, null, opp(9999), null, null, "2 meals per day"],
  ],
};

const welcomeTab: TestSheet = {
  name: "Welcome",
  rows: [[null, "National Search Tool"], [null, "Budget", { text: "Link", link: "https://docs.google.com/spreadsheets/d/budget/edit" }]],
};

const contactTab: TestSheet = {
  name: "Contact Sheet",
  rows: [
    ["LC", "IR VP", "WhatsApp", "Email", "Telegram", "LC Instagram"],
    ["CC", "Chanuli", "(+94)71 000 0000", "someone@aiesec.net", "", "@colombo_central"],
    ["Kandy", "Inuri", "", "not-an-email", "", "https://www.instagram.com/lc_kandy"],
  ],
};

const dataset = load([welcomeTab, { name: "Hidden copy", rows: LISTING_HEADER, hidden: true }, projectsTab, fourWeekTab, mealsTab, contactTab]);
const byId = (id: string) => dataset.opportunities.find((o) => o.id === id)!;

describe("normalizeWorkbook", () => {
  it("produces a dataset that satisfies the runtime schema", () => {
    expect(datasetSchema.safeParse(dataset).success).toBe(true);
  });

  it("uses the EXPA opportunity number as the id and merges duplicate rows", () => {
    const ids = dataset.opportunities.map((o) => o.id).filter((id) => /^\d+$/.test(id));
    expect(ids.sort()).toEqual(["1001", "1002", "1003", "1004", "2001"]);
    expect(dataset.diagnostics.duplicatesMerged).toBe(1);
    const merged = byId("1001");
    expect(merged.sources).toEqual([
      { tab: "Projects", row: 3 },
      { tab: "Projects", row: 10 },
    ]);
    expect(merged.dates.ranges.map((r) => r.start)).toEqual(["2025-01-01", "2026-09-02"]);
  });

  it("carries merged SDG, project and host-team cells down to the rows they group", () => {
    expect(byId("1002")).toMatchObject({ projectName: "HeartBeat", sdgTarget: "3.4", hostTeam: { code: "CC" } });
    expect(byId("1003")).toMatchObject({ sdgTarget: "3.4", hostTeam: { code: "USJ", name: "AIESEC in USJ" } });
  });

  it("skips layout-only rows silently and reports headings with nothing under them", () => {
    expect(dataset.opportunities.some((o) => o.sources.some((s) => s.row === 6))).toBe(false);
    expect(dataset.diagnostics.skippedRows).toContainEqual(expect.objectContaining({ tab: "Projects", row: 8 }));
  });

  it("ignores hidden tabs", () => {
    expect(dataset.diagnostics.tabsRead.map((t) => t.name)).not.toContain("Hidden copy");
  });

  it("counts a project once even when it appears in several tabs and under several SDG targets", () => {
    const names = dataset.projects.map((p) => p.name);
    expect(names).toEqual(["Global Classroom", "HeartBeat", "Raise Your Voice"]);
    const gc = dataset.projects.find((p) => p.slug === "global-classroom")!;
    expect(gc.targets.sort()).toEqual(["4.6", "4.7"]);
    expect(gc.goals).toEqual([4]);
    expect(gc.opportunityIds).toHaveLength(2);
  });

  it("takes an SDG from the meals tab only for projects the listing tabs give none", () => {
    const ryv = dataset.projects.find((p) => p.slug === "raise-your-voice")!;
    expect(ryv.goals).toEqual([5]);
    expect(byId("1004").goals).toEqual([5]);
    expect(byId("1004").sdgTarget).toBeNull();
  });

  it("derives readable titles from link text or booklet names, with a fallback", () => {
    expect(byId("1001").title).toBe("Suwa Sahana");
    expect(byId("1003").title).toBe("Ceylon Crystal House");
    expect(byId("2001").title).toBe("Aiko Child Care");
    expect(byId("1004")).toMatchObject({ title: "Raise Your Voice · Kandy", titleSource: "fallback" });
    const ruhuna = dataset.opportunities.find((o) => o.hostTeam?.code === "Ruhuna")!;
    expect(ruhuna).toMatchObject({ title: "Sri Bodhiraja College", titleSource: "link-text" });
  });

  it("never renders an unsafe or missing application link", () => {
    const ruhuna = dataset.opportunities.find((o) => o.hostTeam?.code === "Ruhuna")!;
    expect(ruhuna.applicationUrl).toBeNull();
    expect(ruhuna.applicationUrlIssue).toMatch(/not a valid web address/);
    expect(ruhuna.id).toMatch(/^r/);
    expect(dataset.diagnostics.invalidUrls).toContainEqual(expect.objectContaining({ row: 9 }));
    expect(byId("1001").applicationUrl).toBe("https://aiesec.org/opportunity/global-volunteer/1001");
  });

  it("treats differently-cased entity codes as one host team", () => {
    expect(normalizeHostTeam("RUHUNA")).toEqual(normalizeHostTeam("Ruhuna "));
    expect(normalizeHostTeam("CN (flexible slots)")).toEqual({ code: "CN", name: "AIESEC in Colombo North", slug: "cn" });
    expect(normalizeHostTeam("Moratuwa")).toEqual({ code: "Moratuwa", name: "AIESEC in Moratuwa", slug: "moratuwa" });
  });

  it("reads the opportunity type from the link", () => {
    expect(byId("1001")).toMatchObject({ type: "IGV", typeSource: "url" });
  });

  it("reads meals from the checkbox and the meals tab without overclaiming", () => {
    expect(byId("1001").provisions.meals.status).toBe("included");
    // Checkbox unticked but the meals tab lists a meal: conflicting -> not specified.
    expect(byId("1002").provisions.meals.status).toBe("not_specified");
    // Blank cell is not a "no".
    expect(byId("1003").provisions.meals.status).toBe("not_specified");
    // "provided (not covered)" is ambiguous.
    expect(byId("1004").provisions.meals.status).toBe("not_specified");
    expect(dataset.diagnostics.supplementaryUnmatched).toHaveLength(1);
  });

  it("accommodation is included by default; photo links are preserved", () => {
    // Photo link row: status is included, and the photo link is kept.
    expect(byId("1001").provisions.accommodation).toMatchObject({ status: "included", link: { url: "https://drive.google.com/drive/folders/p1" } });
    // No sheet data: defaults to included (accommodation is included for all projects by policy).
    expect(byId("1003").provisions.accommodation.status).toBe("included");
    const ruhuna = dataset.opportunities.find((o) => o.hostTeam?.code === "Ruhuna")!;
    expect(ruhuna.provisions.accommodation.status).toBe("included");
  });

  it("reads contacts and resource links", () => {
    expect(dataset.resources).toEqual([{ label: "Budget", url: "https://docs.google.com/spreadsheets/d/budget/edit" }]);
    expect(dataset.contacts[0]).toMatchObject({ hostTeamCode: "CC", email: "someone@aiesec.net", instagram: { url: "https://www.instagram.com/colombo_central/" } });
    expect(dataset.contacts[1].email).toBeNull();
  });

  it("keeps the original slot text for display", () => {
    expect(byId("1003").dates.slotTexts).toEqual([{ label: "2026", text: "22 Dec - 2 Feb\n2 Feb - 16 Mar" }]);
    expect(byId("1003").dates.ranges[0].start).toBe("2025-12-22");
  });
});

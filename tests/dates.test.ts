import { describe, expect, it } from "vitest";
import { daysBetween, dedupeRanges, parseSlotText } from "@/lib/data/dates";

const spans = (text: string, year: number | null = 2026) =>
  parseSlotText(text, year).ranges.map((r) => `${r.start}..${r.end}`);

describe("parseSlotText", () => {
  it("reads newline-separated day ranges using the column year", () => {
    expect(spans("1 Jan - 12 Feb\n12 Feb - 26 Mar", 2025)).toEqual(["2025-01-01..2025-02-12", "2025-02-12..2025-03-26"]);
  });

  it("accepts month-first dates, ordinals and missing spaces", () => {
    expect(spans("Jan 12-Feb 12")).toEqual(["2026-01-12..2026-02-12"]);
    expect(spans("3rd Mar-14th Apr")).toEqual(["2026-03-03..2026-04-14"]);
    expect(spans("Apr 20-1Jun")).toEqual(["2026-04-20..2026-06-01"]);
    expect(spans("15 July - Aug 25")).toEqual(["2026-07-15..2026-08-25"]);
  });

  it("tolerates misspelt months seen in the sheet", () => {
    expect(spans("16 Mr - 27 Apr")).toEqual(["2026-03-16..2026-04-27"]);
    expect(spans("11 Agust - 22 September")).toEqual(["2026-08-11..2026-09-22"]);
    expect(spans("1 sept - 13 Oct")).toEqual(["2026-09-01..2026-10-13"]);
  });

  it("prefers years written in the text over the column year", () => {
    expect(spans("5 Jan, 2026 - 16 Feb, 2026", 2025)).toEqual(["2026-01-05..2026-02-16"]);
    expect(spans("8 Sep 2026 - 20 Oct 2026", 2025)).toEqual(["2026-09-08..2026-10-20"]);
  });

  it("rolls a range that crosses New Year into the next year", () => {
    expect(spans("1 Dec - 12 Jan", 2025)).toEqual(["2025-12-01..2026-01-12"]);
    expect(spans("15 Dec - 26 Jan 2026", 2025)).toEqual(["2025-12-15..2026-01-26"]);
  });

  it("places an opening Oct–Dec run in the previous year when the list continues from January", () => {
    expect(spans("22 Dec - 2 Feb\n2 Feb - 16 Mar\n16 Mar - 27 Apr", 2026)).toEqual([
      "2025-12-22..2026-02-02",
      "2026-02-02..2026-03-16",
      "2026-03-16..2026-04-27",
    ]);
    // A list that runs Jun -> Nov is left alone.
    expect(spans("7 Jun - 19 Jul\n28 Nov - 9 Jan", 2026)).toEqual(["2026-06-07..2026-07-19", "2026-11-28..2027-01-09"]);
  });

  it("carries an explicit start year forward to later ranges in the cell", () => {
    expect(spans("8 Dec- 16 Jan 2026\n2 Jan 2026- 13 Feb\n26th Jan-6th March", 2025)).toEqual([
      "2025-12-08..2026-01-16",
      "2026-01-02..2026-02-13",
      "2026-01-26..2026-03-06",
    ]);
  });

  it("splits ranges separated only by long runs of spaces", () => {
    expect(spans("5 Jan - 16 Feb          3 May - 14 Jun")).toEqual(["2026-01-05..2026-02-16", "2026-05-03..2026-06-14"]);
  });

  it("reads month-only lists as month windows and joins consecutive months", () => {
    const result = parseSlotText("Jan,Feb,Mar\n(Flexible)", 2026);
    expect(result.flexible).toBe(true);
    expect(result.ranges).toHaveLength(1);
    expect(result.ranges[0]).toMatchObject({ start: "2026-01-01", end: "2026-03-31", precision: "month", weeks: null });
    expect(spans("Dec-Jan", 2025)).toEqual(["2025-12-01..2026-01-31"]);
    expect(spans("Flexible (Feb,May , June , July )")).toEqual(["2026-02-01..2026-02-28", "2026-05-01..2026-07-31"]);
  });

  it("computes the duration in weeks", () => {
    expect(parseSlotText("1 Jan - 12 Feb", 2025).ranges[0].weeks).toBe(6);
    expect(parseSlotText("1 Jan - 29 Jan", 2026).ranges[0].weeks).toBe(4);
  });

  it("marks flexible wording without inventing dates", () => {
    for (const text of ["Flexible Slots", "Flexible per request", "Flexible slots year around", "Flesxible Slots"]) {
      const result = parseSlotText(text, 2026);
      expect(result.flexible).toBe(true);
      expect(result.ranges).toEqual([]);
    }
  });

  it("reports fragments it cannot read instead of guessing", () => {
    expect(parseSlotText("29 May - Jul", 2026).unparsed).toContain("29 May - Jul");
    expect(parseSlotText("Flexible slots From April onwards", 2026)).toMatchObject({ ranges: [], flexible: true, unparsed: ["April"] });
    expect(parseSlotText("31 Jun - 12 Jul", 2026).unparsed).toEqual(["31 Jun - 12 Jul"]);
    expect(parseSlotText("4", 2026).unparsed).toEqual(["4"]);
  });

  it("does not invent a year when the column has none", () => {
    const result = parseSlotText("1 Jan - 12 Feb", null);
    expect(result.ranges).toEqual([]);
    expect(result.unparsed).toEqual(["1 Jan - 12 Feb"]);
  });

  it("ignores words that merely start like a month", () => {
    expect(parseSlotText("On the Map - Marvel", 2026).ranges).toEqual([]);
    expect(parseSlotText("(4 weeks avaliable)", 2026)).toMatchObject({ ranges: [], unparsed: [] });
  });

  it("flags inferred years", () => {
    expect(parseSlotText("1 Jan - 12 Feb", 2026).ranges[0].yearInferred).toBe(true);
    expect(parseSlotText("5 Jan, 2026 - 16 Feb, 2026", 2026).ranges[0].yearInferred).toBe(false);
  });
});

describe("date helpers", () => {
  it("counts days without timezone drift across DST changes", () => {
    expect(daysBetween("2026-03-01", "2026-04-01")).toBe(31);
    expect(daysBetween("2026-10-20", "2026-11-03")).toBe(14);
  });

  it("dedupes and sorts ranges", () => {
    const a = parseSlotText("1 Jun - 13 Jul\n1 Jan - 12 Feb", 2026).ranges;
    const b = parseSlotText("1 Jun - 13 Jul", 2026).ranges;
    expect(dedupeRanges([...a, ...b]).map((r) => r.start)).toEqual(["2026-01-01", "2026-06-01"]);
  });
});

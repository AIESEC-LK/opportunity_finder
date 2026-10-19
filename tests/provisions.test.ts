import { describe, expect, it } from "vitest";
import { accommodationProvision, mealsProvision, readMealsText } from "@/lib/data/provisions";
import { titleFromBooklet, titleFromLinkText } from "@/lib/data/titles";

describe("meals", () => {
  it("reads meal counts", () => {
    expect(readMealsText("3 Meals Per Day")).toEqual({ kind: "included", detail: "3 meals per day" });
    expect(readMealsText("1 meals per day")).toEqual({ kind: "included", detail: "1 meal per day" });
    expect(readMealsText("3 Meals Per Working Day")).toEqual({ kind: "included", detail: "3 meals per working day" });
  });

  it("treats mixed statements as unclear", () => {
    expect(readMealsText("3 meals per day provided\n(not covered)").kind).toBe("unclear");
    expect(readMealsText("ask the LC").kind).toBe("unclear");
  });

  it("distinguishes included, not included and not specified", () => {
    expect(mealsProvision({ checkbox: [true], texts: [] }).status).toBe("included");
    expect(mealsProvision({ checkbox: [false], texts: [] }).status).toBe("not_included");
    expect(mealsProvision({ checkbox: [], texts: [] }).status).toBe("not_specified");
    expect(mealsProvision({ checkbox: [], texts: ["Meals not provided"] }).status).toBe("not_included");
    expect(mealsProvision({ checkbox: [true], texts: ["2 Meals Per Day"] })).toMatchObject({ status: "included", detail: "2 meals per day" });
  });

  it("does not resolve conflicts in either direction", () => {
    expect(mealsProvision({ checkbox: [false], texts: ["1 meal per day"] }).status).toBe("not_specified");
    expect(mealsProvision({ checkbox: [true], texts: ["Meals not provided"] }).status).toBe("not_specified");
  });
});

describe("accommodation", () => {
  it("never treats a blank as not included", () => {
    expect(accommodationProvision({ texts: [], urls: [] }).status).toBe("not_specified");
  });

  it("keeps photo links but does not claim inclusion", () => {
    const result = accommodationProvision({ texts: ["Accommodation Pictures"], urls: ["https://drive.google.com/x"] });
    expect(result).toMatchObject({ status: "not_specified", link: { url: "https://drive.google.com/x" } });
  });

  it("accepts explicit wording", () => {
    expect(accommodationProvision({ texts: ["provided"], urls: [] }).status).toBe("included");
    expect(accommodationProvision({ texts: ["Not provided"], urls: [] }).status).toBe("not_included");
  });

  it("drops unsafe photo links", () => {
    expect(accommodationProvision({ texts: ["Photos"], urls: ["javascript:void(0)"] }).link).toBeUndefined();
  });
});

describe("titles", () => {
  it("strips booklet boilerplate", () => {
    expect(titleFromBooklet("USJ iGV Project Booklet - Heartbeat Navajeevana Rehabilitation.pdf", "HeartBeat", "USJ")).toBe("Navajeevana Rehabilitation");
    expect(titleFromBooklet("Happy Bus (Kashyapa Vidyalaya)_Matching Interview_PPT.pptx", "Happy Bus", "CN")).toBe("Kashyapa Vidyalaya");
    expect(titleFromBooklet("GC- Next Gen Motivation  (2) (1).pdf", "Global Classroom", "CC")).toBe("Next Gen Motivation");
    expect(titleFromBooklet("Green leader mahanama.pdf", "Green Leaders", "Rajarata")).toBe("Mahanama");
  });

  it("returns null when nothing meaningful is left", () => {
    for (const label of ["Project Booklet", "Global Classroom (8).pdf", "Skill Up - CN", "Project IR Booklet", "IGV - Rooted 2.0 Project Booklet 26.27_.pdf.pdf", "Project Happy Bus Booklet - AIESEC in Kandy.pdf"]) {
      expect(titleFromBooklet(label, label.includes("Rooted") ? "Rooted" : label.includes("Happy") ? "Happy Bus" : label.includes("Skill") ? "Skill Up" : "Global Classroom", "CN")).toBeNull();
    }
  });

  it("uses link text that names the placement", () => {
    expect(titleFromLinkText("Azure Seafood Restaurant | Global Volunteer | AIESEC", "Ruhuna")).toBe("Azure Seafood Restaurant");
    expect(titleFromLinkText("Global Volunteer - Skyden International School", "Ruhuna")).toBe("Skyden International School");
    expect(titleFromLinkText("Link", "CC")).toBeNull();
    expect(titleFromLinkText("4 week: link\n6 week: Link", "SLIIT")).toBeNull();
    expect(titleFromLinkText("JAPAN GLOBAL CLASSROOM", "Ruhuna")).toBe("Japan Global Classroom");
  });
});

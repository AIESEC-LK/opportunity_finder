import { describe, expect, it } from "vitest";
import type { ExpaManager, ExpaPosition } from "@/lib/data/expa";
import { formatPhone, normalizeWebsite, pickContacts } from "@/lib/data/normalize-expa";

const TODAY = "2026-11-13";
const HOST_LC = "221";
const ICX = "ICX - Incoming Exchange";

function position(role: string, overrides: Partial<ExpaPosition> = {}): ExpaPosition {
  return {
    title: `${role} title`,
    status: "active",
    start_date: "2026-08-01",
    end_date: "2027-07-31",
    role: { name: role },
    function: { name: ICX },
    office: { id: HOST_LC, tag: "LC" },
    ...overrides,
  };
}

let nextId = 1;
function manager(name: string, positions: ExpaPosition[], extra: Partial<ExpaManager> = {}): ExpaManager {
  return {
    id: String(nextId++),
    full_name: name,
    aiesec_email: `${name.toLowerCase().replace(/\s/g, ".")}@aiesec.net`,
    contact_detail: null,
    current_positions: positions,
    ...extra,
  };
}

const national = (name: string, role = "MCVP") => manager(name, [position(role, { office: { id: "1623", tag: "MC" } })]);
const lcvp = (name: string) => manager(name, [position("LCVP")]);
const tl = (name: string) => manager(name, [position("TL")]);
const names = (ms: ExpaManager[]) => pickContacts(ms, HOST_LC, TODAY).map((c) => c.name);

describe("pickContacts", () => {
  it("shows every host-LC iGV LCVP, and no one else once there are two or more", () => {
    expect(names([tl("Team A"), lcvp("Lcvp A"), lcvp("Lcvp B"), lcvp("Lcvp C")])).toEqual(["Lcvp A", "Lcvp B", "Lcvp C"]);
  });

  it("puts national managers first and always shows them", () => {
    expect(names([lcvp("Lcvp A"), national("Mcvp A"), national("Estl A", "ESTL"), lcvp("Lcvp B")])).toEqual([
      "Mcvp A",
      "Estl A",
      "Lcvp A",
      "Lcvp B",
    ]);
  });

  it("fills up to two with iGV team leads, in EXPA order", () => {
    expect(names([tl("Team A"), lcvp("Lcvp A"), tl("Team B"), tl("Team C")])).toEqual(["Lcvp A", "Team A"]);
    expect(names([tl("Team A"), tl("Team B"), tl("Team C")])).toEqual(["Team A", "Team B"]);
  });

  it("never pads with people who don't qualify", () => {
    const member = manager("Member A", [position("TM")]);
    const noRole = manager("No Role", []);
    const otherFunction = manager("Finance Lead", [position("TL", { function: { name: "FIN - Finance" } })]);
    const president = manager("President A", [position("LCP", { function: { name: "President" } })]);
    expect(names([member, noRole, otherFunction, president, lcvp("Lcvp A")])).toEqual(["Lcvp A"]);
    expect(names([member, noRole])).toEqual([]);
  });

  it("ignores roles that ended, haven't started or aren't active", () => {
    const ended = manager("Ended", [position("LCVP", { end_date: "2026-07-31" })]);
    const future = manager("Future", [position("LCVP", { start_date: "2027-01-01" })]);
    const inactive = manager("Inactive", [position("LCVP", { status: "inactive" })]);
    expect(names([ended, future, inactive])).toEqual([]);
  });

  it("treats another LC's LCVP as a team lead, not as the host LCVP", () => {
    const otherLc = manager("Other Lcvp", [position("LCVP", { office: { id: "999", tag: "LC" } })]);
    const picked = pickContacts([otherLc, lcvp("Lcvp A"), tl("Team A")], HOST_LC, TODAY);
    expect(picked.map((c) => [c.name, c.level])).toEqual([
      ["Lcvp A", "lcvp"],
      ["Other Lcvp", "team"],
    ]);
  });

  it("keeps only what EXPA has: title, phone with country code, aiesec.net email", () => {
    const [c] = pickContacts(
      [manager("Lcvp A", [position("LCVP", { title: "LCVP iGV B2B" })], { contact_detail: { phone: "0771234567", country_code: "94" }, aiesec_email: "Lcvp.A@AIESEC.net" })],
      HOST_LC,
      TODAY,
    );
    expect(c).toEqual({ name: "Lcvp A", title: "LCVP iGV B2B", phone: "+94 771234567", email: "lcvp.a@aiesec.net", level: "lcvp" });

    const [bare] = pickContacts([manager("Lcvp B", [position("LCVP", { title: null })], { aiesec_email: "someone@gmail.com" })], HOST_LC, TODAY);
    expect(bare).toEqual({ name: "Lcvp B", title: "LCVP", phone: null, email: null, level: "lcvp" });
  });

  it("shows each person once", () => {
    const both = manager("Both", [position("LCVP"), position("TL")]);
    expect(names([both, tl("Team A")])).toEqual(["Both", "Team A"]);
  });
});

describe("formatPhone", () => {
  it("joins the country code and drops a local leading zero", () => {
    expect(formatPhone("077 123 4567", "+94")).toBe("+94 771234567");
    expect(formatPhone("771234567", "94")).toBe("+94 771234567");
    expect(formatPhone("0771234567", null)).toBe("0771234567");
    expect(formatPhone("", "94")).toBeNull();
  });
});

describe("normalizeWebsite", () => {
  it("adds https:// and rejects junk", () => {
    expect(normalizeWebsite("www.example.org")).toBe("https://www.example.org/");
    expect(normalizeWebsite("https://facebook.com/partner")).toBe("https://facebook.com/partner");
    expect(normalizeWebsite("n/a")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
  });
});

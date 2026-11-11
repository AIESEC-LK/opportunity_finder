import { describe, expect, it } from "vitest";
import { contactFor } from "@/lib/catalog";
import { confirmedLcvp, ENTITY_CONTACTS, MCVP, type EntityContacts } from "@/lib/contact-directory";
import type { Contact, Dataset } from "@/types/domain";

const person = (confirmed: boolean, name = "Test Person") => ({
  role: "LCVP",
  name,
  email: "lcvp@example.org",
  phone: "+94 70 000 0000",
  confirmed,
});

const entities: EntityContacts[] = [
  { code: "CS", name: "AIESEC in Colombo South", shortName: "Colombo South", lcvps: [person(false, "Placeholder"), person(true, "Real Person")] },
  { code: "Kandy", name: "AIESEC in Kandy", shortName: "Kandy", lcvps: [person(false)] },
];

const sheetContact: Contact = { hostTeamCode: "Kandy", person: "Sheet Person", email: "sheet@example.org", whatsapp: null, instagram: null };
const dataset = (contacts: Contact[] = []) => ({ contacts }) as unknown as Dataset;

describe("confirmedLcvp", () => {
  it("returns the first confirmed person, ignoring placeholders", () => {
    expect(confirmedLcvp("CS", entities)?.name).toBe("Real Person");
  });

  it("matches host team codes regardless of case", () => {
    expect(confirmedLcvp("cs", entities)?.name).toBe("Real Person");
  });

  it("returns nothing when only placeholders exist", () => {
    expect(confirmedLcvp("Kandy", entities)).toBeUndefined();
    expect(confirmedLcvp("Unknown", entities)).toBeUndefined();
  });

  it("skips confirmed people with no email or phone", () => {
    const noWay = [{ ...entities[0], lcvps: [{ ...person(true), email: null, phone: null }] }];
    expect(confirmedLcvp("CS", noWay)).toBeUndefined();
  });
});

describe("contactFor", () => {
  it("uses a confirmed directory person first", () => {
    expect(contactFor(dataset([sheetContact]), "CS", entities)).toEqual({
      hostTeamCode: "CS",
      person: "Real Person",
      email: "lcvp@example.org",
      whatsapp: "+94 70 000 0000",
      instagram: null,
    });
  });

  it("falls back to the sheet's contact when no one is confirmed", () => {
    expect(contactFor(dataset([sheetContact]), "Kandy", entities)?.person).toBe("Sheet Person");
  });

  it("shows nothing on EXPA data without a confirmed person", () => {
    expect(contactFor(dataset(), "Kandy", entities)).toBeUndefined();
    expect(contactFor(dataset(), undefined, entities)).toBeUndefined();
  });
});

describe("the shipped directory", () => {
  it("has no confirmed people yet, so no placeholder reaches opportunity pages", () => {
    const everyone = [MCVP, ...ENTITY_CONTACTS.flatMap((e) => e.lcvps)];
    expect(everyone.filter((p) => p.confirmed)).toEqual([]);
  });
});

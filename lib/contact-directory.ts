import { HOST_TEAMS } from "@/lib/data/config";

/** A person shown on the contact page. Null fields render as placeholders. */
export interface DirectoryPerson {
  role: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface EntityContacts {
  code: string;
  name: string;
  shortName: string;
  lcvps: DirectoryPerson[];
}

const emptyPerson = (role: string): DirectoryPerson => ({
  role,
  name: null,
  email: null,
  phone: null,
});

/** Member Committee VP for incoming Global Volunteer. Fill in when names are confirmed. */
export const MCVP: DirectoryPerson = emptyPerson("MCVP");

/** Local Committee VPs, grouped by entity. Add more LCVP entries under an entity as needed. */
export const ENTITY_CONTACTS: EntityContacts[] = Object.values(HOST_TEAMS)
  .map((team) => ({
    code: team.code,
    name: team.name,
    shortName: team.name.replace(/^AIESEC in /, ""),
    lcvps: [emptyPerson("LCVP")],
  }))
  .sort((a, b) => a.shortName.localeCompare(b.shortName));

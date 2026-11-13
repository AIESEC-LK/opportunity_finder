import { HOST_TEAMS } from "@/lib/data/config";

/** A person shown on the contact page. Null fields render as placeholders. */
export interface DirectoryPerson {
  role: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  /**
   * True only once the team has checked these are real, current details.
   * Opportunity pages show confirmed people only, so volunteers never get a
   * placeholder number. Set it when replacing a placeholder with real details.
   */
  confirmed: boolean;
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
  confirmed: false,
});

/** Member Committee VP for incoming Global Volunteer. */
export const MCVP: DirectoryPerson = {
  role: "MCVP",
  name: "Dinan Jayasuriya",
  email: "dinan.jayasuriya@aiesec.net",
  phone: "+94 77 347 0464",
  confirmed: true,
};

/**
 * Real LCVP contacts keyed by team.code (matches HOST_TEAMS[*].code exactly).
 * Leave a field as null when the detail is not yet available.
 */
const LCVP_DATA: Record<string, Omit<DirectoryPerson, "role">> = {
  // Colombo Central
  CC: {
    name: "Chanuli Indigahawela",
    email: "chanuli.indigahawela@aiesec.net",
    phone: "+94 71 204 4353",
    confirmed: true,
  },
  // Colombo North
  CN: {
    name: "Nirmani Weerakoon",
    email: "nirmani.weerakoon01@aiesec.net",
    phone: "+94 70 341 6997",
    confirmed: true,
  },
  // Colombo South
  CS: {
    name: "Sanuthmi",
    email: "sanuthmika@aiesec.net",
    phone: "+94 78 541 7354",
    confirmed: true,
  },
  // Kandy  (team.code is "Kandy", not "KANDY")
  Kandy: {
    name: "Inuri Liyanage",
    email: "inuriliyanage@aiesec.net",
    phone: "+94 71 241 7751",
    confirmed: true,
  },
  // USJ
  USJ: {
    name: "Navapriyah",
    email: "priyah24.25@aiesec.net",
    phone: "+94 75 055 3351",
    confirmed: true,
  },
  // SLIIT
  SLIIT: {
    name: "Dinidi Senanayake",
    email: "dinidisenanayake@aiesec.net",
    phone: "+94 76 638 8408",
    confirmed: true,
  },
  // Ruhuna  (team.code is "Ruhuna")
  Ruhuna: {
    name: "Kojee Kehara",
    email: "Kojeekehara02@aiesec.net",
    phone: "+94 72 777 0925",
    confirmed: true,
  },
  // NSBM
  NSBM: {
    name: "Vismitha Gunasekara",
    email: "vagunasekara@aiesec.net",
    phone: "+94 78 829 8929",
    confirmed: true,
  },
  // NIBM
  NIBM: {
    name: "Venuki Wijeratne",
    email: "venukiwijeratne@aiesec.net",
    phone: "+94 78 299 8998",
    confirmed: true,
  },
  // Rajarata  (team.code is "Rajarata")
  Rajarata: {
    name: "Kavya Lakmini",
    email: "kavyalakmini@aiesec.net",
    phone: "+94 77 935 3214",
    confirmed: true,
  },
  // Wayamba  (team.code is "Wayamba")
  Wayamba: {
    name: "Pakeetharan Balamurali",
    email: "balamuralipakeetharan@aiesec.net",
    phone: "+94 77 191 0998",
    confirmed: true,
  },
};

export const ENTITY_CONTACTS: EntityContacts[] = Object.values(HOST_TEAMS)
  .map((team) => {
    const data = LCVP_DATA[team.code];
    return {
      code: team.code,
      name: team.name,
      shortName: team.name.replace(/^AIESEC in /, ""),
      lcvps: [
        data
          ? { role: "LCVP", ...data }
          : emptyPerson("LCVP"),
      ],
    };
  })
  .sort((a, b) => a.shortName.localeCompare(b.shortName));

/** The first confirmed LCVP with a way to reach them, for a host team code ("CS", "Kandy"). */
export function confirmedLcvp(
  hostTeamCode: string,
  entities: EntityContacts[] = ENTITY_CONTACTS,
): DirectoryPerson | undefined {
  const entity = entities.find((e) => e.code.toLowerCase() === hostTeamCode.toLowerCase());
  return entity?.lcvps.find((p) => p.confirmed && (p.email || p.phone));
}

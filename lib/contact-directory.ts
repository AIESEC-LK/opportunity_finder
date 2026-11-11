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
export const MCVP: DirectoryPerson = {
  role: "MCVP",
  name: "Amal Perera",
  email: "mcvp.igv@aiesec.lk",
  phone: "+94 71 234 5678",
};

/** Local Committee VPs, grouped by entity. Add more LCVP entries under an entity as needed. */
const DUMMY_LCVP_PHONES: Record<string, { name: string; email: string; phone: string }> = {
  CC:      { name: "Kasun Silva",     email: "lcvp@aiesec-cc.lk",      phone: "+94 76 111 2233" },
  CN:      { name: "Dilini Fernando", email: "lcvp@aiesec-cn.lk",      phone: "+94 77 222 3344" },
  CS:      { name: "Nuwan Jayasena",  email: "lcvp@aiesec-cs.lk",      phone: "+94 71 333 4455" },
  USJ:     { name: "Sachini Wijesiri",email: "lcvp@aiesec-usj.lk",     phone: "+94 70 444 5566" },
  KANDY:   { name: "Ravindu Herath",  email: "lcvp@aiesec-kandy.lk",   phone: "+94 75 555 6677" },
  RUHUNA:  { name: "Tharushi Peiris", email: "lcvp@aiesec-ruhuna.lk",  phone: "+94 78 666 7788" },
  SLIIT:   { name: "Binura Gunasekara",email:"lcvp@aiesec-sliit.lk",   phone: "+94 72 777 8899" },
  NIBM:    { name: "Malsha Rathnayake",email:"lcvp@aiesec-nibm.lk",    phone: "+94 74 888 9900" },
  NSBM:    { name: "Chanuka Abeywickrama",email:"lcvp@aiesec-nsbm.lk", phone: "+94 71 900 1122" },
  WAYAMBA: { name: "Sewmini Liyanage", email:"lcvp@aiesec-wayamba.lk", phone: "+94 76 011 2233" },
  RAJARATA:{ name: "Pasan Dissanayake",email:"lcvp@aiesec-rajarata.lk",phone: "+94 77 122 3344" },
};

export const ENTITY_CONTACTS: EntityContacts[] = Object.values(HOST_TEAMS)
  .map((team) => {
    const dummy = DUMMY_LCVP_PHONES[team.code];
    return {
      code: team.code,
      name: team.name,
      shortName: team.name.replace(/^AIESEC in /, ""),
      lcvps: [
        dummy
          ? { role: "LCVP", name: dummy.name, email: dummy.email, phone: dummy.phone }
          : emptyPerson("LCVP"),
      ],
    };
  })
  .sort((a, b) => a.shortName.localeCompare(b.shortName));

/**
 * Facts about the sheet's structure that the normaliser relies on. Each one
 * was verified by inspecting the sheet and the existing Apps Script search
 * tool; update them here if the sheet's layout changes.
 */

/** The spreadsheet provided as the source of truth. */
export const DEFAULT_SHEET_ID = "1j6IkDXwEbCLA2Jt2YYuJcL8E2YTnYjudADOAVxirjZI";

/**
 * Every listing is hosted by AIESEC in Sri Lanka: the sheet is the national
 * iGV search tool of AIESEC in Sri Lanka (see its Welcome tab and the Apps
 * Script page title). The sheet has no country column.
 */
export const SOURCE_COUNTRY = "Sri Lanka";

/** Tab that only supplements meal details for opportunities listed elsewhere. */
export const MEALS_TAB = /food provided/i;
export const CONTACTS_TAB = /contact/i;
export const WELCOME_TAB = /welcome/i;

export interface HostTeamInfo {
  /** Display code, e.g. "CC", "Kandy". */
  code: string;
  name: string;
  /** The entity's own AIESEC logo in /public/entities; null shows the name only. Display only. */
  logo: string | null;
  /** The logo has white lettering and needs a dark background. */
  logoOnDark?: boolean;
}

/**
 * The AIESEC in Sri Lanka entities that host projects, keyed by the upper-case
 * code used in the sheet's Entity column. CC, CN and CS expand as in the
 * existing Apps Script tool.
 */
export const HOST_TEAMS: Record<string, HostTeamInfo> = {
  CC: { code: "CC", name: "AIESEC in Colombo Central", logo: "/entities/aiesec-cc.png" },
  CN: { code: "CN", name: "AIESEC in Colombo North", logo: "/entities/aiesec-cn.png" },
  CS: { code: "CS", name: "AIESEC in Colombo South", logo: "/entities/aiesec-cs.jpg" },
  USJ: { code: "USJ", name: "AIESEC in USJ", logo: "/entities/aiesec-usj.png", logoOnDark: true },
  KANDY: { code: "Kandy", name: "AIESEC in Kandy", logo: "/entities/aiesec-kandy.png" },
  RUHUNA: { code: "Ruhuna", name: "AIESEC in Ruhuna", logo: "/entities/aiesec-ruhuna.png" },
  SLIIT: { code: "SLIIT", name: "AIESEC in SLIIT", logo: "/entities/aiesec-sliit-default.png" },
  NIBM: { code: "NIBM", name: "AIESEC in NIBM", logo: "/entities/aiesec-nibm.png" },
  NSBM: { code: "NSBM", name: "AIESEC in NSBM", logo: "/entities/aiesec-nsbm.png" },
  WAYAMBA: { code: "Wayamba", name: "AIESEC in Wayamba", logo: "/entities/aiesec-wayamba.png" },
  RAJARATA: { code: "Rajarata", name: "AIESEC in Rajarata", logo: "/entities/aiesec-rajarata.png" },
};

/** Short forms of project names used in booklet file names. */
export const PROJECT_ABBREVIATIONS: Record<string, string[]> = {
  globalclassroom: ["GC", "GCR"],
  onthemap: ["OTM"],
  heartbeat: ["HB"],
};

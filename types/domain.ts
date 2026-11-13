/** A calendar date with no time or timezone, formatted YYYY-MM-DD. */
export type ISODate = string;

export interface DateRange {
  start: ISODate;
  end: ISODate;
  /** "month" when the sheet only names months, e.g. "Jan, Feb (Flexible)". */
  precision: "day" | "month";
  /** True when at least one year was not written in the sheet. */
  yearInferred: boolean;
  /** The fragment of sheet text this range was read from. */
  raw: string;
  /** Rounded length in weeks; null for month-precision windows. */
  weeks: number | null;
}

export interface SlotText {
  /** The column heading the text sits under, e.g. "2026". */
  label: string;
  text: string;
}

export interface OpportunityDates {
  ranges: DateRange[];
  /** The sheet describes the dates as flexible, year-round or on request. */
  flexible: boolean;
  /** Raw "Available Slots" cells exactly as written. */
  slotTexts: SlotText[];
  /** Date-like fragments that could not be read reliably. */
  unparsed: string[];
}

export type ProvisionStatus = "included" | "not_included" | "not_specified";

export interface Provision {
  status: ProvisionStatus;
  /** Short confirmed detail, e.g. "3 meals per day". */
  detail?: string;
  /** Plain-language explanation of how the status was determined. */
  note?: string;
  link?: { label: string; url: string };
  /** Original cell text(s) the status was derived from. */
  sourceText?: string[];
}

export interface Provisions {
  accommodation: Provision;
  meals: Provision;
}

export type OpportunityType = "IGV" | "IGT";

export interface HostTeam {
  /** Normalised code as written in the sheet, e.g. "CC", "Kandy". */
  code: string;
  /** Readable name, e.g. "AIESEC in Colombo Central". */
  name: string;
  slug: string;
}

export interface SourceRef {
  tab: string;
  row: number;
}

export interface Opportunity {
  /** EXPA opportunity number when the sheet links to one, else a stable hash. */
  id: string;
  expaId: string | null;
  title: string;
  /** Where the title came from, so the UI can be honest about it. */
  titleSource: "link-text" | "booklet" | "fallback" | "expa";
  type: OpportunityType;
  /** "url" = read from the opportunity link; "sheet" = the sheet is the iGV search tool. */
  typeSource: "url" | "sheet" | "expa";
  projectKey: string;
  projectName: string;
  projectSlug: string;
  /** SDG target exactly as written, e.g. "3.4". */
  sdgTarget: string | null;
  goals: number[];
  hostTeam: HostTeam | null;
  country: string;
  applicationUrl: string | null;
  /** Why there is no usable application link, when there isn't one. */
  applicationUrlIssue: string | null;
  booklet: { label: string; url: string | null } | null;
  /** What volunteers do, written by the host team in EXPA. The sheet has none. */
  description?: string | null;
  /** Place within the country, e.g. "Kegalle, Sri Lanka" (EXPA). */
  location?: string | null;
  /** People to ask about this opportunity, picked from its EXPA managers. */
  contacts?: OpportunityContact[];
  /** The partner organisation's own website (EXPA). */
  partnerWebsite?: string | null;
  provisions: Provisions;
  dates: OpportunityDates;
  sources: SourceRef[];
}

/** Why a manager is shown: national team, the host LC's iGV LCVP, or another iGV team lead. */
export type ContactLevel = "national" | "lcvp" | "team";

export interface OpportunityContact {
  name: string;
  /** Their current position, e.g. "LCVP iGV B2B". */
  title: string | null;
  /** With country code, e.g. "+94 771234567". */
  phone: string | null;
  /** Their @aiesec.net address. */
  email: string | null;
  level: ContactLevel;
}

export interface Project {
  key: string;
  slug: string;
  name: string;
  goals: number[];
  targets: string[];
  opportunityIds: string[];
  hostTeamCodes: string[];
}

export interface Contact {
  hostTeamCode: string;
  person: string | null;
  email: string | null;
  whatsapp: string | null;
  instagram: { label: string; url: string | null } | null;
}

export interface ResourceLink {
  label: string;
  url: string;
}

export interface SkippedRow {
  tab: string;
  row: number;
  reason: string;
}

export interface Diagnostics {
  tabsRead: { name: string; role: string; rows: number }[];
  recordsRead: number;
  duplicatesMerged: number;
  skippedRows: SkippedRow[];
  invalidUrls: { tab: string; row: number; value: string }[];
  unparsedDateFragments: number;
  supplementaryUnmatched: SkippedRow[];
}

export interface Dataset {
  opportunities: Opportunity[];
  projects: Project[];
  hostTeams: HostTeam[];
  contacts: Contact[];
  resources: ResourceLink[];
  diagnostics: Diagnostics;
  fetchedAt: string;
  sourceUrl: string;
}

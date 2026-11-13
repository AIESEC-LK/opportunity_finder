/**
 * Reads open opportunities straight from EXPA's GraphQL API (spike).
 *
 * The token is aiesec.org's public guest token, read from EXPA_TOKEN on the
 * server only. It is never sent to the browser: this module is only reached
 * through lib/data/source.ts, which pages call via the server-only loader.
 */
import { dataSettings } from "./settings";
import { SourceUnavailableError } from "./source-error";

export interface ExpaSlot {
  id: string;
  start_date: string | null;
  end_date: string | null;
  available_openings: number | null;
  status: string | null;
}

export interface ExpaOpportunity {
  id: string;
  title: string | null;
  status: string | null;
  programme: { short_name_display: string | null } | null;
  project: { id: string; title: string | null } | null;
  organisation: { name: string | null } | null;
  host_lc: { id: string; name: string | null } | null;
  sdg_info: { sdg_target: { goal_index: number | null; target_index: number | null } | null } | null;
  logistics_info: {
    food_provided: string | null;
    food_covered: string | null;
    no_of_meals: string | null;
    accommodation_provided: string | null;
    accommodation_covered: string | null;
  } | null;
  available_slots: ExpaSlot[] | null;
  location: string | null;
  description: string | null;
}

export interface ExpaPosition {
  title: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  role: { name: string | null } | null;
  function: { name: string | null } | null;
  office: { id: string; tag: string | null } | null;
}

export interface ExpaManager {
  id: string;
  full_name: string | null;
  aiesec_email: string | null;
  contact_detail: { phone: string | null; country_code: string | null } | null;
  current_positions: ExpaPosition[] | null;
}

/** Data only a private key can read. Missing when the key can't see it. */
export interface ExpaExtras {
  managers: ExpaManager[];
  website: string | null;
}

export interface ExpaConfig {
  endpoint: string;
  token: string;
  committee: number;
  timeoutMs: number;
}

const QUERY = `query Opportunities($page: Int, $perPage: Int, $filters: OpportunityFilter) {
  opportunities(page: $page, per_page: $perPage, filters: $filters) {
    data {
      id title status location description
      programme { short_name_display }
      project { id title }
      organisation { name }
      host_lc { id name }
      sdg_info { sdg_target { goal_index target_index } }
      logistics_info { food_provided food_covered no_of_meals accommodation_provided accommodation_covered }
      available_slots { id start_date end_date available_openings status }
    }
    paging { total_pages current_page }
  }
}`;

const EXTRAS_QUERY = `query OpportunityExtras($page: Int, $perPage: Int, $filters: OpportunityFilter) {
  opportunities(page: $page, per_page: $perPage, filters: $filters) {
    data {
      id
      organisation { website }
      managers {
        id full_name aiesec_email
        contact_detail { phone country_code }
        current_positions { title status start_date end_date role { name } function { name } office { id tag } }
      }
    }
    paging { total_pages }
  }
}`;

const PER_PAGE = 100;

export function expaConfig(): ExpaConfig {
  return {
    endpoint: process.env.EXPA_GRAPHQL_URL?.trim() || "https://gis-api.aiesec.org/graphql",
    token: process.env.EXPA_TOKEN?.trim() ?? "",
    committee: Number(process.env.EXPA_COMMITTEE_ID ?? 1623),
    timeoutMs: dataSettings().timeoutMs,
  };
}

type Page<T> = { data: T[]; paging: { total_pages: number } };

/** Runs one paged opportunities query to the end. Throws SourceUnavailableError on any failure. */
async function fetchAllPages<T>(query: string, config: ExpaConfig): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    let response: Response;
    try {
      response = await fetch(config.endpoint, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: config.token },
        body: JSON.stringify({
          query,
          variables: { page, perPage: PER_PAGE, filters: { committee: config.committee, programmes: [7], status: "open" } },
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch (error) {
      throw new SourceUnavailableError("EXPA could not be reached.", String(error));
    }
    if (response.status === 401 || response.status === 403) {
      throw new SourceUnavailableError("EXPA rejected the access token.", "The public token may have changed; update EXPA_TOKEN.");
    }
    if (!response.ok) throw new SourceUnavailableError(`EXPA responded with HTTP ${response.status}.`);

    const body = (await response.json()) as { data?: { opportunities: Page<T> }; errors?: { message: string }[] };
    if (body.errors?.length || !body.data) {
      const detail = body.errors?.map((e) => e.message).join("; ");
      if (detail && /authori[sz]/i.test(detail)) throw new SourceUnavailableError("EXPA rejected the access token.", detail);
      throw new SourceUnavailableError("EXPA returned an error.", detail);
    }
    all.push(...body.data.opportunities.data);
    if (page >= body.data.opportunities.paging.total_pages) break;
  }
  return all;
}

function requireToken(config: ExpaConfig) {
  if (!config.token) {
    throw new SourceUnavailableError("EXPA is selected as the data source but EXPA_TOKEN is not set.");
  }
}

/** Fetches every open Global Volunteer opportunity hosted by the committee. */
export async function fetchExpaOpportunities(config = expaConfig()): Promise<ExpaOpportunity[]> {
  requireToken(config);
  return fetchAllPages<ExpaOpportunity>(QUERY, config);
}

/**
 * Fetches managers and partner websites, keyed by opportunity id. These need a
 * private key; with the public one EXPA refuses, and this returns an empty map
 * so the opportunity list still loads (just without contacts).
 */
export async function fetchExpaExtras(config = expaConfig()): Promise<Map<string, ExpaExtras>> {
  requireToken(config);
  type Row = { id: string; organisation: { website: string | null } | null; managers: ExpaManager[] | null };
  try {
    const rows = await fetchAllPages<Row>(EXTRAS_QUERY, config);
    return new Map(rows.map((r) => [String(r.id), { managers: r.managers ?? [], website: r.organisation?.website ?? null }]));
  } catch (error) {
    if (!(error instanceof SourceUnavailableError)) throw error;
    console.warn(`EXPA contacts unavailable, showing opportunities without them: ${error.message}`);
    return new Map();
  }
}

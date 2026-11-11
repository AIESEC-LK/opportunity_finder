import { z } from "zod";
import type { Dataset } from "@/types/domain";
import { DEFAULT_SHEET_ID } from "./config";
import { expaConfig, fetchExpaOpportunities } from "./expa";
import { normalizeWorkbook } from "./normalize";
import { normalizeExpa } from "./normalize-expa";
import { datasetSchema } from "./schema";
import { dataSettings, dataSource, type DataSettings, type DataSource } from "./settings";
import { SourceUnavailableError } from "./source-error";
import { readWorkbook } from "./xlsx";

export { dataSource, SourceUnavailableError };

/**
 * Fetches the opportunity data — from EXPA by default, or from the Google
 * Sheet with DATA_SOURCE=sheet — and keeps the normalised dataset in memory.
 *
 * - Fresh for DATA_CACHE_SECONDS (default 10 minutes); filter changes never
 *   trigger a request because filtering happens on already-loaded data.
 * - After that, the cached copy is served while one background refresh runs.
 * - A failed refresh keeps the last good copy for up to DATA_MAX_STALE_SECONDS.
 * - With no good copy, the error is thrown so the page can say so. There is
 *   no fallback data.
 *
 * The cache is per server process. On serverless hosting each instance keeps
 * its own copy; that only affects how often the source is fetched.
 */

export interface SourceConfig extends DataSettings {
  sheetId: string;
  exportUrl: string;
  /** Link people can open to view the sheet. */
  viewUrl: string;
}

export function sourceConfig(): SourceConfig {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim() || DEFAULT_SHEET_ID;
  return {
    sheetId,
    exportUrl:
      process.env.GOOGLE_SHEET_XLSX_URL?.trim() ||
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`,
    viewUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    ...dataSettings(),
  };
}

async function fetchExpaDataset(): Promise<Dataset> {
  const dataset = normalizeExpa(await fetchExpaOpportunities(), expaConfig().endpoint);
  const check = datasetSchema.safeParse(dataset);
  if (!check.success) {
    throw new SourceUnavailableError("EXPA's data came back in a shape this site can't read safely.", z.prettifyError(check.error));
  }
  return dataset;
}

/** Fetches once, without the cache. Scripts pass "sheet" to read the sheet whatever DATA_SOURCE says. */
export async function fetchDataset(source: DataSource = dataSource(), config = sourceConfig()): Promise<Dataset> {
  if (source === "expa") return fetchExpaDataset();
  let response: Response;
  try {
    response = await fetch(config.exportUrl, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    throw new SourceUnavailableError("The Google Sheet could not be reached.", String(error));
  }

  const type = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    throw new SourceUnavailableError(`The Google Sheet responded with HTTP ${response.status}.`);
  }
  if (type.includes("text/html")) {
    // Google answers a restricted sheet with a sign-in page instead of the file.
    throw new SourceUnavailableError(
      "The Google Sheet is not publicly readable.",
      "Share it as 'Anyone with the link can view', or publish it to the web and set GOOGLE_SHEET_XLSX_URL.",
    );
  }

  const data = new Uint8Array(await response.arrayBuffer());
  let dataset: Dataset;
  try {
    dataset = normalizeWorkbook(readWorkbook(data), config.viewUrl);
  } catch (error) {
    throw new SourceUnavailableError("The Google Sheet could not be read.", String(error));
  }
  const check = datasetSchema.safeParse(dataset);
  if (!check.success) {
    throw new SourceUnavailableError(
      "The Google Sheet's layout has changed in a way this site can't read safely.",
      z.prettifyError(check.error),
    );
  }
  return dataset;
}

interface CacheState {
  dataset?: Dataset;
  loadedAt?: number;
  inflight?: Promise<Dataset>;
  lastError?: string;
}

const globalCache = globalThis as typeof globalThis & { __opportunitySheetCache?: CacheState };
const cache: CacheState = (globalCache.__opportunitySheetCache ??= {});

function refresh(config: SourceConfig): Promise<Dataset> {
  cache.inflight ??= fetchDataset(dataSource(), config)
    .then((dataset) => {
      cache.dataset = dataset;
      cache.loadedAt = Date.now();
      cache.lastError = undefined;
      return dataset;
    })
    .catch((error: unknown) => {
      cache.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    })
    .finally(() => {
      cache.inflight = undefined;
    });
  return cache.inflight;
}

export async function getDataset(): Promise<Dataset> {
  const config = sourceConfig();
  const age = cache.loadedAt ? (Date.now() - cache.loadedAt) / 1000 : Infinity;

  if (cache.dataset && age < config.ttlSeconds) return cache.dataset;
  if (cache.dataset && age < config.ttlSeconds + config.maxStaleSeconds) {
    refresh(config).catch(() => {
      // Keep serving the last good copy; lastError records the failure.
    });
    return cache.dataset;
  }
  return refresh(config);
}

export function cacheStatus(): { loadedAt: string | null; lastError: string | null } {
  return {
    loadedAt: cache.loadedAt ? new Date(cache.loadedAt).toISOString() : null,
    lastError: cache.lastError ?? null,
  };
}

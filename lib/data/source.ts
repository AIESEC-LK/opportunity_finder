import { z } from "zod";
import type { Dataset } from "@/types/domain";
import { DEFAULT_SHEET_ID } from "./config";
import { normalizeWorkbook } from "./normalize";
import { datasetSchema } from "./schema";
import { readWorkbook } from "./xlsx";

/**
 * Fetches the Google Sheet and keeps the normalised dataset in memory.
 *
 * - Fresh for SHEET_CACHE_SECONDS (default 10 minutes); filter changes never
 *   trigger a request because filtering happens on already-loaded data.
 * - After that, the cached copy is served while one background refresh runs.
 * - A failed refresh keeps the last good copy for up to SHEET_MAX_STALE_SECONDS.
 * - With no good copy, the error is thrown so the page can say so. There is
 *   no fallback data.
 *
 * The cache is per server process. On serverless hosting each instance keeps
 * its own copy; that only affects how often the sheet is fetched.
 */

export class SourceUnavailableError extends Error {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "SourceUnavailableError";
  }
}

export interface SourceConfig {
  sheetId: string;
  exportUrl: string;
  /** Link people can open to view the sheet. */
  viewUrl: string;
  ttlSeconds: number;
  maxStaleSeconds: number;
  timeoutMs: number;
}

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function sourceConfig(): SourceConfig {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim() || DEFAULT_SHEET_ID;
  return {
    sheetId,
    exportUrl:
      process.env.GOOGLE_SHEET_XLSX_URL?.trim() ||
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`,
    viewUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    ttlSeconds: numberEnv("SHEET_CACHE_SECONDS", 600),
    maxStaleSeconds: numberEnv("SHEET_MAX_STALE_SECONDS", 86_400),
    timeoutMs: numberEnv("SHEET_FETCH_TIMEOUT_MS", 20_000),
  };
}

export async function fetchDataset(config = sourceConfig()): Promise<Dataset> {
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
  cache.inflight ??= fetchDataset(config)
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

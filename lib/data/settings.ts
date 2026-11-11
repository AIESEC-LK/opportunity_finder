/**
 * Settings shared by both data sources. The DATA_* names are current; the
 * older SHEET_* names are still read so existing servers keep working.
 */

function numberSetting(names: string[], fallback: number): number {
  for (const name of names) {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === "") continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return fallback;
}

export interface DataSettings {
  /** Seconds a fetched copy is treated as fresh. */
  ttlSeconds: number;
  /** Extra seconds an older copy may be served while refreshing or after a failure. */
  maxStaleSeconds: number;
  /** Timeout for one fetch, in milliseconds. */
  timeoutMs: number;
}

export function dataSettings(): DataSettings {
  return {
    ttlSeconds: numberSetting(["DATA_CACHE_SECONDS", "SHEET_CACHE_SECONDS"], 600),
    maxStaleSeconds: numberSetting(["DATA_MAX_STALE_SECONDS", "SHEET_MAX_STALE_SECONDS"], 86_400),
    timeoutMs: numberSetting(["DATA_FETCH_TIMEOUT_MS", "SHEET_FETCH_TIMEOUT_MS"], 20_000),
  };
}

export type DataSource = "sheet" | "expa";

/** EXPA unless DATA_SOURCE=sheet (the fallback while the sheet is still kept up to date). */
export function dataSource(): DataSource {
  return process.env.DATA_SOURCE?.trim().toLowerCase() === "sheet" ? "sheet" : "expa";
}

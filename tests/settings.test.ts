import { afterEach, describe, expect, it, vi } from "vitest";
import { dataSettings, dataSource } from "@/lib/data/settings";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("dataSource", () => {
  it("is EXPA by default", () => {
    vi.stubEnv("DATA_SOURCE", "");
    expect(dataSource()).toBe("expa");
  });

  it("uses the sheet only when asked", () => {
    vi.stubEnv("DATA_SOURCE", " Sheet ");
    expect(dataSource()).toBe("sheet");
    vi.stubEnv("DATA_SOURCE", "something-else");
    expect(dataSource()).toBe("expa");
  });
});

describe("dataSettings", () => {
  it("has sensible defaults", () => {
    for (const name of ["DATA_CACHE_SECONDS", "SHEET_CACHE_SECONDS", "DATA_MAX_STALE_SECONDS", "SHEET_MAX_STALE_SECONDS", "DATA_FETCH_TIMEOUT_MS", "SHEET_FETCH_TIMEOUT_MS"]) {
      vi.stubEnv(name, "");
    }
    expect(dataSettings()).toEqual({ ttlSeconds: 600, maxStaleSeconds: 86_400, timeoutMs: 20_000 });
  });

  it("still reads the old SHEET_* names", () => {
    vi.stubEnv("DATA_CACHE_SECONDS", "");
    vi.stubEnv("SHEET_CACHE_SECONDS", "120");
    expect(dataSettings().ttlSeconds).toBe(120);
  });

  it("prefers the new DATA_* names", () => {
    vi.stubEnv("DATA_CACHE_SECONDS", "60");
    vi.stubEnv("SHEET_CACHE_SECONDS", "120");
    expect(dataSettings().ttlSeconds).toBe(60);
  });

  it("ignores invalid values", () => {
    vi.stubEnv("DATA_FETCH_TIMEOUT_MS", "-5");
    vi.stubEnv("SHEET_FETCH_TIMEOUT_MS", "abc");
    expect(dataSettings().timeoutMs).toBe(20_000);
  });
});

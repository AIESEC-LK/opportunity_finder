import "server-only";
import { connection } from "next/server";
import type { Dataset } from "@/types/domain";
import { getDataset, SourceUnavailableError } from "./source";

export type LoadResult = { ok: true; dataset: Dataset } | { ok: false; message: string; detail?: string };

/**
 * Loads the dataset at request time. Failures are returned rather than
 * thrown so pages can explain them (production builds redact thrown errors).
 */
export async function loadDataset(): Promise<LoadResult> {
  await connection();
  try {
    return { ok: true, dataset: await getDataset() };
  } catch (error) {
    console.error("[opportunity-finder] source unavailable:", error);
    if (error instanceof SourceUnavailableError) {
      return { ok: false, message: error.message, detail: error.detail };
    }
    return { ok: false, message: "The opportunity list could not be loaded." };
  }
}

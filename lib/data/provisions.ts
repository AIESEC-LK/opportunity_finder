import type { Provision } from "@/types/domain";
import { clean, safeUrl } from "./text";

/**
 * Rule-based reading of the Accommodation and Food columns. Anything the
 * rules cannot read with confidence is reported as "not specified", with the
 * original text kept so people can read it themselves.
 */

export interface MealsInput {
  /** The Food checkbox in a listing tab (TRUE / FALSE), when present. */
  checkbox: boolean[];
  /** Food text from listing tabs or the "Food Provided" tab. */
  texts: string[];
}

type MealsReading =
  | { kind: "included"; detail: string | undefined }
  | { kind: "negative" }
  | { kind: "unclear" };

const NEGATIVE = /\b(not\s+(provided|included|covered)|no\s+meals?|none)\b/i;

export function readMealsText(text: string): MealsReading {
  const value = clean(text);
  if (!value) return { kind: "unclear" };
  // "3 meals per day provided (not covered)" mixes a positive and a negative;
  // "Meals not provided" is only a negative.
  const negative = NEGATIVE.test(value);
  const positive = /\d+\s*meals?\b|\bprovided\b|\bincluded\b/i.test(value.replace(new RegExp(NEGATIVE, "gi"), " "));
  if (positive && negative) return { kind: "unclear" };
  if (negative) return { kind: "negative" };
  const count = value.match(/(\d+)\s*meals?\b(.*)$/i);
  if (count) {
    const n = Number(count[1]);
    const rest = clean(count[2]).toLowerCase();
    return { kind: "included", detail: `${n} ${n === 1 ? "meal" : "meals"}${rest ? ` ${rest}` : ""}` };
  }
  if (/\b(provided|included|yes)\b/i.test(value)) return { kind: "included", detail: undefined };
  return { kind: "unclear" };
}

const quote = (values: string[]) => values.map((v) => `“${v}”`).join(", ");

export function mealsProvision({ checkbox, texts }: MealsInput): Provision {
  const uniqueTexts = [...new Set(texts.map(clean).filter(Boolean))];
  const readings = uniqueTexts.map(readMealsText);
  const ticked = checkbox.includes(true);
  const unticked = checkbox.includes(false) && !ticked;
  const sourceText = [...(checkbox.length ? [`Food checkbox: ${ticked ? "ticked" : "not ticked"}`] : []), ...uniqueTexts];

  if (readings.some((r) => r.kind === "unclear")) {
    return {
      status: "not_specified",
      note: `Listed as ${quote(uniqueTexts)}. Check with the host team whether meals are included.`,
      sourceText,
    };
  }

  const included = readings.filter((r): r is Extract<MealsReading, { kind: "included" }> => r.kind === "included");
  const negative = readings.some((r) => r.kind === "negative");

  if ((included.length && (negative || unticked)) || (negative && ticked)) {
    return {
      status: "not_specified",
      note: "The listing isn't clear about meals. Check with the host team.",
      sourceText,
    };
  }

  if (included.length) {
    const detail = included.map((r) => r.detail).find(Boolean);
    return { status: "included", detail, note: "Provided by the host.", sourceText };
  }
  if (ticked) {
    return { status: "included", note: "Provided by the host.", sourceText };
  }
  if (negative) {
    return { status: "not_included", note: "Plan to arrange your own meals.", sourceText };
  }
  if (unticked) {
    return { status: "not_included", note: "Plan to arrange your own meals.", sourceText };
  }
  return { status: "not_specified", note: "Not mentioned in the listing. Ask the host team." };
}

export interface AccommodationInput {
  texts: string[];
  urls: string[];
}

export function accommodationProvision({ texts, urls }: AccommodationInput): Provision {
  const uniqueTexts = [...new Set(texts.map(clean).filter(Boolean))];
  const url = urls.map((u) => safeUrl(u)).find((u): u is string => Boolean(u));
  const link = url ? { label: "View accommodation photos", url } : undefined;
  const all = uniqueTexts.join(" ");

  if (/\bnot\s+(provided|included)\b/i.test(all)) {
    return { status: "not_included", note: "Plan to arrange your own accommodation.", link, sourceText: uniqueTexts };
  }
  if (/\b(provided|included)\b/i.test(all)) {
    return { status: "included", note: "Provided by the host.", link, sourceText: uniqueTexts };
  }
  if (link) {
    return {
      status: "not_specified",
      note: "The host team has shared photos of where you'd stay. Ask them whether it's included and what it costs.",
      link,
      sourceText: uniqueTexts,
    };
  }
  if (uniqueTexts.length) {
    return {
      status: "not_specified",
      note: "Ask the host team whether accommodation is included.",
      sourceText: uniqueTexts,
    };
  }
  return { status: "not_specified", note: "Not mentioned in the listing. Ask the host team." };
}

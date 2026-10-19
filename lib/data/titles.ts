import { PROJECT_ABBREVIATIONS } from "./config";
import { clean, keyOf, looksLikeUrl, tidyCase } from "./text";

/**
 * The sheet has no title column. Many rows do name the placement, either in
 * the text of the opportunity link ("Sri Bodhiraja College") or in the
 * booklet file name ("USJ iGV Project Booklet - Heartbeat Navajeevana
 * Rehabilitation.pdf"). These helpers strip the repeated boilerplate from
 * those values; when nothing meaningful is left the caller falls back to
 * "<Project> · <host team>".
 */

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function projectPatterns(projectName: string): RegExp[] {
  const words = clean(projectName).split(" ").filter(Boolean).map(escape);
  const patterns: RegExp[] = [];
  if (words.length) {
    // "Green Leaders" also matches "Green leader"; spacing is optional.
    const last = words.length - 1;
    const body = words.map((w, i) => (i === last ? `${w.replace(/s$/i, "")}s?` : w)).join("[\\s_-]*");
    patterns.push(new RegExp(`\\b${body}\\b`, "gi"));
  }
  for (const abbreviation of PROJECT_ABBREVIATIONS[keyOf(projectName)] ?? []) {
    patterns.push(new RegExp(`\\b${escape(abbreviation)}\\b`, "g"));
  }
  return patterns;
}

const BOILERPLATE: RegExp[] = [
  /\b(usj\s+)?igv\s+project\s+booklet\b/gi,
  /\bmatching\s+interview(\s+(ppt|presentation))?\b/gi,
  /\bexpectation\s+setting\b/gi,
  /\bproject\s+(booklet|proposal)\b/gi,
  /\bnew\s+booklet\b/gi,
  /\bbooklet\b/gi,
  /\bcompressed\b/gi,
  /^\s*copy\s+of\b/gi,
  /^\s*igv\b/gi,
  /\b[46]\s*weeks?\b/gi,
  /\b(26\.27|2024|2025|2026)\b/g,
  /\(\s*\d+\s*\)/g,
  /\bproject\b/gi,
];

const REJECT = /^(ir|pdf|ppt|link|new|accommodation|global volunteer|aiesec|aiesec in .*)$/i;

function finish(value: string, hostTeamCode: string | null): string | null {
  let text = clean(value)
    .replace(/\s*[-–]\s*/g, " – ")
    .replace(/^[\s–:|,.]+|[\s–:|,.]+$/g, "")
    .replace(/\s{2,}/g, " ");
  const wrapped = text.match(/^\((.*)\)$/);
  if (wrapped) text = clean(wrapped[1]);
  if (text.length < 3 || /^[\d.\s]+$/.test(text) || REJECT.test(text)) return null;
  if (hostTeamCode && keyOf(text) === keyOf(hostTeamCode)) return null;
  return tidyCase(text);
}

export function titleFromBooklet(label: string, projectName: string, hostTeamCode: string | null): string | null {
  let text = label;
  while (/\.(pdf|pptx?|docx?)\s*$/i.test(text)) text = text.replace(/\.(pdf|pptx?|docx?)\s*$/i, "");
  text = text.replace(/[_|]+/g, " ");
  for (const pattern of BOILERPLATE) text = text.replace(pattern, " ");
  if (hostTeamCode) text = text.replace(new RegExp(`^\\s*${escape(hostTeamCode)}\\b`, "i"), " ");
  for (const pattern of projectPatterns(projectName)) text = text.replace(pattern, " ");
  return finish(text, hostTeamCode);
}

/** Text of the opportunity-link cell when it names the placement instead of saying "Link". */
export function titleFromLinkText(text: string, hostTeamCode: string | null): string | null {
  const value = clean(text);
  if (!value || /\blink\b/i.test(value) || looksLikeUrl(value)) return null;
  const stripped = value
    .replace(/\|\s*global volunteer\s*\|\s*aiesec\s*$/i, "")
    .replace(/^global volunteer\s*[-–]\s*/i, "");
  return finish(stripped, hostTeamCode);
}

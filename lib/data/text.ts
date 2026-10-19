/** Collapses whitespace (including newlines inside cells) and trims. */
export function clean(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/[\s ]+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return clean(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Comparison key that ignores case, spacing and punctuation. */
export function keyOf(value: string): string {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** FNV-1a hash, used for deterministic ids of rows without an EXPA link. */
export function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, "0");
}

/** Returns a normalised http(s) URL, or null when the value is not one. */
export function safeUrl(value: string | null | undefined): string | null {
  const raw = clean(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function looksLikeUrl(value: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(clean(value));
}

/**
 * "JAPAN GLOBAL CLASSROOM" -> "Japan Global Classroom"; "mahanama" -> "Mahanama".
 * Single all-caps words ("IOLPS", "ACYMMA") are likely acronyms and kept.
 */
export function tidyCase(value: string): string {
  const text = clean(value);
  if (/[a-z]/.test(text) && /[A-Z]/.test(text)) return text;
  if (text === text.toUpperCase() && text.includes(" ")) {
    return text.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

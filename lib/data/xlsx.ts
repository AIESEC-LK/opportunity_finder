import { strFromU8, unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

/**
 * A minimal reader for the .xlsx export of a Google Sheet.
 *
 * The CSV export drops hyperlinks (every "Link" cell becomes plain text) and
 * merged ranges, and both carry meaning in this sheet: application URLs live
 * in hyperlinks, and SDG / project / host-team cells are merged down across
 * the opportunities they group. The xlsx export keeps both.
 */

export interface Cell {
  text: string;
  kind: "string" | "number" | "boolean" | "error";
  bool?: boolean;
  link?: string;
}

export interface MergeRange {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export interface Sheet {
  name: string;
  hidden: boolean;
  maxRow: number;
  maxCol: number;
  merges: MergeRange[];
  /** The cell's own value (1-based row and column). */
  own(row: number, col: number): Cell | undefined;
  /** The cell's value, falling back to the top-left cell of a merged range. */
  get(row: number, col: number): Cell | undefined;
}

export interface Workbook {
  sheets: Sheet[];
  sheet(name: string): Sheet | undefined;
}

type XmlNode = Record<string, unknown>;

const ARRAY_TAGS = new Set([
  "sheet",
  "Relationship",
  "si",
  "r",
  "row",
  "c",
  "mergeCell",
  "hyperlink",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  isArray: (name) => ARRAY_TAGS.has(name),
});

function asArray<T>(value: unknown): T[] {
  if (value === undefined || value === null) return [];
  return (Array.isArray(value) ? value : [value]) as T[];
}

/** Text of a <t> element, which may be a string or {"#text": ...}. */
function textOf(node: unknown): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object") {
    const text = (node as XmlNode)["#text"];
    return text === undefined ? "" : String(text);
  }
  return "";
}

/** Text of a shared-string or inline-string item, including rich-text runs. */
function richText(item: XmlNode | undefined): string {
  if (!item) return "";
  if (item.t !== undefined) return textOf(item.t);
  return asArray<XmlNode>(item.r)
    .map((run) => textOf(run.t))
    .join("");
}

/** "AB12" -> { row: 12, col: 28 } */
export function parseRef(ref: string): { row: number; col: number } {
  const match = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!match) throw new Error(`Invalid cell reference: ${ref}`);
  let col = 0;
  for (const char of match[1]) col = col * 26 + (char.charCodeAt(0) - 64);
  return { row: Number(match[2]), col };
}

function resolveTarget(base: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = base.split("/").slice(0, -1);
  for (const segment of target.split("/")) {
    if (segment === "..") parts.pop();
    else if (segment !== ".") parts.push(segment);
  }
  return parts.join("/");
}

function readRels(files: Record<string, Uint8Array>, path: string): Map<string, string> {
  const rels = new Map<string, string>();
  const data = files[path];
  if (!data) return rels;
  const xml = parser.parse(strFromU8(data)) as XmlNode;
  const root = (xml.Relationships ?? {}) as XmlNode;
  for (const rel of asArray<XmlNode>(root.Relationship)) {
    rels.set(String(rel["@_Id"]), String(rel["@_Target"]));
  }
  return rels;
}

function readSheet(
  files: Record<string, Uint8Array>,
  path: string,
  name: string,
  hidden: boolean,
  sharedStrings: string[],
): Sheet {
  const xml = parser.parse(strFromU8(files[path])) as XmlNode;
  const worksheet = (xml.worksheet ?? {}) as XmlNode;
  const cells = new Map<string, Cell>();
  let maxRow = 0;
  let maxCol = 0;

  const sheetData = (worksheet.sheetData ?? {}) as XmlNode;
  for (const row of asArray<XmlNode>(sheetData.row)) {
    for (const c of asArray<XmlNode>(row.c)) {
      const ref = String(c["@_r"] ?? "");
      if (!ref) continue;
      const { row: r, col } = parseRef(ref);
      const type = String(c["@_t"] ?? "n");
      const raw = textOf(c.v);
      let cell: Cell | undefined;

      if (type === "s") {
        const text = sharedStrings[Number(raw)] ?? "";
        if (text !== "") cell = { text, kind: "string" };
      } else if (type === "inlineStr") {
        const text = richText(c.is as XmlNode | undefined);
        if (text !== "") cell = { text, kind: "string" };
      } else if (type === "b") {
        if (raw !== "") cell = { text: raw === "1" ? "TRUE" : "FALSE", kind: "boolean", bool: raw === "1" };
      } else if (type === "e") {
        if (raw !== "") cell = { text: raw, kind: "error" };
      } else if (type === "str") {
        if (raw !== "") cell = { text: raw, kind: "string" };
      } else if (raw !== "") {
        cell = { text: String(Number(raw)), kind: "number" };
      }

      if (cell) {
        cells.set(`${r},${col}`, cell);
        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, col);
      }
    }
  }

  const relsPath = path.replace(/([^/]+)$/, "_rels/$1.rels");
  const rels = readRels(files, relsPath);
  const hyperlinks = (worksheet.hyperlinks ?? {}) as XmlNode;
  for (const link of asArray<XmlNode>(hyperlinks.hyperlink)) {
    const id = link["@_r:id"];
    const target = id ? rels.get(String(id)) : undefined;
    const ref = String(link["@_ref"] ?? "").split(":")[0];
    if (!target || !ref) continue;
    const { row: r, col } = parseRef(ref);
    const key = `${r},${col}`;
    const existing = cells.get(key);
    cells.set(key, existing ? { ...existing, link: target } : { text: "", kind: "string", link: target });
    maxRow = Math.max(maxRow, r);
    maxCol = Math.max(maxCol, col);
  }

  const merges: MergeRange[] = [];
  const mergeCells = (worksheet.mergeCells ?? {}) as XmlNode;
  for (const merge of asArray<XmlNode>(mergeCells.mergeCell)) {
    const [from, to] = String(merge["@_ref"] ?? "").split(":");
    if (!from || !to) continue;
    const a = parseRef(from);
    const b = parseRef(to);
    merges.push({ r1: a.row, c1: a.col, r2: b.row, c2: b.col });
  }

  const own = (row: number, col: number) => cells.get(`${row},${col}`);

  return {
    name,
    hidden,
    maxRow,
    maxCol,
    merges,
    own,
    get(row, col) {
      const direct = own(row, col);
      if (direct) return direct;
      const merge = merges.find((m) => row >= m.r1 && row <= m.r2 && col >= m.c1 && col <= m.c2);
      return merge ? own(merge.r1, merge.c1) : undefined;
    },
  };
}

export function readWorkbook(data: Uint8Array): Workbook {
  const files = unzipSync(data, {
    // Embedded images make up most of the export; skip anything that is not XML.
    filter: (file) => file.name.endsWith(".xml") || file.name.endsWith(".rels"),
  });

  const sharedStrings: string[] = [];
  if (files["xl/sharedStrings.xml"]) {
    const xml = parser.parse(strFromU8(files["xl/sharedStrings.xml"])) as XmlNode;
    const sst = (xml.sst ?? {}) as XmlNode;
    for (const item of asArray<XmlNode>(sst.si)) sharedStrings.push(richText(item));
  }

  if (!files["xl/workbook.xml"]) throw new Error("The file is not an xlsx workbook.");
  const workbookXml = parser.parse(strFromU8(files["xl/workbook.xml"])) as XmlNode;
  const workbook = (workbookXml.workbook ?? {}) as XmlNode;
  const rels = readRels(files, "xl/_rels/workbook.xml.rels");

  const sheets: Sheet[] = [];
  for (const entry of asArray<XmlNode>((workbook.sheets as XmlNode | undefined)?.sheet)) {
    const target = rels.get(String(entry["@_r:id"]));
    if (!target) continue;
    const path = resolveTarget("xl/workbook.xml", target);
    if (!files[path]) continue;
    sheets.push(
      readSheet(files, path, String(entry["@_name"]), entry["@_state"] === "hidden", sharedStrings),
    );
  }

  return {
    sheets,
    sheet: (name) => sheets.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase()),
  };
}

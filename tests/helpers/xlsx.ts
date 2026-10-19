import { strToU8, zipSync } from "fflate";

/**
 * Builds a real .xlsx file in memory so tests exercise the same reader the
 * app uses. Cells are inline strings, numbers, booleans or hyperlinked text.
 */
export type TestCell = string | number | boolean | null | { text: string; link: string };

export interface TestSheet {
  name: string;
  rows: TestCell[][];
  /** e.g. ["A3:A6"] */
  merges?: string[];
  hidden?: boolean;
}

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function colName(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function sheetXml(sheet: TestSheet): { xml: string; rels: string } {
  const links: { ref: string; url: string }[] = [];
  const rows = sheet.rows
    .map((row, r) => {
      const cells = row
        .map((cell, c) => {
          const ref = `${colName(c)}${r + 1}`;
          if (cell === null || cell === "") return "";
          if (typeof cell === "boolean") return `<c r="${ref}" t="b"><v>${cell ? 1 : 0}</v></c>`;
          if (typeof cell === "number") return `<c r="${ref}"><v>${cell}</v></c>`;
          const text = typeof cell === "string" ? cell : cell.text;
          if (typeof cell === "object") links.push({ ref, url: cell.link });
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  const merges = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : "";
  const hyperlinks = links.length
    ? `<hyperlinks>${links.map((l, i) => `<hyperlink ref="${l.ref}" r:id="rIdL${i}"/>`).join("")}</hyperlinks>`
    : "";
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>${rows}</sheetData>${merges}${hyperlinks}</worksheet>`;
  const rels =
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    links
      .map(
        (l, i) =>
          `<Relationship Id="rIdL${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(l.url)}" TargetMode="External"/>`,
      )
      .join("") +
    `</Relationships>`;
  return { xml, rels };
}

export function buildXlsx(sheets: TestSheet[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const workbookSheets = sheets
    .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"${s.hidden ? ' state="hidden"' : ""}/>`)
    .join("");
  files["xl/workbook.xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`,
  );
  files["xl/_rels/workbook.xml.rels"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join("") +
      `</Relationships>`,
  );
  sheets.forEach((sheet, i) => {
    const { xml, rels } = sheetXml(sheet);
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xml);
    files[`xl/worksheets/_rels/sheet${i + 1}.xml.rels`] = strToU8(rels);
  });
  return zipSync(files);
}

export const opp = (id: number) => ({ text: "Link", link: `https://aiesec.org/opportunity/global-volunteer/${id}` });

/** Header rows matching the real "Projects" tab layout. */
export const LISTING_HEADER: TestCell[][] = [
  ["#SDG", "Project Name", "Entity", "Available Slots", "Available Slots", "Details", null, "Accommodation", "Food"],
  [null, null, null, 2025, 2026, "Project Link", "Project Booklet", null, null],
];

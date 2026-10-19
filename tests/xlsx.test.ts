import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseRef, readWorkbook } from "@/lib/data/xlsx";

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function workbook(): Uint8Array {
  return zipSync({
    "xl/workbook.xml": strToU8(`<workbook ${NS}><sheets><sheet name="Projects" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/sharedStrings.xml": strToU8(
      `<sst ${NS}><si><t>HeartBeat</t></si><si><r><t xml:space="preserve">1 Jan - 12 Feb
</t></r><r><rPr><b/></rPr><t>12 Feb - 26 Mar</t></r></si><si><t>Link</t></si></sst>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<worksheet ${NS}><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="b"><v>1</v></c><c r="E1"><v>3.4</v></c><c r="F1"><v>2025.0</v></c></row></sheetData>` +
        `<mergeCells count="1"><mergeCell ref="A1:A3"/></mergeCells><hyperlinks><hyperlink ref="C1" r:id="rId9"/></hyperlinks></worksheet>`,
    ),
    "xl/worksheets/_rels/sheet1.xml.rels": strToU8(
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="hyperlink" Target="https://aiesec.org/opportunity/global-volunteer/1298368" TargetMode="External"/></Relationships>`,
    ),
    "xl/media/image1.png": new Uint8Array([1, 2, 3]),
  });
}

describe("readWorkbook", () => {
  const sheet = readWorkbook(workbook()).sheet("projects")!;

  it("reads shared strings including rich-text runs and line breaks", () => {
    expect(sheet.own(1, 1)?.text).toBe("HeartBeat");
    expect(sheet.own(1, 2)?.text).toBe("1 Jan - 12 Feb\n12 Feb - 26 Mar");
  });

  it("keeps hyperlinks that the CSV export drops", () => {
    expect(sheet.own(1, 3)).toEqual({ text: "Link", kind: "string", link: "https://aiesec.org/opportunity/global-volunteer/1298368" });
  });

  it("reads booleans and numbers", () => {
    expect(sheet.own(1, 4)).toMatchObject({ kind: "boolean", bool: true });
    expect(sheet.own(1, 5)?.text).toBe("3.4");
    expect(sheet.own(1, 6)?.text).toBe("2025");
  });

  it("resolves merged cells to their top-left value", () => {
    expect(sheet.own(3, 1)).toBeUndefined();
    expect(sheet.get(3, 1)?.text).toBe("HeartBeat");
    expect(sheet.get(4, 1)).toBeUndefined();
  });

  it("parses cell references", () => {
    expect(parseRef("AB12")).toEqual({ row: 12, col: 28 });
  });

  it("rejects files that are not workbooks", () => {
    expect(() => readWorkbook(zipSync({ "hello.txt": strToU8("hi") }))).toThrow(/not an xlsx/);
  });
});

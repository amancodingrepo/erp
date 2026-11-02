import { describe, expect, it } from "vitest";
import {
  pdfFilename,
  pickReportColumns,
  reportSchema,
  resolveReportKey,
  toPdf,
  toXlsx,
} from "./schema";

describe("resolveReportKey", () => {
  it("accepts live keys, hyphen/underscore swaps, and spec aliases", () => {
    expect(resolveReportKey("dues")).toBe("dues");
    expect(resolveReportKey("daily_attendance")).toBe("daily-attendance");
    expect(resolveReportKey("paid_fee")).toBe("daily-collection");
    expect(resolveReportKey("student_strength")).toBe("strength");
    expect(resolveReportKey("fuel")).toBe("fuel-logs");
    expect(resolveReportKey("fuel_logs")).toBe("fuel-logs");
    expect(() => resolveReportKey("not-a-report")).toThrow();
  });
});

describe("reportSchema", () => {
  it("lists default columns and the filters that grain actually uses", () => {
    const dues = reportSchema("dues");
    expect(dues.columns).toEqual([
      "admissionNo",
      "name",
      "feeGroup",
      "description",
      "balance",
    ]);
    expect(dues.filters).toEqual(["classId", "sectionId", "feeGroupId"]);
    expect(reportSchema("notice-views").filters).toEqual([]);
    expect(reportSchema("daily-collection").filters).toContain("from");
  });
});

describe("pickReportColumns", () => {
  it("keeps requested live columns and falls back to defaults", () => {
    const report = {
      title: "Due",
      columns: ["admissionNo", "name", "balance"],
      rows: [{ admissionNo: "A1", name: "Ada", balance: 10 }],
    };
    expect(pickReportColumns(report, ["name", "missing"]).columns).toEqual(["name"]);
    expect(pickReportColumns(report, []).columns).toEqual(report.columns);
  });
});

describe("toXlsx", () => {
  it("builds a zip xlsx whose sheet includes the header", () => {
    const bytes = toXlsx({
      title: "Due",
      columns: ["name", "amount"],
      rows: [{ name: "A & B", amount: 12.5 }],
    });
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("A &amp; B");
    expect(text).toContain("12.5");
    expect(text).toContain("xl/worksheets/sheet1.xml");
  });
});

describe("toPdf", () => {
  it("builds a multi-page PDF with title, headers, and escaped cells", () => {
    const bytes = toPdf({
      title: "Due (A)",
      columns: ["name", "amount"],
      rows: [
        { name: "A & B (1)", amount: 12.5 },
        ...Array.from({ length: 80 }, (_, i) => ({
          name: `Row ${i}`,
          amount: i,
        })),
      ],
    });
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF")).toBe(true);
    expect(text).toContain("/Count 2");
    expect(text).toContain("Due \\(A\\)");
    expect(text).toContain("A & B \\(1\\)");
    expect(text).toContain("12.5");
    expect(pdfFilename("paid_fee")).toBe("daily-collection.pdf");
  });
});

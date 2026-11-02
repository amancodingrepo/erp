import { describe, expect, it } from "vitest";
import { buildCertificatePdf, buildIdCardPdf } from "@/lib/pdf/id-card";

describe("ID card and certificate PDFs", () => {
  it("student ID card PDF contains admission no and QR line", () => {
    const pdf = buildIdCardPdf({
      kind: "STUDENT",
      campusName: "Indore College",
      name: "Anika Joshi",
      idNo: "STU-001",
      roleLine: "FY BA / A",
    });
    const text = Buffer.from(pdf).toString("latin1");
    expect(text.startsWith("%PDF")).toBe(true);
    expect(text).toContain("STU-001");
    expect(text).toContain("QR STU-001");
    expect(text).toContain("STUDENT IDENTITY CARD");
  });

  it("certificate PDF merges title and body lines", () => {
    const pdf = buildCertificatePdf({
      campusName: "Indore College",
      title: "Bonafide",
      lines: ["This is to certify that Anika Joshi (STU-001) is a bona fide student."],
    });
    const text = Buffer.from(pdf).toString("latin1");
    expect(text.startsWith("%PDF")).toBe(true);
    expect(text).toContain("BONAFIDE");
    expect(text).toContain("Anika Joshi");
  });
});

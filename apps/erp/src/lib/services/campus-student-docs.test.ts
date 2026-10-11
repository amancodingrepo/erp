import { describe, expect, it } from "vitest";
import { studentDocumentRelPath } from "./campus-student-docs";

describe("student documents", () => {
  it("allows only files stored under that campus student folder", () => {
    expect(
      studentDocumentRelPath(
        "uploads/c1/students/st1/abc.pdf",
        "c1",
        "st1",
      ),
    ).toBe("abc.pdf");
    expect(
      studentDocumentRelPath(
        "/uploads/c1/students/st1/nested/file.png",
        "c1",
        "st1",
      ),
    ).toBe("nested/file.png");
    expect(
      studentDocumentRelPath("uploads/c1/students/st1/../x.pdf", "c1", "st1"),
    ).toBeNull();
    expect(
      studentDocumentRelPath("uploads/c9/students/st1/abc.pdf", "c1", "st1"),
    ).toBeNull();
    expect(
      studentDocumentRelPath("uploads/c1/students/other/abc.pdf", "c1", "st1"),
    ).toBeNull();
  });
});

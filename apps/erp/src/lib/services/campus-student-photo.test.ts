import { describe, expect, it } from "vitest";
import { imageUploadExt } from "./campus-student-photo";

describe("student photo", () => {
  it("accepts jpg/png and rejects other types", () => {
    expect(imageUploadExt("a.JPG", "image/jpeg")).toBe("jpg");
    expect(imageUploadExt("face.png", "image/png")).toBe("png");
    expect(() => imageUploadExt("scan.pdf", "application/pdf")).toThrow();
    expect(() => imageUploadExt("note.txt", "text/plain")).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { sniffUploadExt } from "@/lib/uploads";
import {
  allowedMediaUrl,
  parseCampusFiles,
  parseFileKind,
} from "./campus-files";

const HOSTED = "/api/v1/files/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("hosted media urls", () => {
  it("accepts https, hosted file ids, and campus upload paths", () => {
    expect(allowedMediaUrl("https://files.example/a.jpg")).toContain("https://");
    expect(allowedMediaUrl(HOSTED)).toBe(HOSTED);
    expect(
      allowedMediaUrl("uploads/camp1/students/s1/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg"),
    ).toContain("uploads/camp1/");
    expect(allowedMediaUrl("http://files.example/a.jpg")).toBe("");
    expect(allowedMediaUrl("/api/v1/files/../secret")).toBe("");
    expect(allowedMediaUrl("uploads/../etc/passwd")).toBe("");
    expect(allowedMediaUrl("/api/v1/files/not-a-uuid")).toBe("");
  });

  it("keeps a campus file index row", () => {
    const rows = parseCampusFiles([
      {
        id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        kind: "diary",
        name: "circle.jpg",
        mime: "image/jpeg",
        relPath: "camp1/diary/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg",
        bytes: 12,
      },
      { id: "bad", kind: "diary" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.url).toBe(HOSTED);
    expect(parseFileKind("voice")).toBe("diary");
    expect(() => parseFileKind("cctv")).toThrow();
  });
});

describe("upload sniff", () => {
  it("sniffs pdf/png/jpeg and allows named media types", () => {
    const allowed = new Set(["pdf", "jpg", "png", "mp3", "mp4", "webm", "wav"]);
    expect(
      sniffUploadExt(new Uint8Array([0x25, 0x50, 0x44, 0x46]), "a.pdf", "application/pdf", allowed),
    ).toBe("pdf");
    expect(
      sniffUploadExt(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "a.png",
        "image/png",
        allowed,
      ),
    ).toBe("png");
    expect(
      sniffUploadExt(new Uint8Array([0xff, 0xd8, 0xff]), "a.jpg", "image/jpeg", allowed),
    ).toBe("jpg");
    expect(
      sniffUploadExt(new Uint8Array([0x49, 0x44, 0x33, 0x03]), "clip.mp3", "audio/mpeg", allowed),
    ).toBe("mp3");
    expect(() =>
      sniffUploadExt(new Uint8Array([0x25, 0x50, 0x44, 0x46]), "id.pdf.exe", "application/pdf", allowed),
    ).toThrow();
  });
});

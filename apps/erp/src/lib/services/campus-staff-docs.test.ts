import { describe, expect, it } from "vitest";
import {
  attachStaffDocuments,
  parseStaffDocument,
  removeStaffDocument,
  upsertStaffDocument,
} from "./campus-staff-docs";

describe("staff documents", () => {
  it("stores named https documents on a live staff row", () => {
    const first = upsertStaffDocument(
      [],
      parseStaffDocument({ staffId: "st1", name: "PAN", url: "https://files.example/pan.pdf" }),
    );
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      staffId: "st1",
      name: "PAN",
      url: "https://files.example/pan.pdf",
    });
    expect(
      attachStaffDocuments([{ id: "st1", firstName: "Rina" }], first)[0].documents,
    ).toHaveLength(1);
    expect(removeStaffDocument(first, first[0]!.id, "st1")).toHaveLength(0);
    expect(() =>
      parseStaffDocument({ staffId: "st1", name: "PAN", url: "http://x" }),
    ).toThrow();
    expect(
      parseStaffDocument({
        staffId: "st1",
        name: "ID",
        url: "/api/v1/files/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      }).url,
    ).toContain("/api/v1/files/");
  });
});

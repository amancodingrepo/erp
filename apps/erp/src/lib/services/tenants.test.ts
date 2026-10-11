import { describe, expect, it } from "vitest";
import {
  parseBranchPatch,
  parseOrgCreate,
  parseOrgPatch,
  toBranchAlias,
  toOrgAlias,
} from "./tenants";

describe("org and branch aliases", () => {
  it("maps org and campus rows onto spec org/branch shapes", () => {
    expect(toOrgAlias({ id: "o1", name: "Trust", code: "TRUST" })).toEqual({
      id: "o1",
      name: "Trust",
      code: "TRUST",
    });
    expect(
      toBranchAlias(
        {
          id: "c1",
          orgId: "o1",
          name: "Main",
          code: "MAIN",
          address: "1 School Rd",
          phone: "9000000000",
          email: "office@school.local",
        },
        {
          logoUrl: "https://files.example/logo.png",
          principals: [
            { id: "p1", classId: "cl1", staffId: "st1", signatureUrl: "" },
          ],
          studentCount: 12,
        },
      ),
    ).toMatchObject({
      id: "c1",
      orgId: "o1",
      name: "Main",
      code: "MAIN",
      address: "1 School Rd",
      logo: "https://files.example/logo.png",
      principals: [{ id: "p1", classId: "cl1", staffId: "st1" }],
      studentCount: 12,
    });
  });

  it("parses org create/patch and branch patch including logo and principals", () => {
    expect(parseOrgCreate({ name: " New Trust ", code: "nt-1" })).toEqual({
      name: "New Trust",
      code: "NT-1",
    });
    expect(parseOrgPatch({ name: "Renamed" })).toEqual({ name: "Renamed" });
    expect(
      parseBranchPatch({
        name: "East",
        address: "2 Park",
        logo: "https://files.example/east.png",
        principals: [{ classId: "cl1", staffId: "st1" }],
      }),
    ).toEqual({
      campus: { name: "East", address: "2 Park" },
      logoUrl: "https://files.example/east.png",
      principals: [{ classId: "cl1", staffId: "st1", id: undefined, signatureUrl: undefined }],
    });
    expect(() => parseOrgCreate({ name: "x", code: "A" })).toThrow();
    expect(() => parseBranchPatch({})).toThrow();
  });
});

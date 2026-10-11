import { describe, expect, it } from "vitest";
import {
  attachGuardianExtras,
  parseGuardianExtra,
  parseGuardianWrite,
  upsertGuardianExtra,
} from "./campus-student-guardians";

describe("student guardians", () => {
  it("requires a name and a live relation", () => {
    expect(parseGuardianWrite({ name: "Anita", relation: "Mother" })).toEqual({
      relation: "mother",
      name: "Anita",
      phone: undefined,
      email: undefined,
      occupation: undefined,
    });
    expect(parseGuardianWrite({ name: "Ravi", phone: "999" })).toEqual({
      relation: "other",
      name: "Ravi",
      phone: "999",
      email: undefined,
      occupation: undefined,
    });
    expect(() => parseGuardianWrite({ name: "" })).toThrow();
    expect(() => parseGuardianWrite({ name: "X", relation: "cousin" })).toThrow();
  });

  it("stores aadhaar, photo, and dual address extras on a live guardian", () => {
    const extra = parseGuardianExtra("g1", {
      aadhaar: "1234 5678 9012",
      altPhone: "90000",
      education: "BA",
      photoUrl: "https://files.example/g.png",
      residentialAddress: "1 Park",
      sameAsResidential: true,
    });
    expect(extra).toMatchObject({
      guardianId: "g1",
      aadhaar: "123456789012",
      photoUrl: "https://files.example/g.png",
      residentialAddress: "1 Park",
      permanentAddress: "1 Park",
      sameAsResidential: true,
    });
    const rows = upsertGuardianExtra([], extra);
    expect(
      attachGuardianExtras(
        [{ guardianId: "g1", guardian: { id: "g1", name: "Anita" } }],
        rows,
      )[0],
    ).toMatchObject({
      aadhaar: "123456789012",
      residentialAddress: "1 Park",
    });
    expect(() => parseGuardianExtra("g1", { aadhaar: "12" })).toThrow();
    expect(() =>
      parseGuardianExtra("g1", { photoUrl: "http://files.example/x.png" }),
    ).toThrow();
    expect(
      parseGuardianExtra("g1", {
        photoUrl: "/api/v1/files/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      }).photoUrl,
    ).toContain("/api/v1/files/");
  });
});


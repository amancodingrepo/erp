import { ProgramLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { programDeleteBlocked, programPatchData } from "./campus-programs";

describe("programs", () => {
  it("blocks delete when related rows exist and maps name/code/duration", () => {
    expect(
      programDeleteBlocked({
        classes: 0,
        applications: 0,
        outcomes: 0,
        specializations: 0,
        cutoffRules: 0,
      }),
    ).toBe(false);
    expect(
      programDeleteBlocked({
        classes: 1,
        applications: 0,
        outcomes: 0,
        specializations: 0,
        cutoffRules: 0,
      }),
    ).toBe(true);
    expect(
      programPatchData(
        {
          name: "B.Com",
          code: "BC",
          level: ProgramLevel.UNDERGRADUATE,
          durationYears: 3,
        },
        { name: " BBA ", code: "", durationYears: 4 },
      ),
    ).toEqual({ name: "BBA", durationYears: 4, code: null });
    expect(() =>
      programPatchData(
        {
          name: "B.Com",
          code: "BC",
          level: ProgramLevel.UNDERGRADUATE,
          durationYears: 3,
        },
        { name: " " },
      ),
    ).toThrow();
    expect(() =>
      programPatchData(
        {
          name: "B.Com",
          code: "BC",
          level: ProgramLevel.UNDERGRADUATE,
          durationYears: 3,
        },
        { durationYears: 0 },
      ),
    ).toThrow();
  });
});

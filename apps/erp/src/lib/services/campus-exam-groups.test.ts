import { describe, expect, it } from "vitest";
import { examGroupDeleteBlocked } from "./campus-exam-groups";

describe("exam groups", () => {
  it("blocks delete when exams or forms exist", () => {
    expect(
      examGroupDeleteBlocked({ exams: 0, formWindows: 0, examForms: 0 }),
    ).toBe(false);
    expect(
      examGroupDeleteBlocked({ exams: 1, formWindows: 0, examForms: 0 }),
    ).toBe(true);
    expect(
      examGroupDeleteBlocked({ exams: 0, formWindows: 1, examForms: 0 }),
    ).toBe(true);
    expect(
      examGroupDeleteBlocked({ exams: 0, formWindows: 0, examForms: 2 }),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  admissionTestReportRows,
  attachAdmissionTests,
  assertAdmissionTestDroppable,
  dropAdmissionTest,
  parseAdmissionTests,
  parseAdmissionTestSits,
  patchAdmissionTestRow,
  upsertAdmissionTest,
  upsertAdmissionTestSit,
} from "./campus-admission-tests";

describe("admission tests", () => {
  it("keeps one named test per case-insensitive name and unique sits", () => {
    const tests = upsertAdmissionTest(parseAdmissionTests([]), {
      name: "Entrance",
      date: "2026-04-15",
      classId: "c1",
      venue: "Hall A",
    });
    expect(tests[0]).toMatchObject({
      name: "Entrance",
      date: "2026-04-15",
      classId: "c1",
      venue: "Hall A",
    });
    expect(
      upsertAdmissionTest(tests, { name: "entrance", date: "2026-04-20" }),
    ).toHaveLength(1);
    expect(upsertAdmissionTest(tests, { name: "entrance", date: "2026-04-20" })[0]?.date).toBe(
      "2026-04-20",
    );
    expect(() =>
      upsertAdmissionTest([], { name: "Entrance", date: "15-04-2026" }),
    ).toThrow();
    expect(() => upsertAdmissionTest([], { name: " ", date: "2026-04-15" })).toThrow();

    const sits = upsertAdmissionTestSit(parseAdmissionTestSits([]), {
      testId: tests[0]!.id,
      applicationId: "a1",
      score: 88,
    });
    expect(sits[0]).toMatchObject({
      testId: tests[0]!.id,
      applicationId: "a1",
      score: 88,
      appeared: true,
    });
    expect(
      upsertAdmissionTestSit(sits, {
        testId: tests[0]!.id,
        applicationId: "a1",
        score: 90,
      }),
    ).toHaveLength(1);
    expect(() =>
      upsertAdmissionTestSit([], { testId: tests[0]!.id, applicationId: " " }),
    ).toThrow();
    expect(() =>
      upsertAdmissionTestSit([], {
        testId: tests[0]!.id,
        applicationId: "a1",
        appeared: true,
        score: -1,
      }),
    ).toThrow();

    const attached = attachAdmissionTests(
      tests,
      sits,
      [{ id: "c1", name: "I-A" }],
    );
    expect(attached[0]).toMatchObject({ className: "I-A", sitCount: 1 });
    expect(
      admissionTestReportRows(tests, sits, [
        { id: "a1", applicationNo: "APP-1", firstName: "Ria", lastName: "Shah" },
      ]),
    ).toEqual([
      {
        test: "Entrance",
        date: "2026-04-15",
        applicationNo: "APP-1",
        name: "Ria Shah",
        score: 88,
        appeared: "yes",
      },
    ]);
    expect(
      admissionTestReportRows(tests, sits, [{ id: "other", applicationNo: "X", firstName: "Z" }]),
    ).toEqual([]);
  });

  it("patches in place by id and drops by id", () => {
    const first = upsertAdmissionTest(parseAdmissionTests([]), {
      name: "Entrance",
      date: "2026-04-15",
      classId: "c1",
      venue: "Hall A",
    });
    const two = upsertAdmissionTest(first, {
      name: "Interview",
      date: "2026-04-16",
    });
    const patched = patchAdmissionTestRow(two, first[0]!.id, {
      venue: "Hall B",
      classId: "",
    });
    expect(patched.find((row) => row.id === first[0]!.id)).toMatchObject({
      name: "Entrance",
      venue: "Hall B",
      classId: "",
    });
    expect(() =>
      patchAdmissionTestRow(two, first[0]!.id, { name: "interview" }),
    ).toThrow();
    expect(dropAdmissionTest(two, first[0]!.id)).toHaveLength(1);
    expect(() => dropAdmissionTest(two, "missing")).toThrow();
    expect(() =>
      assertAdmissionTestDroppable(
        [{ id: "s1", testId: first[0]!.id, applicationId: "a1", score: 88, appeared: true }],
        first[0]!.id,
      ),
    ).toThrow();
  });
});

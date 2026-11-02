import { describe, expect, it } from "vitest";
import {
  awardedMarksOnLeave,
  dropSubjectMetaField,
  getNamedMaster,
  leavePercentOnDate,
  parseLeaveMarksPercents,
  parseNamedMasters,
  parseSubjectMeta,
  resolveParentSubjectId,
  upsertLeaveMarksPercent,
  dropLeaveMarksByLeaveType,
  dropLeaveMarksPercent,
  dropNamedMaster,
  dropSubjectMeta,
  subjectDeleteBlocked,
  subjectHasSubSubjects,
  upsertNamedMaster,
  upsertSubjectMeta,
} from "./academics-masters";

describe("subject categories and types", () => {
  it("adds unique named skill buckets", () => {
    const rows = upsertNamedMaster(parseNamedMasters([]), { name: "Listening" });
    expect(upsertNamedMaster(rows, { name: "listening" })).toHaveLength(1);
    const renamed = upsertNamedMaster(rows, { id: rows[0]!.id, name: "Reading" });
    expect(renamed[0]?.name).toBe("Reading");
    expect(dropNamedMaster(rows, rows[0]!.id)).toEqual([]);
    expect(() => dropNamedMaster(rows, "missing")).toThrow();
    expect(getNamedMaster(rows, rows[0]!.id, "subject category").name).toBe("Listening");
    expect(() => getNamedMaster(rows, "missing", "subject category")).toThrow();
  });

  it("clears subject meta when a category or type is dropped", () => {
    const meta = upsertSubjectMeta(parseSubjectMeta([]), {
      subjectId: "s1",
      categoryId: "c1",
      typeId: "t1",
    });
    expect(dropSubjectMetaField(meta, "categoryId", "c1")[0]?.categoryId).toBe("");
    expect(dropSubjectMetaField(meta, "typeId", "t1")[0]?.typeId).toBe("");
    expect(dropSubjectMetaField(meta, "categoryId", "other")[0]?.categoryId).toBe("c1");
  });
});

describe("leave marks percent", () => {
  it("stores one percent per leave type and scales awarded marks", () => {
    expect(() =>
      upsertLeaveMarksPercent([], { leaveTypeId: "lt1", percent: 120 }),
    ).toThrow();
    const rows = upsertLeaveMarksPercent(parseLeaveMarksPercents([]), {
      leaveTypeId: "lt1",
      percent: 75,
    });
    expect(
      upsertLeaveMarksPercent(rows, { leaveTypeId: "lt1", percent: 50 })[0]?.percent,
    ).toBe(50);
    expect(awardedMarksOnLeave(80, 75)).toBe(60);
    expect(dropLeaveMarksPercent(rows, rows[0]!.id)).toEqual([]);
    expect(() => dropLeaveMarksPercent(rows, "missing")).toThrow();
    expect(dropLeaveMarksByLeaveType(rows, "lt1")).toEqual([]);
    expect(dropLeaveMarksByLeaveType(rows, "missing")).toEqual(rows);
  });

  it("uses approved overlapping leave on the exam date", () => {
    const percents = upsertLeaveMarksPercent([], { leaveTypeId: "sick", percent: 75 });
    expect(
      leavePercentOnDate(
        percents,
        [
          {
            leaveTypeId: "sick",
            fromDate: "2026-03-01",
            toDate: "2026-03-10",
            status: "approved",
          },
        ],
        "2026-03-05",
      ),
    ).toBe(75);
    expect(
      leavePercentOnDate(
        percents,
        [
          {
            leaveTypeId: "sick",
            fromDate: "2026-03-01",
            toDate: "2026-03-10",
            status: "pending",
          },
        ],
        "2026-03-05",
      ),
    ).toBeNull();
  });
});

describe("subject meta", () => {
  it("maps a live subject to category and type ids", () => {
    const rows = upsertSubjectMeta(parseSubjectMeta([]), {
      subjectId: "s1",
      categoryId: "c1",
      typeId: "t1",
    });
    const next = upsertSubjectMeta(rows, {
      subjectId: "s1",
      categoryId: "c2",
      typeId: "t1",
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.categoryId).toBe("c2");
  });

  it("nests a sub-subject under a live main subject and rejects cycles", () => {
    const mains = [{ id: "eng" }, { id: "listen" }, { id: "nested" }];
    expect(resolveParentSubjectId("listen", "eng", mains, [])).toBe("eng");
    expect(resolveParentSubjectId("listen", "  ", mains, [])).toBe("");
    expect(() => resolveParentSubjectId("eng", "eng", mains, [])).toThrow();
    expect(() => resolveParentSubjectId("listen", "missing", mains, [])).toThrow();
    const child = upsertSubjectMeta([], { subjectId: "listen", parentSubjectId: "eng" });
    expect(child[0]?.parentSubjectId).toBe("eng");
    expect(() =>
      resolveParentSubjectId("nested", "listen", mains, child),
    ).toThrow();
    expect(() => resolveParentSubjectId("eng", "listen", mains, child)).toThrow();
    const kept = upsertSubjectMeta(child, { subjectId: "listen", categoryId: "c1" });
    expect(kept[0]?.parentSubjectId).toBe("eng");
    expect(kept[0]?.categoryId).toBe("c1");
  });

  it("drops subject meta and blocks delete when the subject is in use", () => {
    const rows = upsertSubjectMeta([], {
      subjectId: "eng",
      categoryId: "c1",
      parentSubjectId: "",
    });
    const nested = upsertSubjectMeta(rows, {
      subjectId: "listen",
      parentSubjectId: "eng",
    });
    expect(subjectHasSubSubjects(nested, "eng")).toBe(true);
    expect(subjectHasSubSubjects(nested, "listen")).toBe(false);
    expect(dropSubjectMeta(nested, "listen")).toHaveLength(1);
    expect(dropSubjectMeta(nested, "listen")[0]?.subjectId).toBe("eng");
    expect(dropSubjectMeta(nested, "missing")).toEqual(nested);
    expect(() => dropSubjectMeta(nested, " ")).toThrow();
    expect(subjectDeleteBlocked({
      offerings: 0,
      courseOutcomes: 0,
      copoLessons: 0,
      liveClasses: 0,
      timetableSlots: 0,
      subSubjects: 1,
    })).toBe(true);
    expect(subjectDeleteBlocked({
      offerings: 1,
      courseOutcomes: 0,
      copoLessons: 0,
      liveClasses: 0,
      timetableSlots: 0,
      subSubjects: 0,
    })).toBe(true);
    expect(subjectDeleteBlocked({
      offerings: 0,
      courseOutcomes: 0,
      copoLessons: 0,
      liveClasses: 0,
      timetableSlots: 0,
      subSubjects: 0,
    })).toBe(false);
  });
});

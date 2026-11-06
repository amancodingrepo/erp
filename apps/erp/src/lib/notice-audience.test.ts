import { describe, expect, it } from "vitest";
import { canSeeNotice, canSeeReply, classLabels, normalizeClassName, type NoticeViewer } from "./notice-audience";

const now = new Date("2026-11-05T10:00:00Z");
const past = new Date("2026-11-01T10:00:00Z");
const future = new Date("2026-11-20T10:00:00Z");

const staff: NoticeViewer = { staff: true };
const parent: NoticeViewer = {
  staff: false,
  studentIds: new Set(["stu-1"]),
  classes: new Set(classLabels("1", "A")),
  classIds: new Set(["class-1"]),
  routes: new Set(["route 7"]),
  routeIds: new Set(["troute-7"]),
  dayCare: false,
};
const sw = (board: string, audienceKey: string, extra: Partial<Parameters<typeof canSeeNotice>[0]> = {}) => ({
  board,
  audienceKey,
  publishAt: past,
  isPublished: true,
  ...extra,
});
const legacy = (channelKind: string, audience: string, extra = {}) => sw("school", "all", { channelKind, audience, ...extra });

describe("normalizeClassName (matches School World's)", () => {
  it.each([
    ["1 (A)", "1 (A)"],
    ["Class 1 a", "1 (A)"],
    ["I A", "1 (A)"],
    ["LKG B", "KG I (B)"],
    ["pre nursery a", "PRE NURSERY (A)"],
    ["11 science c", "11 SCIENCE (C)"],
    ["FY BCom", "FY BCom"],
  ])("%s -> %s", (input, expected) => expect(normalizeClassName(input)).toBe(expected));
});

describe("canSeeNotice: School World notices", () => {
  it("staff see everything, including teacher-only and scheduled notices", () => {
    expect(canSeeNotice(sw("school", "ALL_TEACHERS"), staff, now)).toBe(true);
    expect(canSeeNotice(sw("class", "5 (C)", { publishAt: future }), staff, now)).toBe(true);
  });

  it("a parent sees whole-school notices", () => {
    expect(canSeeNotice(sw("school", "__SCHOOL__"), parent, now)).toBe(true);
  });

  it("a parent never sees All Teachers notices", () => {
    expect(canSeeNotice(sw("school", "ALL_TEACHERS"), parent, now)).toBe(false);
  });

  it("day care notices only reach day-care families", () => {
    expect(canSeeNotice(sw("school", "DAY_CARE"), parent, now)).toBe(false);
    expect(canSeeNotice(sw("school", "DAY_CARE"), { ...parent, dayCare: true }, now)).toBe(true);
  });

  it("class notices only reach that class, however the class is written", () => {
    expect(canSeeNotice(sw("class", "1 (A)"), parent, now)).toBe(true);
    expect(canSeeNotice(sw("class", "Class 1 A"), parent, now)).toBe(true);
    expect(canSeeNotice(sw("class", "1 (B)"), parent, now)).toBe(false);
    expect(canSeeNotice(sw("class", "2 (A)"), parent, now)).toBe(false);
  });

  it("a notice to the whole class reaches every section of it, and no other class", () => {
    expect(canSeeNotice(sw("class", "1"), parent, now)).toBe(true);
    expect(canSeeNotice(sw("class", "2"), parent, now)).toBe(false);
  });

  it("route notices only reach riders of that route", () => {
    expect(canSeeNotice(sw("route", "Route 7"), parent, now)).toBe(true);
    expect(canSeeNotice(sw("route", "Route 9"), parent, now)).toBe(false);
  });

  it("scheduled and unpublished notices stay hidden from parents", () => {
    expect(canSeeNotice(sw("school", "__SCHOOL__", { publishAt: future }), parent, now)).toBe(false);
    expect(canSeeNotice(sw("school", "__SCHOOL__", { isPublished: false }), parent, now)).toBe(false);
  });

  it("an unknown board or audience is hidden", () => {
    expect(canSeeNotice(sw("principal", "__SCHOOL__"), parent, now)).toBe(false);
    expect(canSeeNotice(sw("school", "MANAGEMENT"), parent, now)).toBe(false);
  });

  it("a parent with no linked child sees only whole-school notices", () => {
    const none: NoticeViewer = { ...parent, studentIds: new Set(), classes: new Set(), classIds: new Set(), routes: new Set(), routeIds: new Set() };
    expect(canSeeNotice(sw("school", "__SCHOOL__"), none, now)).toBe(true);
    expect(canSeeNotice(sw("class", "1 (A)"), none, now)).toBe(false);
  });
});

describe("canSeeNotice: older /api/v1 notices", () => {
  it("school-wide and student notices are visible; staff and teacher notices are not", () => {
    expect(canSeeNotice(legacy("school", "all"), parent, now)).toBe(true);
    expect(canSeeNotice(legacy("school", "students"), parent, now)).toBe(true);
    expect(canSeeNotice(legacy("school", "staff"), parent, now)).toBe(false);
    expect(canSeeNotice(legacy("teachers", "all"), parent, now)).toBe(false);
  });

  it("class, route and day-care channels match by id", () => {
    expect(canSeeNotice(legacy("class", "class", { classId: "class-1" }), parent, now)).toBe(true);
    expect(canSeeNotice(legacy("class", "class", { classId: "class-2" }), parent, now)).toBe(false);
    expect(canSeeNotice(legacy("route", "all", { routeId: "troute-7" }), parent, now)).toBe(true);
    expect(canSeeNotice(legacy("route", "all", { routeId: "troute-9" }), parent, now)).toBe(false);
    expect(canSeeNotice(legacy("daycare", "all"), parent, now)).toBe(false);
  });
});

describe("canSeeReply", () => {
  it("parents see the school's replies and their own family's, not other families'", () => {
    expect(canSeeReply({ authorRole: "staff" }, parent)).toBe(true);
    expect(canSeeReply({ authorRole: "parent", studentId: "stu-1" }, parent)).toBe(true);
    expect(canSeeReply({ authorRole: "parent", studentId: "stu-2" }, parent)).toBe(false);
    expect(canSeeReply({ authorRole: "parent" }, parent)).toBe(false);
    expect(canSeeReply({ authorRole: "parent", studentId: "stu-2" }, staff)).toBe(true);
  });
});

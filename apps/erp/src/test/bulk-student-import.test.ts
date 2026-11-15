import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/errors";
import { academicYearSpan } from "@/lib/bulk-student-rules";
import { importStudents } from "@/lib/school-world-bridge";

const prefix = `BY${String(Date.now()).slice(-8)}`;
const phones = {
  year: `61${String(Date.now()).slice(-8)}`,
  bad: `62${String(Date.now()).slice(-8)}`,
  dup: `63${String(Date.now()).slice(-8)}`,
  taken: `64${String(Date.now()).slice(-8)}`,
};

function otherSpelling(name: string): string | null {
  const span = academicYearSpan(name);
  if (!span) return null;
  const short = `${span.start}-${String(span.end).slice(-2)}`;
  const long = `${span.start}-${span.end}`;
  if (name === short) return long;
  if (name === long) return short;
  return short === name ? long : short;
}

function row(studentId: string, academicYear: string, phone: string) {
  return {
    name: "Bulk Year Check",
    studentId,
    className: "",
    section: "",
    academicYear,
    phone,
  };
}

describe("excel bulk student import", () => {
  let campusId = "";
  let currentSessionId = "";
  let currentName = "";
  let incomingYear = "";
  let className = "";
  let sectionName = "";
  const sessionIdsBefore = new Set<string>();

  beforeAll(async () => {
    const campus = await prisma.campus.findFirst({
      where: { code: "MAIN" },
      select: { id: true, currentSessionId: true },
    });
    if (!campus?.currentSessionId) throw new Error("MAIN campus has no current session");
    campusId = campus.id;
    currentSessionId = campus.currentSessionId;
    const sessions = await prisma.academicSession.findMany({
      where: { campusId },
      select: { id: true, name: true },
    });
    const current = sessions.find((session) => session.id === currentSessionId);
    if (!current) throw new Error("current session row is missing");
    currentName = current.name;
    const other = otherSpelling(current.name);
    if (!other) throw new Error(`current session ${current.name} is not a June-May year label`);
    incomingYear = other;
    for (const session of sessions) {
      if (session.id === currentSessionId) continue;
      if (academicYearSpan(session.name)?.start !== academicYearSpan(current.name)?.start) continue;
      const used = await prisma.studentEnrollment.count({ where: { sessionId: session.id } });
      if (used === 0) {
        await prisma.academicSession.delete({ where: { id: session.id } });
      }
    }
    const remaining = await prisma.academicSession.findMany({
      where: { campusId },
      select: { id: true },
    });
    for (const session of remaining) sessionIdsBefore.add(session.id);
    const section = await prisma.section.findFirst({
      where: { class: { isActive: true, program: { department: { campusId } } } },
      include: { class: true },
    });
    if (!section) throw new Error("MAIN has no class section to enroll into");
    className = section.class.name;
    sectionName = section.name;
  });

  afterAll(async () => {
    const students = await prisma.student.findMany({
      where: { campusId, admissionNo: { startsWith: prefix } },
      select: { id: true },
    });
    const ids = students.map((student) => student.id);
    if (ids.length) {
      await prisma.studentEnrollment.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.studentAddress.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.studentGuardian.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.student.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  it("enrolls the other spelling of the current year on the current session", async () => {
    const studentId = `${prefix}Y`;
    const result = await importStudents(campusId, [{
      ...row(studentId, incomingYear, phones.year),
      className,
      section: sectionName,
      details: { academicYear: incomingYear, student: { academicYear: incomingYear } },
    }], { excel: true });
    expect(result).toMatchObject({ ok: true, created: 1, updated: 0 });

    const student = await prisma.student.findFirst({
      where: { campusId, admissionNo: studentId },
      include: { enrollments: { where: { isCurrent: true }, include: { session: true } } },
    });
    expect(student?.mobile).toBe(phones.year);
    expect(student?.enrollments[0]?.sessionId).toBe(currentSessionId);
    expect(student?.enrollments[0]?.session.name).toBe(currentName);
    const details = student?.details as { academicYear?: string; student?: { academicYear?: string } } | null;
    expect(details?.academicYear).toBe(currentName);
    expect(details?.student?.academicYear).toBe(currentName);

    const sessions = await prisma.academicSession.findMany({
      where: { campusId },
      select: { id: true, name: true },
    });
    expect(sessions.map((session) => session.id).sort()).toEqual([...sessionIdsBefore].sort());
    expect(sessions.some((session) => session.name === incomingYear && session.name !== currentName)).toBe(false);

    const again = await importStudents(campusId, [{
      ...row(studentId, incomingYear, phones.year),
      className,
      section: sectionName,
    }], { excel: true });
    expect(again).toMatchObject({ created: 0, updated: 1 });
  });

  it("rejects a bad phone and a fourth use of one number before any insert", async () => {
    const badId = `${prefix}B`;
    const ids = [`${prefix}D1`, `${prefix}D2`, `${prefix}D3`, `${prefix}D4`];
    const error = await importStudents(campusId, [
      { ...row(badId, currentName, "987654321"), className, section: sectionName },
      ...ids.map((studentId) => ({
        ...row(studentId, currentName, ` ${phones.dup.slice(0, 5)}-${phones.dup.slice(5)} `),
        className,
        section: sectionName,
      })),
    ], { excel: true }).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(400);
    expect((error as HttpError).message).toContain("10 digit");
    expect((error as HttpError).message).toContain(`Parent Phone ${phones.dup} cannot be used more than 3 times`);
    const left = await prisma.student.count({
      where: { campusId, admissionNo: { in: [badId, ...ids] } },
    });
    expect(left).toBe(0);
  });

  it("allows the same parent phone on three students and rejects the fourth", async () => {
    const ids = [`${prefix}O1`, `${prefix}O2`, `${prefix}O3`, `${prefix}O4`];
    const first = await importStudents(campusId, ids.slice(0, 3).map((studentId) => ({
      ...row(studentId, currentName, phones.taken),
      className,
      section: sectionName,
    })), { excel: true });
    expect(first).toMatchObject({ created: 3, updated: 0 });
    const error = await importStudents(campusId, [{
      ...row(ids[3], currentName, phones.taken),
      className,
      section: sectionName,
    }], { excel: true }).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).message).toContain(`Parent Phone ${phones.taken} cannot be used more than 3 times`);
    expect((error as HttpError).message).toContain("already used by 3 students");
    const clash = await prisma.student.findFirst({ where: { campusId, admissionNo: ids[3] } });
    expect(clash).toBeNull();
    const kept = await prisma.student.count({ where: { campusId, admissionNo: { in: ids.slice(0, 3) } } });
    expect(kept).toBe(3);
  });
});

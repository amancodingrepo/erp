import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { allocateSeats } from "@/lib/seating-allocate";
import { examRoster } from "@/lib/services/exams";

export async function createSeatingBlock(
  campusId: string,
  input: { name: string; capacity: number },
) {
  const name = input.name.trim();
  if (!name) throw validationError({ name: "required" });
  if (!Number.isInteger(input.capacity) || input.capacity < 1) {
    throw validationError({ capacity: "must be at least 1" });
  }
  const existing = await prisma.seatingBlock.findUnique({
    where: { campusId_name: { campusId, name } },
  });
  if (existing) {
    return prisma.seatingBlock.update({
      where: { id: existing.id },
      data: { capacity: input.capacity },
    });
  }
  return prisma.seatingBlock.create({
    data: { campusId, name, capacity: input.capacity },
  });
}

export async function listSeatingBlocks(campusId: string) {
  return prisma.seatingBlock.findMany({
    where: { campusId },
    orderBy: { name: "asc" },
  });
}

export async function allocateExamSeating(
  campusId: string,
  input: { examSubjectId: string; blockIds: string[]; classId?: string },
) {
  if (!input.blockIds.length) throw validationError({ blockIds: "required" });
  const paper = await prisma.examSubject.findFirst({
    where: { id: input.examSubjectId, exam: { group: { campusId } } },
  });
  if (!paper) throw notFound("exam subject");
  const blocks = await prisma.seatingBlock.findMany({
    where: { campusId, id: { in: input.blockIds } },
    orderBy: { name: "asc" },
  });
  if (blocks.length !== input.blockIds.length) throw notFound("block");
  const roster = await examRoster({
    campusId,
    examSubjectId: paper.id,
    classId: input.classId,
  });
  const students = roster.data.map((r) => ({
    id: r.studentId,
    roll: r.rollNo,
  }));
  if (!students.length) throw validationError({ examSubjectId: "no roster" });
  const plan = allocateSeats(students, blocks);
  if (!plan.ok) {
    throw validationError({
      capacity: `need ${plan.overflow} more seats`,
    });
  }
  await prisma.$transaction([
    prisma.seatAssignment.deleteMany({ where: { examSubjectId: paper.id } }),
    prisma.seatAssignment.createMany({
      data: plan.seats.map((s) => ({
        examSubjectId: paper.id,
        blockId: s.blockId,
        studentId: s.studentId,
        seatNo: s.seatNo,
      })),
    }),
  ]);
  return listSeatAssignments(campusId, paper.id);
}

export async function listSeatAssignments(campusId: string, examSubjectId?: string) {
  return prisma.seatAssignment.findMany({
    where: {
      block: { campusId },
      ...(examSubjectId ? { examSubjectId } : {}),
    },
    include: {
      block: true,
      student: { select: { id: true, admissionNo: true, firstName: true, lastName: true } },
      examSubject: { include: { exam: true } },
    },
    orderBy: [{ seatNo: "asc" }],
  });
}

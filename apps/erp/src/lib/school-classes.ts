import { prisma } from "@/lib/db";

export const SCHOOL_CLASS_NAMES = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
] as const;

export async function ensureSchoolClasses(campusId: string) {
  let dept = await prisma.department.findFirst({
    where: { campusId, code: "SCH" },
  });
  if (!dept) {
    dept = await prisma.department.create({
      data: { campusId, name: "School", code: "SCH" },
    });
  }
  for (const [index, name] of SCHOOL_CLASS_NAMES.entries()) {
    let program = await prisma.program.findFirst({
      where: { departmentId: dept.id, name },
    });
    if (!program) {
      program = await prisma.program.create({
        data: {
          departmentId: dept.id,
          name,
          level: "UNDERGRADUATE",
        },
      });
    }
    let klass = await prisma.class.findFirst({
      where: { programId: program.id, name },
    });
    if (!klass) {
      klass = await prisma.class.create({
        data: {
          programId: program.id,
          name,
          yearNo: index + 1,
        },
      });
    }
    const section = await prisma.section.findFirst({
      where: { classId: klass.id, name: "A" },
    });
    if (!section) {
      await prisma.section.create({
        data: { classId: klass.id, name: "A" },
      });
    }
  }
}

import { Gender, Prisma, StudentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  admissionNo: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  dob: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  sessionId: z.string().optional(),
  rollNo: z.string().optional(),
  enrollmentNo: z.string().optional(),
  fatherName: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "view",
    );
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim();
    const classId = params.get("classId") ?? undefined;
    const sectionId = params.get("sectionId") ?? undefined;
    const statusParam = params.get("status");
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize") ?? 20)));
    const status =
      statusParam === "all"
        ? undefined
        : ((statusParam as StudentStatus | null) ?? StudentStatus.ACTIVE);

    const where: Prisma.StudentWhereInput = {
      campusId: user.campusId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { admissionNo: { contains: q, mode: "insensitive" } },
              { enrollmentNo: { contains: q, mode: "insensitive" } },
              { mobile: { contains: q } },
            ],
          }
        : {}),
      ...(classId || sectionId
        ? {
            enrollments: {
              some: {
                isCurrent: true,
                ...(classId ? { classId } : {}),
                ...(sectionId ? { sectionId } : {}),
              },
            },
          }
        : {}),
    };

    const [total, rows] = await prisma.$transaction([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          enrollments: {
            where: { isCurrent: true },
            include: { class: true, section: true },
            take: 1,
          },
          guardians: { include: { guardian: true } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data = rows.map((s) => {
      const enrollment = s.enrollments[0];
      const father = s.guardians.find((g) => g.relation === "father")?.guardian;
      return {
        id: s.id,
        admissionNo: s.admissionNo,
        name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
        class: enrollment?.class.name ?? null,
        section: enrollment?.section.name ?? null,
        rollNo: enrollment?.rollNo ?? s.rollNo,
        enrollmentNo: s.enrollmentNo,
        fatherName: father?.name ?? null,
        dob: s.dob,
        gender: s.gender,
        category: null,
        mobile: s.mobile,
        status: s.status,
      };
    });
    return ok({ data, total, page, pageSize });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "create",
    );
    const body = createSchema.parse(await readJson(request));
    try {
      const student = await prisma.$transaction(async (tx) => {
        const createdStudent = await tx.student.create({
          data: {
            campusId: user.campusId,
            admissionNo: body.admissionNo,
            firstName: body.firstName,
            lastName: body.lastName,
            gender: body.gender,
            dob: body.dob ? new Date(body.dob) : undefined,
            mobile: body.mobile,
            email: body.email,
            rollNo: body.rollNo,
            enrollmentNo: body.enrollmentNo,
          },
        });
        if (body.classId && body.sectionId && body.sessionId) {
          await tx.studentEnrollment.create({
            data: {
              studentId: createdStudent.id,
              sessionId: body.sessionId,
              classId: body.classId,
              sectionId: body.sectionId,
              rollNo: body.rollNo,
              isCurrent: true,
            },
          });
        }
        if (body.fatherName) {
          const guardian = await tx.guardian.create({
            data: { name: body.fatherName },
          });
          await tx.studentGuardian.create({
            data: {
              studentId: createdStudent.id,
              guardianId: guardian.id,
              relation: "father",
            },
          });
        }
        return createdStudent;
      });
      return created(student);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw conflict("duplicate admissionNo");
      }
      throw error;
    }
  } catch (error) {
    return fail(error);
  }
}

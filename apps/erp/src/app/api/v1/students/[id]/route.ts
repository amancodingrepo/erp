import { Gender, Prisma, StudentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const patchSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  status: z.nativeEnum(StudentStatus).optional(),
  rollNo: z.string().optional(),
  enrollmentNo: z.string().optional(),
});

async function loadStudent(campusId: string, id: string) {
  const student = await prisma.student.findFirst({
    where: { id, campusId },
    include: {
      enrollments: {
        include: { class: true, section: true, session: true },
        orderBy: { session: { sequenceNo: "desc" } },
      },
      guardians: { include: { guardian: true } },
      addresses: true,
      previousEdu: true,
      bank: true,
      documents: true,
    },
  });
  if (!student) throw notFound("student");
  return student;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "view",
    );
    const { id } = await context.params;
    return ok(await loadStudent(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const { id } = await context.params;
    await loadStudent(user.campusId, id);
    const body = patchSchema.parse(await readJson(request));
    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...body,
        email: body.email === "" ? null : body.email,
      },
    });
    return ok(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return fail(notFound("student"));
    }
    return fail(error);
  }
}

import { Gender, Prisma, StudentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { getStudent360 } from "@/lib/services/students";

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
    return ok(await getStudent360(user.campusId, id));
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
    const existing = await prisma.student.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("student");
    const body = patchSchema.parse(await readJson(request));
    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...body,
        email: body.email === "" ? null : body.email,
      },
    });
    return ok({
      id: updated.id,
      admissionNo: updated.admissionNo,
      firstName: updated.firstName,
      lastName: updated.lastName,
      status: updated.status,
    });
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

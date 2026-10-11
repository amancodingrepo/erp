import { Gender, Prisma, StudentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { fail, ok, readJson } from "@/lib/http";
import { assertCanAccessStudent, requireApiPermission } from "@/lib/principal";
import { assertHouseInCampus } from "@/lib/services/diary";
import { siblingsFor } from "@/lib/services/engagement";
import {
  getStudent360,
  splitStudentPatch,
  writeNamedGuardians,
} from "@/lib/services/students";

const patchSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  status: z.nativeEnum(StudentStatus).optional(),
  rollNo: z.string().optional(),
  enrollmentNo: z.string().optional(),
  janAadhaar: z.string().optional(),
  scholarNo: z.string().optional(),
  sssmId: z.string().optional(),
  pen: z.string().optional(),
  apaarId: z.string().optional(),
  grn: z.string().optional(),
  saralId: z.string().optional(),
  bloodGroup: z.string().optional(),
  isRte: z.boolean().optional(),
  isOnlyChild: z.boolean().optional(),
  admittedClass: z.string().optional(),
  annualIncome: z.string().optional(),
  lunchFromSchool: z.boolean().optional(),
  houseId: z.string().nullable().optional(),
  isDefaulter: z.boolean().optional(),
  rfid: z.string().optional(),
  photoUrl: z.string().optional(),
  parentLoginEnabled: z.boolean().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
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
    assertCanAccessStudent(user, id);
    const student = await getStudent360(user.campusId, id);
    const siblings = await siblingsFor(user.campusId, id);
    return ok({ ...student, siblings });
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
    if (body.houseId) {
      await assertHouseInCampus(user.campusId, body.houseId);
    }
    const { student: fields, guardians } = splitStudentPatch(body);
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.student.update({
        where: { id },
        data: {
          ...fields,
          email: fields.email === "" ? null : fields.email,
        },
      });
      if (guardians.length) {
        await writeNamedGuardians(tx, id, guardians);
      }
      return row;
    });
    return ok({
      id: updated.id,
      admissionNo: updated.admissionNo,
      firstName: updated.firstName,
      lastName: updated.lastName,
      status: updated.status,
      parentLoginEnabled: updated.parentLoginEnabled,
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

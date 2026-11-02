import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { assertCanAccessStudent, requireApiPermission } from "@/lib/principal";
import { addImmunization } from "@/lib/services/diary";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  vaccineName: z.string().min(1),
  scheduleDate: z.string().optional(),
  administeredDate: z.string().optional(),
  remarks: z.string().optional(),
  status: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    assertCanAccessStudent(user, id);
    const data = await prisma.immunizationRecord.findMany({
      where: { studentId: id, campusId: user.campusId },
      orderBy: { createdAt: "asc" },
    });
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return created(await addImmunization(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

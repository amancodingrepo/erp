import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  addStudentGuardian,
  listStudentGuardians,
} from "@/lib/services/campus-student-guardians";

const bodySchema = z
  .object({
    name: z.string().min(1),
    relation: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    occupation: z.string().optional(),
    aadhaar: z.string().optional(),
    altPhone: z.string().optional(),
    education: z.string().optional(),
    photoUrl: z.string().optional(),
    residentialAddress: z.string().optional(),
    permanentAddress: z.string().optional(),
    sameAsResidential: z.boolean().optional(),
  })
  .passthrough();

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
    return ok(await listStudentGuardians(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(
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
    const body = bodySchema.parse(await readJson(request));
    return created(await addStudentGuardian(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

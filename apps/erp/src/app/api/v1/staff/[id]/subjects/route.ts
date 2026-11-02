import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  saveStaffSubjects,
  staffSubjectsFor,
} from "@/lib/services/campus-staff-assignments";

const bodySchema = z.object({
  subjectIds: z.array(z.string()),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const { id } = await context.params;
    const row = await staffSubjectsFor(user.campusId, id);
    return ok({ data: row.subjectIds, staffId: row.staffId });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const row = await saveStaffSubjects(user.campusId, id, body.subjectIds);
    return ok({ data: row.subjectIds, staffId: row.staffId });
  } catch (error) {
    return fail(error);
  }
}

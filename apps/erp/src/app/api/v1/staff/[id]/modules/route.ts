import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  saveStaffModules,
  staffModulesFor,
} from "@/lib/services/campus-staff-modules";

const bodySchema = z.object({
  modules: z.array(z.string()),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const { id } = await context.params;
    const row = await staffModulesFor(user.campusId, id);
    return ok({ data: row.modules, staffId: row.staffId });
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
    const row = await saveStaffModules(user.campusId, id, body.modules);
    return ok({ data: row.modules, staffId: row.staffId });
  } catch (error) {
    return fail(error);
  }
}

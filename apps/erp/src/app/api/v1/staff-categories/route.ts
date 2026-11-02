import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  listStaffCategories,
  saveStaffCategory,
} from "@/lib/services/campus-staff-categories";

const bodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    return ok({ data: await listStaffCategories(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveStaffCategory(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createDriver, listDrivers } from "@/lib/services/campus-drivers";

const bodySchema = z.object({
  employeeId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  username: z.string().optional(),
  licenseNo: z.string().min(1),
  licenseExpiry: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    return ok(await listDrivers(user.campusId));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "create");
    const body = bodySchema.parse(await readJson(request));
    return created(await createDriver(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

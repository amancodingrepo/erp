import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  checkPickupPin,
  listPickupAuth,
  publicPickup,
  savePickupAuth,
} from "@/lib/services/campus-front";

const saveSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  relation: z.string().optional(),
  pin: z.string().min(4),
});

const checkSchema = z.object({
  studentId: z.string().min(1),
  pin: z.string().min(4),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const studentId = new URL(request.url).searchParams.get("studentId") ?? undefined;
    const rows = await listPickupAuth(user.campusId, studentId);
    return ok({ data: rows.map(publicPickup) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (body && typeof body === "object" && "pin" in body && !("name" in body)) {
      const user = await requireApiPermission(request, "students", "profile", "view");
      const parsed = checkSchema.parse(body);
      return ok(await checkPickupPin(user.campusId, parsed.studentId, parsed.pin));
    }
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const parsed = saveSchema.parse(body);
    return created(await savePickupAuth(user.campusId, parsed));
  } catch (error) {
    return fail(error);
  }
}

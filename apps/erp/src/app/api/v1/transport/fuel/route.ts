import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listFuelLogs, saveFuelLog } from "@/lib/services/campus-transport-ops";

const bodySchema = z.object({
  vehicleId: z.string().min(1),
  litres: z.union([z.number(), z.string()]),
  amount: z.union([z.number(), z.string()]).optional(),
  odometer: z.union([z.number(), z.string()]).optional(),
  at: z.string().optional(),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const vehicleId = new URL(request.url).searchParams.get("vehicleId") ?? "";
    return ok({
      data: await listFuelLogs(user.campusId, vehicleId || undefined),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await saveFuelLog(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseFuelLog } from "@/lib/services/campus-spec-aliases";
import { listFuelLogs, saveFuelLog } from "@/lib/services/campus-transport-ops";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const vehicleId =
      new URL(request.url).searchParams.get("vehicle_id") ??
      new URL(request.url).searchParams.get("vehicleId") ??
      "";
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
    const body = parseFuelLog(await readJson(request));
    return created(await saveFuelLog(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

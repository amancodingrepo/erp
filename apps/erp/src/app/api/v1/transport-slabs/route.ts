import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseTransportSlab } from "@/lib/services/campus-spec-aliases";
import {
  feeForDistance,
  listTransportSlabs,
  saveTransportSlab,
} from "@/lib/services/campus-transport-ops";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const km = new URL(request.url).searchParams.get("km");
    const data = await listTransportSlabs(user.campusId);
    const distance = km == null || km === "" ? null : Number(km);
    return ok({
      data,
      fee:
        distance != null && Number.isFinite(distance)
          ? feeForDistance(data, distance)
          : null,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseTransportSlab(await readJson(request));
    return created(await saveTransportSlab(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

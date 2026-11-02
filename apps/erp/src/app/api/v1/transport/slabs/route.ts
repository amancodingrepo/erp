import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  feeForDistance,
  listTransportSlabs,
  saveTransportSlab,
} from "@/lib/services/campus-transport-ops";

const bodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  fromKm: z.union([z.number(), z.string()]),
  toKm: z.union([z.number(), z.string()]).optional().nullable(),
  amount: z.union([z.number(), z.string()]),
});

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
    const body = bodySchema.parse(await readJson(request));
    return created(await saveTransportSlab(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

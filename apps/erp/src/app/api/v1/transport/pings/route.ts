import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  lastPingForVehicle,
  listVehiclePings,
  recordVehiclePing,
  tripPlayback,
} from "@/lib/services/hr-transport";

const bodySchema = z.object({
  vehicleId: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  tripId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const url = new URL(request.url);
    const vehicleId = url.searchParams.get("vehicleId") ?? "";
    const tripId = url.searchParams.get("tripId") ?? "";
    const pings = await listVehiclePings(user.campusId);
    if (tripId) return ok({ data: tripPlayback(pings, tripId) });
    if (vehicleId) {
      return ok({
        last: lastPingForVehicle(pings, vehicleId),
        data: pings.filter((row) => row.vehicleId === vehicleId).slice(-80),
      });
    }
    return ok({ data: pings.slice(-80) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await recordVehiclePing(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

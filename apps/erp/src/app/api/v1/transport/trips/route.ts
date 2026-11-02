import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listVehiclePings, tripPlayback } from "@/lib/services/hr-transport";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const url = new URL(request.url);
    const tripId =
      url.searchParams.get("trip_id")?.trim() ||
      url.searchParams.get("tripId")?.trim() ||
      "";
    const pings = await listVehiclePings(user.campusId);
    if (tripId) return ok({ data: tripPlayback(pings, tripId) });
    const trips = new Map<string, { tripId: string; vehicleId: string; points: number }>();
    for (const ping of pings) {
      const row = trips.get(ping.tripId) ?? {
        tripId: ping.tripId,
        vehicleId: ping.vehicleId,
        points: 0,
      };
      row.points += 1;
      trips.set(ping.tripId, row);
    }
    return ok({ data: [...trips.values()] });
  } catch (error) {
    return fail(error);
  }
}

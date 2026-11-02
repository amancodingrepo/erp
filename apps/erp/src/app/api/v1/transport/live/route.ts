import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  lastPingForVehicle,
  listVehiclePings,
} from "@/lib/services/hr-transport";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const [vehicles, pings] = await Promise.all([
      prisma.vehicle.findMany({
        where: { campusId: user.campusId },
        select: { id: true, registrationNo: true, routeId: true },
        orderBy: { registrationNo: "asc" },
      }),
      listVehiclePings(user.campusId),
    ]);
    return ok({
      data: vehicles.map((vehicle) => ({
        ...vehicle,
        last: lastPingForVehicle(pings, vehicle.id),
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

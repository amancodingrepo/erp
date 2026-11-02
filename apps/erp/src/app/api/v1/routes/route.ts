import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseRoute } from "@/lib/services/campus-spec-aliases";
import { createRoute } from "@/lib/services/campus-housing";
import {
  attachStopExtras,
  listRouteStopExtras,
} from "@/lib/services/campus-route-stops";
import {
  attachVehicleCompliance,
  listVehicleCompliance,
  stopSequence,
} from "@/lib/services/hr-transport";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const [routes, compliance, extras] = await Promise.all([
      prisma.transportRoute.findMany({
        where: { campusId: user.campusId },
        include: { pickups: { orderBy: { sortOrder: "asc" } }, vehicles: true },
        orderBy: { name: "asc" },
      }),
      listVehicleCompliance(user.campusId),
      listRouteStopExtras(user.campusId),
    ]);
    return ok({
      data: routes.map((route) => ({
        ...route,
        pickups: attachStopExtras(route.pickups, extras, route.id),
        stopMap: stopSequence(route.pickups),
        vehicles: attachVehicleCompliance(route.vehicles, compliance),
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseRoute(await readJson(request));
    return created(await createRoute(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

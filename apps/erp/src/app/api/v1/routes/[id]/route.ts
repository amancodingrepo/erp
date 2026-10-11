import { prisma } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";
import { notFound } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { parseRoutePatch } from "@/lib/services/campus-spec-aliases";
import { deleteRoute, updateRoute } from "@/lib/services/campus-housing";
import {
  attachStopExtras,
  listRouteStopExtras,
  purgeRouteStopExtras,
  replaceRouteStops,
} from "@/lib/services/campus-route-stops";
import {
  attachVehicleCompliance,
  listVehicleCompliance,
  stopSequence,
} from "@/lib/services/hr-transport";

async function loadRoute(campusId: string, id: string) {
  const [route, compliance, extras] = await Promise.all([
    prisma.transportRoute.findFirst({
      where: { id, campusId },
      include: { pickups: { orderBy: { sortOrder: "asc" } }, vehicles: true },
    }),
    listVehicleCompliance(campusId),
    listRouteStopExtras(campusId),
  ]);
  if (!route) throw notFound("route");
  return {
    ...route,
    pickups: attachStopExtras(route.pickups, extras, route.id),
    stopMap: stopSequence(route.pickups),
    vehicles: attachVehicleCompliance(route.vehicles, compliance),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    return ok(await loadRoute(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const body = parseRoutePatch(await readJson(request));
    if (body.name !== undefined || body.feeAmount !== undefined) {
      await updateRoute(user.campusId, id, {
        name: body.name,
        feeAmount: body.feeAmount,
      });
    } else {
      const existing = await prisma.transportRoute.findFirst({
        where: { id, campusId: user.campusId },
        select: { id: true },
      });
      if (!existing) throw notFound("route");
    }
    if (body.pickups !== undefined) {
      await replaceRouteStops(user.campusId, id, body.pickups);
    }
    return ok(await loadRoute(user.campusId, id));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const data = await deleteRoute(user.campusId, id);
    await purgeRouteStopExtras(user.campusId, id);
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

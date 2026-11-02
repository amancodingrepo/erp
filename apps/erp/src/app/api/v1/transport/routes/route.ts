import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createRoute, createVehicle } from "@/lib/services/campus-housing";
import { prisma } from "@/lib/db";
import {
  attachStopExtras,
  listRouteStopExtras,
} from "@/lib/services/campus-route-stops";
import {
  attachVehicleCompliance,
  listVehicleCompliance,
  stopSequence,
  writeVehicleCompliance,
} from "@/lib/services/hr-transport";

const routeSchema = z.object({
  name: z.string().min(1),
  feeAmount: z.union([z.number(), z.string()]),
  pickups: z.array(z.string()).optional(),
});

const vehicleSchema = z.object({
  registrationNo: z.string().min(1),
  routeId: z.string().optional(),
  insuranceDue: z.string().optional(),
  fitnessDue: z.string().optional(),
  pucDue: z.string().optional(),
});

const complianceSchema = z.object({
  vehicleId: z.string().min(1),
  insuranceDue: z.string().optional(),
  fitnessDue: z.string().optional(),
  pucDue: z.string().optional(),
});

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
    const json = await readJson(request);
    if (json && typeof json === "object" && "vehicleId" in json && !("registrationNo" in json)) {
      const body = complianceSchema.parse(json);
      return ok(
        await writeVehicleCompliance(user.campusId, body.vehicleId, {
          insuranceDue: body.insuranceDue,
          fitnessDue: body.fitnessDue,
          pucDue: body.pucDue,
        }),
      );
    }
    if (json && typeof json === "object" && "registrationNo" in json) {
      const body = vehicleSchema.parse(json);
      const vehicle = await createVehicle(user.campusId, body);
      const compliance =
        body.insuranceDue || body.fitnessDue || body.pucDue
          ? await writeVehicleCompliance(user.campusId, vehicle.id, {
              insuranceDue: body.insuranceDue,
              fitnessDue: body.fitnessDue,
              pucDue: body.pucDue,
            })
          : null;
      return created({ ...vehicle, compliance });
    }
    const body = routeSchema.parse(json);
    return created(await createRoute(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

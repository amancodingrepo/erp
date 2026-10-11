import { prisma } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/http";
import { notFound } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { parseVehiclePatch } from "@/lib/services/campus-spec-aliases";
import {
  attachVehicleCompliance,
  attachVehicleExtras,
  listVehicleCompliance,
  listVehicleExtras,
  purgeVehicleSettings,
  writeVehicleCompliance,
  writeVehicleExtras,
} from "@/lib/services/hr-transport";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    const [vehicle, compliance, extras] = await Promise.all([
      prisma.vehicle.findFirst({
        where: { id, campusId: user.campusId },
        include: { route: { select: { id: true, name: true } } },
      }),
      listVehicleCompliance(user.campusId),
      listVehicleExtras(user.campusId),
    ]);
    if (!vehicle) throw notFound("vehicle");
    return ok(
      attachVehicleExtras(attachVehicleCompliance([vehicle], compliance), extras)[0],
    );
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
    const existing = await prisma.vehicle.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("vehicle");
    const body = parseVehiclePatch(await readJson(request));
    if (body.routeId) {
      const route = await prisma.transportRoute.findFirst({
        where: { id: body.routeId, campusId: user.campusId },
      });
      if (!route) throw notFound("route");
    }
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(body.registrationNo ? { registrationNo: body.registrationNo } : {}),
        ...(body.routeId !== undefined ? { routeId: body.routeId } : {}),
      },
      include: { route: { select: { id: true, name: true } } },
    });
    const compliance =
      body.insuranceDue || body.fitnessDue || body.pucDue
        ? await writeVehicleCompliance(user.campusId, vehicle.id, {
            insuranceDue: body.insuranceDue,
            fitnessDue: body.fitnessDue,
            pucDue: body.pucDue,
          })
        : (await listVehicleCompliance(user.campusId)).find(
            (row) => row.vehicleId === vehicle.id,
          ) ?? null;
    const extraPatch = {
      ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
      ...(body.trackerId !== undefined ? { trackerId: body.trackerId } : {}),
      ...(body.cctv !== undefined ? { cctv: body.cctv } : {}),
      ...(body.taxDue !== undefined ? { taxDue: body.taxDue } : {}),
      ...(body.permitDue !== undefined ? { permitDue: body.permitDue } : {}),
      ...(body.driverId !== undefined ? { driverId: body.driverId } : {}),
      ...(body.caretakerId !== undefined ? { caretakerId: body.caretakerId } : {}),
      ...(body.fuelType !== undefined ? { fuelType: body.fuelType } : {}),
    };
    const extras = Object.keys(extraPatch).length
      ? await writeVehicleExtras(user.campusId, vehicle.id, extraPatch)
      : (await listVehicleExtras(user.campusId)).find(
          (row) => row.vehicleId === vehicle.id,
        ) ?? null;
    return ok({ ...vehicle, compliance, extras });
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
    const existing = await prisma.vehicle.findFirst({
      where: { id, campusId: user.campusId },
    });
    if (!existing) throw notFound("vehicle");
    await prisma.vehicle.delete({ where: { id } });
    await purgeVehicleSettings(user.campusId, id);
    return ok({ data: { id, deleted: true } });
  } catch (error) {
    return fail(error);
  }
}

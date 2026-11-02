import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseVehicle } from "@/lib/services/campus-spec-aliases";
import { createVehicle } from "@/lib/services/campus-housing";
import {
  attachVehicleCompliance,
  attachVehicleExtras,
  listVehicleCompliance,
  listVehicleExtras,
  writeVehicleCompliance,
  writeVehicleExtras,
} from "@/lib/services/hr-transport";

function extrasFromBody(body: {
  capacity?: number;
  trackerId?: string;
  cctv?: boolean;
  taxDue?: string;
  permitDue?: string;
  driverId?: string;
  caretakerId?: string;
  fuelType?: string;
}) {
  return {
    ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
    ...(body.trackerId ? { trackerId: body.trackerId } : {}),
    ...(body.cctv !== undefined ? { cctv: body.cctv } : {}),
    ...(body.taxDue ? { taxDue: body.taxDue } : {}),
    ...(body.permitDue ? { permitDue: body.permitDue } : {}),
    ...(body.driverId ? { driverId: body.driverId } : {}),
    ...(body.caretakerId ? { caretakerId: body.caretakerId } : {}),
    ...(body.fuelType ? { fuelType: body.fuelType } : {}),
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const [vehicles, compliance, extras] = await Promise.all([
      prisma.vehicle.findMany({
        where: { campusId: user.campusId },
        include: { route: { select: { id: true, name: true } } },
        orderBy: { registrationNo: "asc" },
      }),
      listVehicleCompliance(user.campusId),
      listVehicleExtras(user.campusId),
    ]);
    return ok({
      data: attachVehicleExtras(
        attachVehicleCompliance(vehicles, compliance),
        extras,
      ),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseVehicle(await readJson(request));
    const vehicle = await createVehicle(user.campusId, body);
    const compliance =
      body.insuranceDue || body.fitnessDue || body.pucDue
        ? await writeVehicleCompliance(user.campusId, vehicle.id, {
            insuranceDue: body.insuranceDue,
            fitnessDue: body.fitnessDue,
            pucDue: body.pucDue,
          })
        : null;
    const extraPatch = extrasFromBody(body);
    const extras = Object.keys(extraPatch).length
      ? await writeVehicleExtras(user.campusId, vehicle.id, extraPatch)
      : null;
    return created({ ...vehicle, compliance, extras });
  } catch (error) {
    return fail(error);
  }
}

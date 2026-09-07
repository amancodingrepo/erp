import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { createRoute, createVehicle } from "@/lib/services/campus-housing";
import { prisma } from "@/lib/db";

const routeSchema = z.object({
  name: z.string().min(1),
  feeAmount: z.union([z.number(), z.string()]),
  pickups: z.array(z.string()).optional(),
});

const vehicleSchema = z.object({
  registrationNo: z.string().min(1),
  routeId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const routes = await prisma.transportRoute.findMany({
      where: { campusId: user.campusId },
      include: { pickups: { orderBy: { sortOrder: "asc" } }, vehicles: true },
      orderBy: { name: "asc" },
    });
    return ok({ data: routes });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const json = await readJson(request);
    if (json && typeof json === "object" && "registrationNo" in json) {
      const body = vehicleSchema.parse(json);
      return created(await createVehicle(user.campusId, body));
    }
    const body = routeSchema.parse(json);
    return created(await createRoute(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

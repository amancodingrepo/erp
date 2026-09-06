import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  name: z.string().min(1),
  daysYear: z.number().int().nonnegative().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "student",
      "view",
    );
    const data = await prisma.leaveType.findMany({
      where: { campusId: user.campusId },
      orderBy: { name: "asc" },
    });
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "attendance",
      "leave",
      "approve",
    );
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.leaveType.create({
      data: {
        campusId: user.campusId,
        name: body.name,
        daysYear: body.daysYear ?? 0,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

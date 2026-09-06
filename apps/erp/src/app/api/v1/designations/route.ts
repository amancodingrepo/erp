import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({ name: z.string().min(1) });

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "hr", "staff", "view");
    const data = await prisma.designation.findMany({
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
    const user = await requireApiPermission(request, "hr", "staff", "create");
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.designation.create({
      data: { campusId: user.campusId, name: body.name.trim() },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

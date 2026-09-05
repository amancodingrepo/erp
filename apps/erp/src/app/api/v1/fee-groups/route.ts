import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({ name: z.string().min(1) });

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const data = await prisma.feeGroup.findMany({
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
    const user = await requireApiPermission(request, "fees", "master", "create");
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.feeGroup.create({
      data: { campusId: user.campusId, name: body.name },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

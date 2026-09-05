import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "department",
      "view",
    );
    const data = await prisma.department.findMany({
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
      "academics",
      "department",
      "create",
    );
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.department.create({
      data: { campusId: user.campusId, name: body.name, code: body.code },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

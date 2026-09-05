import { ProgramLevel } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().min(1),
  level: z.nativeEnum(ProgramLevel).optional(),
  durationYears: z.number().int().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "program",
      "view",
    );
    const departmentId = new URL(request.url).searchParams.get("departmentId");
    const data = await prisma.program.findMany({
      where: {
        department: { campusId: user.campusId },
        ...(departmentId ? { departmentId } : {}),
      },
      include: { department: true },
      orderBy: { name: "asc" },
    });
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiPermission(request, "academics", "program", "create");
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.program.create({
      data: {
        departmentId: body.departmentId,
        name: body.name,
        level: body.level,
        durationYears: body.durationYears ?? 3,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

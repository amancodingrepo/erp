import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  name: z.string().min(1),
  letter: z.string().min(1),
  minPct: z.number(),
  maxPct: z.number(),
  points: z.number().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    const data = await prisma.grade.findMany({
      where: { campusId: user.campusId },
      orderBy: { maxPct: "desc" },
    });
    return ok({ data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "create");
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.grade.create({
      data: {
        campusId: user.campusId,
        name: body.name,
        letter: body.letter,
        minPct: body.minPct,
        maxPct: body.maxPct,
        points: body.points,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

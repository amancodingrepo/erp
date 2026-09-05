import { ExamKind } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  name: z.string().min(1),
  examType: z.nativeEnum(ExamKind),
  groupKind: z.string().default("Regular"),
  sessionId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  examMonthYear: z.string().optional(),
  isAdditional: z.boolean().optional(),
  revaluationOn: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "exams", "group", "view");
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    const data = await prisma.examGroup.findMany({
      where: {
        campusId: user.campusId,
        ...(sessionId ? { sessionId } : {}),
      },
      include: { exams: true },
      orderBy: { name: "asc" },
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
    const row = await prisma.examGroup.create({
      data: {
        campusId: user.campusId,
        sessionId: body.sessionId,
        name: body.name,
        examType: body.examType,
        groupKind: body.groupKind,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        examMonthYear: body.examMonthYear,
        isAdditional: body.isAdditional ?? false,
        revaluationOn: body.revaluationOn ?? false,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

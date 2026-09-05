import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  sessionId: z.string().min(1),
  groupId: z.string().min(1),
  dueDate: z.string().optional(),
  lines: z
    .array(
      z.object({
        feeTypeId: z.string(),
        amount: z.number().nonnegative(),
      }),
    )
    .min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    const data = await prisma.feeMaster.findMany({
      where: {
        campusId: user.campusId,
        ...(sessionId ? { sessionId } : {}),
      },
      include: { group: true, lines: { include: { feeType: true } } },
      orderBy: { dueDate: "asc" },
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
    const row = await prisma.feeMaster.create({
      data: {
        campusId: user.campusId,
        sessionId: body.sessionId,
        groupId: body.groupId,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        lines: {
          create: body.lines.map((line) => ({
            feeTypeId: line.feeTypeId,
            amount: line.amount,
          })),
        },
      },
      include: { lines: true, group: true },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  sequenceNo: z.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "view",
    );
    const sessions = await prisma.academicSession.findMany({
      where: { campusId: user.campusId },
      orderBy: { sequenceNo: "desc" },
    });
    return ok({ data: sessions });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "session",
      "create",
    );
    const body = createSchema.parse(await readJson(request));
    const session = await prisma.academicSession.create({
      data: {
        campusId: user.campusId,
        name: body.name,
        code: body.code,
        sequenceNo: body.sequenceNo ?? 0,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    return created(session);
  } catch (error) {
    return fail(error);
  }
}

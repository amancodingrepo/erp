import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.string().default("all"),
  classId: z.string().optional(),
  publishAt: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "communicate",
      "notice",
      "view",
    );
    const data = await prisma.notice.findMany({
      where: { campusId: user.campusId },
      orderBy: { publishAt: "desc" },
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
      "communicate",
      "notice",
      "create",
    );
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.notice.create({
      data: {
        campusId: user.campusId,
        title: body.title,
        body: body.body,
        audience: body.audience,
        classId: body.classId,
        publishAt: body.publishAt ? new Date(body.publishAt) : undefined,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

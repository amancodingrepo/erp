import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  kind: z.string().optional(),
  isOptional: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "academics",
      "subject",
      "view",
    );
    const data = await prisma.subject.findMany({
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
      "subject",
      "create",
    );
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.subject.create({
      data: {
        campusId: user.campusId,
        name: body.name,
        code: body.code,
        kind: body.kind ?? "theory",
        isOptional: body.isOptional ?? false,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

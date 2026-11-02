import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  kind: z.enum(["percent", "fixed"]),
  percentage: z.number().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const data = await prisma.feeDiscount.findMany({
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
    const row = await prisma.feeDiscount.create({
      data: {
        campusId: user.campusId,
        name: body.name,
        code: body.code,
        kind: body.kind,
        percentage: body.percentage,
        amount: body.amount,
        description: body.description,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

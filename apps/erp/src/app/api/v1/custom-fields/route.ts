import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";

const createSchema = z.object({
  belongTo: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  values: z.string().optional(),
  columnSpan: z.number().int().min(1).max(12).optional(),
  required: z.boolean().optional(),
  visible: z.boolean().optional(),
  onTable: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "view",
    );
    const belongTo = new URL(request.url).searchParams.get("belongTo");
    const data = await prisma.customField.findMany({
      where: {
        campusId: user.campusId,
        ...(belongTo ? { belongTo } : {}),
        visible: true,
      },
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
      "settings",
      "campus",
      "edit",
    );
    const body = createSchema.parse(await readJson(request));
    const row = await prisma.customField.create({
      data: {
        campusId: user.campusId,
        belongTo: body.belongTo,
        type: body.type,
        name: body.name,
        values: body.values,
        columnSpan: body.columnSpan ?? 6,
        required: body.required ?? false,
        visible: body.visible ?? true,
        onTable: body.onTable ?? false,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

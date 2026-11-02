import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  CUSTOM_FIELD_BELONG_TO,
  CUSTOM_FIELD_TYPES,
  customFieldPatch,
  normalizeBelongTo,
} from "@/lib/services/campus-custom-fields";

const createSchema = z.object({
  belongTo: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  values: z.string().optional(),
  columnSpan: z.number().int().min(1).max(12).optional(),
  required: z.boolean().optional(),
  visible: z.boolean().optional(),
  onTable: z.boolean().optional(),
  validation: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "view",
    );
    const params = new URL(request.url).searchParams;
    const belongTo = params.get("belongTo");
    const includeHidden =
      params.get("includeHidden") === "1" || params.get("all") === "1";
    const data = await prisma.customField.findMany({
      where: {
        campusId: user.campusId,
        ...(belongTo ? { belongTo: normalizeBelongTo(belongTo) } : {}),
        ...(includeHidden ? {} : { visible: true }),
      },
      orderBy: { name: "asc" },
    });
    return ok({
      data,
      belongTo: CUSTOM_FIELD_BELONG_TO,
      types: CUSTOM_FIELD_TYPES,
    });
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
    const extra = customFieldPatch(body);
    const row = await prisma.customField.create({
      data: {
        campusId: user.campusId,
        belongTo: extra.belongTo ?? "Student",
        type: extra.type ?? "Input",
        name: extra.name ?? body.name.trim(),
        values: extra.values,
        columnSpan: extra.columnSpan ?? 6,
        required: extra.required ?? false,
        visible: extra.visible ?? true,
        onTable: extra.onTable ?? false,
        validation: extra.validation,
      },
    });
    return created(row);
  } catch (error) {
    return fail(error);
  }
}

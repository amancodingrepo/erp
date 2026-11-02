import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  deleteCustomField,
  saveCustomField,
} from "@/lib/services/campus-custom-fields";

const patchSchema = z.object({
  belongTo: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  values: z.string().nullable().optional(),
  columnSpan: z.number().int().optional(),
  required: z.boolean().optional(),
  visible: z.boolean().optional(),
  onTable: z.boolean().optional(),
  validation: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "edit");
    const { id } = await context.params;
    const body = patchSchema.parse(await readJson(request));
    return ok({ data: await saveCustomField(user.campusId, id, body) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "edit");
    const { id } = await context.params;
    return ok({ data: await deleteCustomField(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

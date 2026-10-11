import { z } from "zod";
import { classInCampus } from "@/lib/campus";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { deactivateClass, patchClass } from "@/lib/services/campus-class-mutate";
import {
  attachClassFlags,
  listClassFlags,
} from "@/lib/services/campus-comms";

const patchSchema = z.object({
  name: z.string().optional(),
  yearNo: z.number().int().nullable().optional(),
  sequenceNo: z.number().int().optional(),
  isOtherCourse: z.boolean().optional(),
  isActive: z.boolean().optional(),
  programId: z.string().optional(),
  sendAbsentSms: z.boolean().optional(),
  virtualClassroom: z.boolean().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    const { id } = await context.params;
    const row = await classInCampus(user.campusId, id);
    const flags = await listClassFlags(user.campusId);
    return ok({ data: attachClassFlags([row], flags)[0] });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const { id } = await context.params;
    const body = patchSchema.parse(await readJson(request));
    const row = await patchClass(user.campusId, id, body);
    const flags = await listClassFlags(user.campusId);
    return ok({ data: attachClassFlags([row], flags)[0] });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const { id } = await context.params;
    const row = await deactivateClass(user.campusId, id);
    return ok({ data: row });
  } catch (error) {
    return fail(error);
  }
}

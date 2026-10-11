import { z } from "zod";
import { classInCampus } from "@/lib/campus";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  datesForClass,
  listOpeningDates,
  saveOpeningDate,
} from "@/lib/services/campus-class-dates";

const bodySchema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "view");
    const { id } = await context.params;
    await classInCampus(user.campusId, id);
    return ok({ data: datesForClass(await listOpeningDates(user.campusId), id) });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "academics", "class", "create");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    return ok({ data: await saveOpeningDate(user.campusId, id, body) });
  } catch (error) {
    return fail(error);
  }
}

import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachHouseExtras,
  getHouse,
  listHouseExtras,
  patchHouse,
  removeHouse,
  saveHouseExtra,
} from "@/lib/services/campus-house-extras";
import { parseHousePatch } from "@/lib/services/campus-spec-aliases";
import { assertHouseInCampus } from "@/lib/services/diary";

const bodySchema = z.object({
  color: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const { id } = await context.params;
    const house = await getHouse(user.campusId, id);
    const extras = await listHouseExtras(user.campusId);
    return ok({ data: attachHouseExtras([house], extras)[0] });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const body = parseHousePatch(await readJson(request));
    return ok(await patchHouse(user.campusId, id, body));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    const body = bodySchema.parse(await readJson(request));
    const house = await assertHouseInCampus(user.campusId, id);
    const extra = await saveHouseExtra(user.campusId, house.id, body);
    return ok({ data: attachHouseExtras([house], [extra])[0] });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const { id } = await context.params;
    return ok({ data: await removeHouse(user.campusId, id) });
  } catch (error) {
    return fail(error);
  }
}

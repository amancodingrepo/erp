import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachHouseExtras,
  listHouseExtras,
  sanitizeHouseColor,
  saveHouseExtra,
} from "@/lib/services/campus-house-extras";
import { createHouse, listHouses } from "@/lib/services/diary";

const bodySchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    const [data, extras] = await Promise.all([
      listHouses(user.campusId),
      listHouseExtras(user.campusId),
    ]);
    return ok({ data: attachHouseExtras(data, extras) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    if (body.color !== undefined) sanitizeHouseColor(body.color, "");
    const row = await createHouse(user.campusId, body.name);
    if (body.color !== undefined || body.description !== undefined) {
      await saveHouseExtra(user.campusId, row.id, {
        color: body.color,
        description: body.description,
      });
    }
    const extras = await listHouseExtras(user.campusId);
    return created(attachHouseExtras([row], extras)[0]);
  } catch (error) {
    return fail(error);
  }
}

import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  campusRoleNames,
  listOneWayRoles,
  saveOneWayRoles,
} from "@/lib/services/campus-branch";

const bodySchema = z.object({
  roles: z.array(z.string()),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "view");
    const [blocked, roles] = await Promise.all([
      listOneWayRoles(user.campusId),
      campusRoleNames(user.campusId),
    ]);
    return ok({ data: { blocked, roles } });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "communicate", "notice", "create");
    const body = bodySchema.parse(await readJson(request));
    return ok({ data: await saveOneWayRoles(user.campusId, body.roles) });
  } catch (error) {
    return fail(error);
  }
}

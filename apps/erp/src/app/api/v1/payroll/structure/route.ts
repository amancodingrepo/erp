import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachPayElement,
  listStaffPayStructure,
} from "@/lib/services/payroll";

const bodySchema = z.object({
  staffId: z.string().min(1),
  elementId: z.string().min(1),
  amount: z.union([z.number(), z.string()]),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "view");
    const rows = await listStaffPayStructure(user.campusId);
    return ok({
      data: rows.map((r) => ({
        id: r.id,
        amount: r.amount.toString(),
        staff: r.staff,
        element: r.element,
      })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "master", "edit");
    const body = bodySchema.parse(await readJson(request));
    const row = await attachPayElement(user.campusId, body);
    return created({ ...row, amount: row.amount.toString() });
  } catch (error) {
    return fail(error);
  }
}

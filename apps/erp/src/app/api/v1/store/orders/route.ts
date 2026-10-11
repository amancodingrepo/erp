import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  createStoreOrder,
  deliverStoreOrder,
  listStoreOrders,
} from "@/lib/services/engagement";

const bodySchema = z.object({
  orderId: z.string().optional(),
  studentId: z.string().optional(),
  itemId: z.string().optional(),
  qty: z.number().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listStoreOrders(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    if (body.orderId) {
      return ok(await deliverStoreOrder(user.campusId, body.orderId));
    }
    return created(
      await createStoreOrder(user.campusId, {
        studentId: body.studentId ?? "",
        itemId: body.itemId ?? "",
        qty: body.qty ?? 0,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

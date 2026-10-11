import { fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseStoreDelivery } from "@/lib/services/campus-spec-aliases";
import {
  deliveredStoreOrders,
  deliverStoreOrder,
  listStoreOrders,
} from "@/lib/services/engagement";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({
      data: deliveredStoreOrders(await listStoreOrders(user.campusId)),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseStoreDelivery(await readJson(request));
    return ok(await deliverStoreOrder(user.campusId, body.orderId));
  } catch (error) {
    return fail(error);
  }
}

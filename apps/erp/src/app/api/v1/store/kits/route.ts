import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseStoreKit } from "@/lib/services/campus-spec-aliases";
import {
  createStoreProduct,
  kitsFromProducts,
  listStoreProducts,
} from "@/lib/services/engagement";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({
      data: kitsFromProducts(await listStoreProducts(user.campusId)),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = parseStoreKit(await readJson(request));
    return created(await createStoreProduct(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

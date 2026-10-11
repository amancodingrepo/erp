import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  STORE_PRODUCT_TYPES,
  createStoreProduct,
  listStoreProducts,
} from "@/lib/services/engagement";

const bodySchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  price: z.number().optional(),
  type: z.enum(STORE_PRODUCT_TYPES).optional(),
  vendor: z.string().optional(),
  stock: z.number().optional(),
  unit: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "view");
    return ok({ data: await listStoreProducts(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "students", "profile", "edit");
    const body = bodySchema.parse(await readJson(request));
    return created(await createStoreProduct(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}

import { z } from "zod";
import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { listMerchants, upsertMerchant } from "@/lib/services/gateway";

const createSchema = z.object({
  name: z.string().min(1),
  provider: z.enum(["razorpay", "cashfree"]),
  keyId: z.string().min(1),
  keySecret: z.string().min(1),
  webhookSecret: z.string().min(1),
  isDefault: z.boolean().optional(),
  feeTypeId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "view",
    );
    return ok({ data: await listMerchants(user.campusId) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "settings",
      "campus",
      "edit",
    );
    const body = createSchema.parse(await readJson(request));
    const row = await upsertMerchant(user.campusId, body);
    return created({ id: row.id, name: row.name, provider: row.provider, keyId: row.keyId });
  } catch (error) {
    return fail(error);
  }
}

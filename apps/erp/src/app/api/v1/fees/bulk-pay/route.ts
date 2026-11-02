import { validationError } from "@/lib/errors";
import { created, fail, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { bulkPayFees } from "@/lib/services/fees-bulk";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const idempotency = request.headers.get("idempotency-key")?.trim();
    if (!idempotency) throw validationError({ "Idempotency-Key": "required" });
    return created(
      await bulkPayFees({
        campusId: user.campusId,
        userId: user.id,
        idempotencyKey: idempotency,
        body: await readJson(request),
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

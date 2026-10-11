import { created, fail } from "@/lib/http";
import { validationError } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { applyFeeUpload } from "@/lib/services/engagement";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "fees", "collect", "collect");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw validationError({ file: "CSV file required" });
    }
    return created(
      await applyFeeUpload(user.campusId, user.id, await file.text()),
    );
  } catch (error) {
    return fail(error);
  }
}

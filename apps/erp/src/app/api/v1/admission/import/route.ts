import { created, fail } from "@/lib/http";
import { validationError } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { importApplicantsCsv } from "@/lib/services/merit";

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "create",
    );
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw validationError({ file: "CSV file required" });
    const result = await importApplicantsCsv(user.campusId, await file.text());
    return created(result);
  } catch (error) {
    return fail(error);
  }
}

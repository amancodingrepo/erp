import { created, fail } from "@/lib/http";
import { validationError } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { importStudentsCsv } from "@/lib/services/students";

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
    if (!(file instanceof File)) {
      throw validationError({ file: "CSV file required" });
    }
    const text = await file.text();
    const result = await importStudentsCsv({ campusId: user.campusId, text });
    return created(result);
  } catch (error) {
    return fail(error);
  }
}

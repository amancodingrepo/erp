import { fail, ok } from "@/lib/http";
import { validationError } from "@/lib/errors";
import { requireApiPermission } from "@/lib/principal";
import { saveStudentPhoto } from "@/lib/services/campus-student-photo";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(
      request,
      "students",
      "profile",
      "edit",
    );
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw validationError({ file: "image required" });
    const bytes = new Uint8Array(await file.arrayBuffer());
    return ok(
      await saveStudentPhoto({
        campusId: user.campusId,
        studentId: id,
        filename: file.name,
        mime: file.type,
        bytes,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

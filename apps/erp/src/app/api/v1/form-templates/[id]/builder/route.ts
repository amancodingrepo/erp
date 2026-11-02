import { notFound } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import {
  attachFields,
  fieldsForForms,
  listAdmissionForms,
} from "@/lib/services/admission-forms";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "view");
    const { id } = await context.params;
    const forms = await listAdmissionForms(user.campusId);
    const form = forms.find((row) => row.id === id);
    if (!form) throw notFound("form");
    const fields = await fieldsForForms(user.campusId, [form]);
    return ok(attachFields([form], fields)[0]);
  } catch (error) {
    return fail(error);
  }
}

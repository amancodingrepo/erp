import { created, fail, ok, readJson } from "@/lib/http";
import { requireApiPermission } from "@/lib/principal";
import { parseFormTemplate } from "@/lib/services/campus-spec-aliases";
import {
  attachFields,
  fieldsForForms,
  listAdmissionForms,
  writeAdmissionForm,
} from "@/lib/services/admission-forms";

export async function GET(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "view");
    const forms = await listAdmissionForms(user.campusId);
    const fields = await fieldsForForms(user.campusId, forms);
    return ok({ data: attachFields(forms, fields) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiPermission(request, "settings", "campus", "edit");
    const body = parseFormTemplate(await readJson(request));
    return created(await writeAdmissionForm(user.campusId, body));
  } catch (error) {
    return fail(error);
  }
}
